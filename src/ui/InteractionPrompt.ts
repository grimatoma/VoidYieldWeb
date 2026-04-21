import { EventBus } from '@services/EventBus';
import type { Camera } from '@services/Camera';
import type { InteractionTarget } from '@services/InteractionManager';
import { interactionManager } from '@services/InteractionManager';

/**
 * World-space "[E] VERB TARGET" prompt. Anchored to the currently-focused
 * interactable via Camera.worldToScreen(). Visible only while a target exists.
 * Inserted into #ui-layer (opts back into pointer-events: none).
 */
export class InteractionPrompt {
  private _root: HTMLElement;
  private _verbEl: HTMLElement;
  private _targetEl: HTMLElement;
  private _barEl: HTMLElement;
  private _current: InteractionTarget | null = null;
  private _camera: Camera | null = null;
  private _onTarget: (t: InteractionTarget | null) => void;

  constructor() {
    this._root = document.createElement('div');
    this._root.id = 'interaction-prompt';
    this._root.className = 'interaction-prompt';
    this._root.innerHTML = `
      <div class="ip-row"><span class="ip-key">E</span> <span class="ip-verb"></span> <span class="ip-target"></span></div>
      <div class="ip-bar-bg"><div class="ip-bar-fill"></div></div>
      <div class="ip-arrow">\u25BC</div>
    `;
    this._verbEl   = this._root.querySelector('.ip-verb')   as HTMLElement;
    this._targetEl = this._root.querySelector('.ip-target') as HTMLElement;
    this._barEl    = this._root.querySelector('.ip-bar-fill') as HTMLElement;
    this._root.style.display = 'none';

    this._onTarget = (t: InteractionTarget | null) => {
      this._current = t;
      if (!t) {
        this._root.style.display = 'none';
        return;
      }
      this._verbEl.textContent = t.verb;
      this._targetEl.textContent = t.target;
      this._barEl.style.width = `${Math.round(t.progress * 100)}%`;
      this._root.style.display = 'block';
    };
    EventBus.on('interaction:target', this._onTarget);
  }

  setCamera(c: Camera): void { this._camera = c; }

  mount(parent: HTMLElement): void { parent.appendChild(this._root); }

  /** Call each frame so the prompt tracks the moving camera. */
  tick(): void {
    if (!this._current || !this._camera) return;
    const p = this._camera.worldToScreen(this._current.worldX, this._current.worldY);
    this._root.style.left = `${p.x}px`;
    this._root.style.top  = `${p.y - 44}px`;
    // Poll manager for smooth progress updates (events only fire on target
    // change, not every tick).
    const live = interactionManager.current;
    if (live && live.ref === this._current.ref) {
      this._barEl.style.width = `${Math.round(live.progress * 100)}%`;
    }
  }

  destroy(): void {
    EventBus.off('interaction:target', this._onTarget);
    this._root.remove();
  }
}
