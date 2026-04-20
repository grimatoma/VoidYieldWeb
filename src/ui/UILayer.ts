/**
 * UILayer — manages the HTML overlay that sits above the PixiJS canvas.
 *
 * Creates <div id="ui-layer"> at z-index 20 (see styles.css) and mounts
 * all HTML UI components into it.  Phase 0 mounts only the HUD; subsequent
 * migration phases (M1+) will add panels here.
 */
import { HUD } from './HUD';
import { TutorialOverlay } from './TutorialOverlay';
import { tutorialManager } from '@services/TutorialManager';

export class UILayer {
  private _root: HTMLElement;
  private _hud: HUD | null = null;
  private _tutorial: TutorialOverlay | null = null;

  constructor() {
    // Reuse existing element if hot-reload already created it
    const existing = document.getElementById('ui-layer');
    if (existing) {
      this._root = existing;
    } else {
      this._root = document.createElement('div');
      this._root.id = 'ui-layer';
      document.body.appendChild(this._root);
    }
  }

  /** Mount all UI components.  Call once after PixiJS app is ready. */
  init(): void {
    this._hud = new HUD();
    this._hud.mount(this._root);

    if (tutorialManager.shouldShow()) {
      this._tutorial = new TutorialOverlay();
      this._tutorial.mount(this._root);
    }
  }

  destroy(): void {
    this._hud?.destroy();
    this._hud = null;
    this._tutorial?.destroy();
    this._tutorial = null;
    this._root.remove();
  }
}
