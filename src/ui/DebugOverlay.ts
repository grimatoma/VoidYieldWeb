import { voidyieldDebugAPI } from '../debug/VoidYieldDebugAPI';
import { EventBus } from '@services/EventBus';
import { inputManager } from '@services/InputManager';
import type { UILayer } from './UILayer';

/**
 * On-screen debug panel — wraps the window.__voidyield__ API as clickable
 * buttons. Always mounted (no longer gated behind DEV). Hidden by default;
 * toggle via backtick (`) or MENU → SYSTEM → Debug Panel.
 */
export class DebugOverlay {
  private _root: HTMLElement;
  private _visible = false;
  private _statusEl: HTMLElement;
  private _unsubscribeAction: () => void;

  constructor() {
    this._root = this._build();
    this._statusEl = this._root.querySelector<HTMLElement>('.debug-status')!;
    this._unsubscribeAction = inputManager.onAction((action, pressed) => {
      if (action === 'debug_toggle' && pressed) this.toggle();
    });
  }

  private _build(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'debug-overlay';
    el.className = 'debug-overlay';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="debug-header">
        <span>DEBUG [~]</span>
        <span class="debug-status"></span>
      </div>
      <div class="debug-grid">
        <button data-act="credits+1k">+1000 CR</button>
        <button data-act="credits+10k">+10 000 CR</button>
        <button data-act="rp+100">+100 RP</button>
        <button data-act="rp+1k">+1000 RP</button>
        <button data-act="unlock-all">Unlock All Tech</button>
        <button data-act="fill-outpost">Fill All (×100)</button>
        <button data-act="fresh">Preset: Fresh</button>
        <button data-act="reset">Reset All</button>
        <button data-act="advance60">Advance 60s</button>
        <button data-act="advance300">Advance 5m</button>
      </div>
      <div class="debug-ui-scale">
        <div class="debug-ui-scale-label">
          <span>UI SCALE</span>
          <span class="debug-ui-scale-value" data-field="ui-scale-value">1.00x</span>
        </div>
        <input type="range" class="debug-ui-scale-slider" data-field="ui-scale"
               min="0.6" max="1.6" step="0.05" value="1" />
        <div class="debug-ui-scale-row">
          <button data-act="ui-scale-reset">Reset</button>
          <button data-act="ui-scale-small">0.8x</button>
          <button data-act="ui-scale-large">1.25x</button>
        </div>
      </div>
      <div class="debug-footer">
        <code>window.__voidyield__</code> in console for full API.
      </div>
    `;
    el.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const act = t.getAttribute('data-act');
      if (!act) return;
      this._handle(act);
    });
    const slider = el.querySelector<HTMLInputElement>('[data-field="ui-scale"]');
    const valueLabel = el.querySelector<HTMLElement>('[data-field="ui-scale-value"]');
    if (slider && valueLabel) {
      slider.addEventListener('input', () => {
        const n = Number(slider.value);
        this._setUserScale(n);
      });
    }
    return el;
  }

  /** Sync slider label and track value with current UI scale. */
  private _syncScaleControls(scale: number): void {
    const slider = this._root.querySelector<HTMLInputElement>('[data-field="ui-scale"]');
    const label  = this._root.querySelector<HTMLElement>('[data-field="ui-scale-value"]');
    if (slider) slider.value = String(scale);
    if (label)  label.textContent = `${scale.toFixed(2)}x`;
  }

  private _setUserScale(scale: number): void {
    const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
    ui?.setUserScale(scale);
    const applied = ui?.userScale ?? scale;
    this._syncScaleControls(applied);
    this._flash(`UI scale ${applied.toFixed(2)}x`);
  }

  private _fillOutpost(): void {
    const api = voidyieldDebugAPI;
    // Fill storage stockpile (raw ores for furnace + bars for market)
    api.outpost.setStorageStock('iron_ore', 100);
    api.outpost.setStorageStock('copper_ore', 100);
    api.outpost.setStorageStock('water', 100);
    api.outpost.setStorageStock('iron_bar', 100);
    api.outpost.setStorageStock('copper_bar', 100);
    // Also fill player inventory so ore rows appear in the HUD
    api.services.inventory.restore([
      { oreType: 'iron_ore',    quantity: 100, attributes: {} },
      { oreType: 'copper_ore',  quantity: 100, attributes: {} },
      { oreType: 'water',       quantity: 100, attributes: {} },
    ]);
    api.setCredits(api.getCredits() + 5000);
    this._flash('storage + inventory ×100 + 5000 CR');
  }

  private _handle(act: string): void {
    const api = voidyieldDebugAPI;
    try {
      switch (act) {
        case 'credits+1k':  api.setCredits(api.getCredits() + 1000); this._flash(`+1000 CR`); break;
        case 'credits+10k': api.setCredits(api.getCredits() + 10000); this._flash(`+10000 CR`); break;
        case 'rp+100':      api.setRP(api.getRP() + 100); this._flash(`+100 RP`); break;
        case 'rp+1k':       api.setRP(api.getRP() + 1000); this._flash(`+1000 RP`); break;
        case 'unlock-all':  api.unlockAllTech(); this._flash('all tech unlocked'); break;
        case 'fill-outpost': this._fillOutpost(); break;
        case 'fresh':  api.loadPreset('fresh_start'); this._flash('preset: fresh'); break;
        case 'reset':  api.resetAll(); this._flash('reset'); break;
        case 'advance60':  api.advanceTime(60);  this._flash('advanced 60s'); break;
        case 'advance300': api.advanceTime(300); this._flash('advanced 300s'); break;
        case 'ui-scale-reset': this._setUserScale(1.0); break;
        case 'ui-scale-small': this._setUserScale(0.8); break;
        case 'ui-scale-large': this._setUserScale(1.25); break;
      }
    } catch (err) {
      this._flash(`ERR: ${(err as Error).message}`);
    }
  }

  private _flash(msg: string): void {
    this._statusEl.textContent = msg;
    setTimeout(() => {
      if (this._statusEl.textContent === msg) this._statusEl.textContent = '';
    }, 1500);
  }

  toggle(): void {
    this._visible = !this._visible;
    this._root.style.display = this._visible ? 'block' : 'none';
    if (this._visible) {
      const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
      if (ui) this._syncScaleControls(ui.userScale);
    }
    EventBus.emit('debug:overlay_toggled', this._visible);
  }

  get visible(): boolean { return this._visible; }

  mount(parent: HTMLElement): void { parent.appendChild(this._root); }

  destroy(): void {
    this._unsubscribeAction();
    this._root.remove();
  }
}
