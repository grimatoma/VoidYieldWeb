import { Container } from 'pixi.js';

/** Max pixels a finger can drift between touchstart/end before we treat the
 * gesture as a drag (and therefore ignore the tap). Sized for shaky thumbs. */
const TAP_MOVE_THRESHOLD_PX = 14;
/** Max ms between touchstart and touchend for a gesture to register as a tap. */
const TAP_TIME_THRESHOLD_MS = 400;

export class Camera {
  private worldContainer: Container;
  private worldWidth: number;
  private worldHeight: number;
  private screenWidth: number;
  private screenHeight: number;
  /**
   * Zoom scales the worldContainer uniformly. Default is derived from viewport
   * so a 1920x1080 monitor shows the world at ~2x the 960x540 reference size
   * that the legacy sprites were authored for.
   */
  zoom = 1.0;
  minZoom = 1.0;
  maxZoom = 4.0;
  private lastTarget = { x: 0, y: 0 };
  private isPanning = false;
  private panStart = { sx: 0, sy: 0, ox: 0, oy: 0 };

  // Bound event handler references for clean removeEventListener
  private _onWheel: (e: WheelEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: (e: TouchEvent) => void;
  private _onWindowResize: () => void;

  // Single-finger touch tracking — used to distinguish a tap from a drag.
  private _touch: {
    id: number;
    startSx: number; startSy: number;
    startTime: number;
    moved: boolean;
    lastSx: number; lastSy: number;
  } | null = null;
  // Two-finger pinch-zoom tracking.
  private _pinch: {
    id1: number; id2: number;
    startDist: number;
    startZoom: number;
  } | null = null;
  // Left-click tracking — used to distinguish a tap from a drag.
  private _leftClick: {
    startSx: number; startSy: number;
    startTime: number;
    moved: boolean;
    lastSx: number; lastSy: number;
  } | null = null;

  /** Tap callback — fires for a single-finger tap (no drag). World coords. */
  private _onTap: ((worldX: number, worldY: number) => void) | null = null;
  private _canvas: HTMLCanvasElement | null = null;

  constructor(
    worldContainer: Container,
    worldWidth: number,
    worldHeight: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.worldContainer = worldContainer;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // Derive a reasonable starting zoom for the viewport. Legacy sprites were
    // authored at 960x540; modern monitors are 2–4x that width, so we scale up.
    const derived = Math.max(1.8, Math.min(3.5, screenWidth / 960));
    this.zoom = derived;

    this._onWheel = (e: WheelEvent) => {
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + (e.deltaY < 0 ? 0.15 : -0.15)));
      this._applyTransform();
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click: track it as a potential tap
        const { sx, sy } = this._mouseToCanvasCoords(e);
        this._leftClick = {
          startSx: sx,
          startSy: sy,
          startTime: Date.now(),
          moved: false,
          lastSx: sx,
          lastSy: sy,
        };
        return;
      }
      if (e.button !== 1) return;
      this.isPanning = true;
      this.panStart = {
        sx: e.screenX,
        sy: e.screenY,
        ox: this.worldContainer.x,
        oy: this.worldContainer.y,
      };
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (this._leftClick) {
        const { sx, sy } = this._mouseToCanvasCoords(e);
        this._leftClick.lastSx = sx;
        this._leftClick.lastSy = sy;
        const dx = sx - this._leftClick.startSx;
        const dy = sy - this._leftClick.startSy;
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) this._leftClick.moved = true;
      }
      if (!this.isPanning) return;
      const dx = e.screenX - this.panStart.sx;
      const dy = e.screenY - this.panStart.sy;
      const { screenWidth, screenHeight, worldWidth, worldHeight, zoom } = this;
      let ox = this.panStart.ox + dx;
      let oy = this.panStart.oy + dy;
      ox = Math.min(0, Math.max(screenWidth - worldWidth * zoom, ox));
      oy = Math.min(0, Math.max(screenHeight - worldHeight * zoom, oy));
      this.worldContainer.x = ox;
      this.worldContainer.y = oy;
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (this._leftClick) {
          const click = this._leftClick;
          this._leftClick = null;
          const elapsed = Date.now() - click.startTime;
          if (!click.moved && elapsed <= TAP_TIME_THRESHOLD_MS && this._onTap) {
            const wp = this.screenToWorld(click.lastSx, click.lastSy);
            this._onTap(wp.x, wp.y);
          }
        }
        return;
      }
      if (e.button !== 1) return;
      this.isPanning = false;
    };

    this._onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const { sx, sy } = this._touchToCanvasCoords(t);
        this._touch = {
          id: t.identifier,
          startSx: sx, startSy: sy,
          startTime: Date.now(),
          moved: false,
          lastSx: sx, lastSy: sy,
        };
        this._pinch = null;
      } else if (e.touches.length >= 2) {
        // Second finger landed — start pinch and abandon any single-finger tap.
        this._touch = null;
        const t1 = e.touches[0], t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        this._pinch = {
          id1: t1.identifier, id2: t2.identifier,
          startDist: Math.hypot(dx, dy) || 1,
          startZoom: this.zoom,
        };
      }
      // Block the synthetic mouse events / browser gestures so the page
      // doesn't pan or zoom under the finger while the user is playing.
      if (e.cancelable) e.preventDefault();
    };

    this._onTouchMove = (e: TouchEvent) => {
      if (this._pinch && e.touches.length >= 2) {
        // Pinch-zoom: scale relative to the initial finger spread.
        const t1 = this._findTouch(e.touches, this._pinch.id1);
        const t2 = this._findTouch(e.touches, this._pinch.id2);
        if (t1 && t2) {
          const dx = t1.clientX - t2.clientX;
          const dy = t1.clientY - t2.clientY;
          const dist = Math.hypot(dx, dy) || 1;
          const ratio = dist / this._pinch.startDist;
          const next = this._pinch.startZoom * ratio;
          this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, next));
          this._applyTransform();
        }
      } else if (this._touch) {
        const t = this._findTouch(e.touches, this._touch.id);
        if (t) {
          const { sx, sy } = this._touchToCanvasCoords(t);
          this._touch.lastSx = sx;
          this._touch.lastSy = sy;
          const dx = sx - this._touch.startSx;
          const dy = sy - this._touch.startSy;
          if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) this._touch.moved = true;
        }
      }
      if (e.cancelable) e.preventDefault();
    };

    this._onWindowResize = () => {
      // Mobile browsers resize the canvas when the URL bar shows/hides and on
      // rotation. Keep the camera's cached viewport in sync or the worldContainer
      // ends up clamped against stale bounds — which on tall phones can hide
      // the map entirely behind the HUD.
      const c = this._canvas;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === this.screenWidth && h === this.screenHeight) return;
      this.screenWidth = w;
      this.screenHeight = h;
      this._applyTransform();
    };

    this._onTouchEnd = (e: TouchEvent) => {
      // If we were pinching and dropped below 2 fingers, end the pinch but
      // do NOT promote the remaining finger into a tap candidate (it's been
      // moving as part of the pinch).
      if (this._pinch && e.touches.length < 2) {
        this._pinch = null;
        this._touch = null;
        return;
      }
      if (this._touch && !this._findTouch(e.touches, this._touch.id)) {
        const t = this._touch;
        this._touch = null;
        const elapsed = Date.now() - t.startTime;
        if (!t.moved && elapsed <= TAP_TIME_THRESHOLD_MS && this._onTap) {
          const wp = this.screenToWorld(t.lastSx, t.lastSy);
          this._onTap(wp.x, wp.y);
        }
      }
    };
  }

  /** Resolve a Touch to canvas-local CSS pixels (matches `screenToWorld`). */
  private _touchToCanvasCoords(t: Touch): { sx: number; sy: number } {
    if (!this._canvas) return { sx: t.clientX, sy: t.clientY };
    const rect = this._canvas.getBoundingClientRect();
    return { sx: t.clientX - rect.left, sy: t.clientY - rect.top };
  }

  /** Resolve a MouseEvent to canvas-local CSS pixels (matches `screenToWorld`). */
  private _mouseToCanvasCoords(e: MouseEvent): { sx: number; sy: number } {
    if (!this._canvas) return { sx: e.clientX, sy: e.clientY };
    const rect = this._canvas.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  }

  private _findTouch(list: TouchList, id: number): Touch | null {
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  follow(target: { x: number; y: number }): void {
    this.lastTarget = target;
    this._applyTransform();
  }

  /** Project a world-space point to a screen-space (CSS pixel) point. */
  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: this.worldContainer.x + x * this.zoom,
      y: this.worldContainer.y + y * this.zoom,
    };
  }

  /** Inverse of `worldToScreen`. Input is canvas-local CSS pixels. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.worldContainer.x) / this.zoom,
      y: (sy - this.worldContainer.y) / this.zoom,
    };
  }

  /**
   * Register a callback for single-finger taps on the canvas. Replaces any
   * previous callback. Pass null to clear. Coordinates are in world space.
   */
  onTap(cb: ((worldX: number, worldY: number) => void) | null): void {
    this._onTap = cb;
  }

  private _applyTransform(): void {
    const { x, y } = this.lastTarget;
    const { screenWidth, screenHeight, worldWidth, worldHeight, zoom } = this;
    let ox = screenWidth / 2 - x * zoom;
    let oy = screenHeight / 2 - y * zoom;
    ox = Math.min(0, Math.max(screenWidth - worldWidth * zoom, ox));
    oy = Math.min(0, Math.max(screenHeight - worldHeight * zoom, oy));
    this.worldContainer.x = ox;
    this.worldContainer.y = oy;
    this.worldContainer.scale.set(zoom);
  }

  mount(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    canvas.addEventListener('wheel', this._onWheel);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    // passive:false so we can preventDefault() and stop the browser from
    // hijacking the gesture for page scroll / pull-to-refresh / pinch-zoom.
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onTouchEnd);
    canvas.addEventListener('touchcancel', this._onTouchEnd);
    window.addEventListener('resize', this._onWindowResize);
    // Sync once at mount in case the canvas was resized between construction
    // and mount (common on mobile where layout settles after first paint).
    this._onWindowResize();
  }

  unmount(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('wheel', this._onWheel);
    canvas.removeEventListener('mousedown', this._onMouseDown);
    canvas.removeEventListener('mousemove', this._onMouseMove);
    canvas.removeEventListener('mouseup', this._onMouseUp);
    canvas.removeEventListener('touchstart', this._onTouchStart);
    canvas.removeEventListener('touchmove',  this._onTouchMove);
    canvas.removeEventListener('touchend',   this._onTouchEnd);
    canvas.removeEventListener('touchcancel', this._onTouchEnd);
    window.removeEventListener('resize', this._onWindowResize);
    this._canvas = null;
    this._touch = null;
    this._pinch = null;
    this._leftClick = null;
  }
}
