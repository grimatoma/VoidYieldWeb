import { EventBus } from '@services/EventBus';
import { inputManager } from '@services/InputManager';
import type { InteractionTarget } from '@services/InteractionManager';

/**
 * TouchInteractButton — large, thumb-sized button anchored to the bottom-left
 * of the screen. Visible only while there is a current interaction target
 * (i.e. the player is in range of a building / deposit / launchpad). Tapping
 * dispatches the same `interact` action as the [E] key, so deposits, panels,
 * and launchpads behave identically whether the player is using a keyboard or
 * a touch device.
 *
 * The label tracks the world-space [E] prompt so the button reads, e.g.,
 * "MINE VORAX" or "OPEN STORAGE" — making it self-explanatory on touch.
 */
export class TouchInteractButton {
  private _root: HTMLElement;
  private _verbEl: HTMLElement;
  private _targetEl: HTMLElement;
  private _onTarget: (t: InteractionTarget | null) => void;

  constructor() {
    this._root = document.createElement('button');
    this._root.id = 'touch-interact';
    this._root.className = 'touch-interact';
    this._root.setAttribute('type', 'button');
    this._root.setAttribute('aria-label', 'Interact');
    this._root.innerHTML = `
      <span class="touch-interact-key">E</span>
      <span class="touch-interact-text">
        <span class="touch-interact-verb"></span>
        <span class="touch-interact-target"></span>
      </span>
    `;
    this._verbEl   = this._root.querySelector('.touch-interact-verb')   as HTMLElement;
    this._targetEl = this._root.querySelector('.touch-interact-target') as HTMLElement;
    this._root.style.display = 'none';

    this._root.addEventListener('click', (e) => {
      e.stopPropagation();
      // Dispatch through InputManager so listeners (mining service, scene
      // panel toggles, etc.) get the same press+release pulse as a key tap.
      inputManager.dispatch('interact');
    });

    this._onTarget = (t: InteractionTarget | null) => {
      if (!t) {
        this._root.style.display = 'none';
        return;
      }
      this._verbEl.textContent = t.verb;
      this._targetEl.textContent = t.target;
      this._root.style.display = 'flex';
    };
    EventBus.on('interaction:target', this._onTarget);
  }

  mount(parent: HTMLElement): void { parent.appendChild(this._root); }

  destroy(): void {
    EventBus.off('interaction:target', this._onTarget);
    this._root.remove();
  }
}
