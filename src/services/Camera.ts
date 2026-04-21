import { Container } from 'pixi.js';

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
      if (e.button !== 1) return;
      this.isPanning = false;
    };
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
    canvas.addEventListener('wheel', this._onWheel);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
  }

  unmount(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('wheel', this._onWheel);
    canvas.removeEventListener('mousedown', this._onMouseDown);
    canvas.removeEventListener('mousemove', this._onMouseMove);
    canvas.removeEventListener('mouseup', this._onMouseUp);
  }
}
