import { voidyieldDebugAPI } from '../debug/VoidYieldDebugAPI';
import { EventBus } from '@services/EventBus';
import type { UILayer } from './UILayer';
import { planetResources, credits as creditsSignal } from '@store/gameStore';
import type { Launchpad } from '@entities/Launchpad';
import type { RocketComponentType } from '@data/types';

/**
 * On-screen debug panel — wraps the window.__voidyield__ API as clickable
 * buttons. Toggled with backtick (`); hidden by default. Dev builds only.
 */
export class DebugOverlay {
  private _root: HTMLElement;
  private _visible = false;
  private _statusEl: HTMLElement;
  private _keydown: (e: KeyboardEvent) => void;

  constructor() {
    this._root = this._build();
    this._statusEl = this._root.querySelector<HTMLElement>('.debug-status')!;
    this._keydown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this._keydown);
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
        <button data-act="stock-a1">Fill A1 Pool</button>
        <button data-act="half-res">Resources 50%</button>
        <button data-act="fresh">Preset: Fresh</button>
        <button data-act="mid">Preset: Mid</button>
        <button data-act="late">Preset: Late</button>
        <button data-act="reset">Reset All</button>
        <button data-act="advance60">Advance 60s</button>
        <button data-act="advance300">Advance 5m</button>
        <button data-act="fill-ship">Fill Ship</button>
        <button data-act="launch">Launch Ship</button>
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

  private _halfResources(): void {
    // Mid-reference credits/RP and half-pool on every registered planet.
    const api = voidyieldDebugAPI;
    api.setCredits(5000);
    api.setRP(500);
    const res = planetResources.value;
    const ores = Object.keys(res) as Array<'vorax' | 'krysite' | 'aethite'>;
    // All potential planet ids — setPlanetStock safely no-ops on unregistered.
    const planetIds = ['planet_a1', 'planet_a2', 'planet_a3', 'planet_b', 'planet_c'];
    planetIds.forEach((pid) => {
      ores.forEach((ore) => {
        const cap = res[ore].cap;
        const half = Math.floor(cap / 2);
        try { api.setPlanetStock(pid, ore, half); } catch { /* unregistered */ }
      });
    });
    creditsSignal.value = 5000;
    this._flash('resources → 50%');
  }

  private _getLaunchpad(): Launchpad | null {
    const scene = (window as unknown as { __voidyield_scene?: { launchpad?: Launchpad } }).__voidyield_scene;
    return scene?.launchpad ?? null;
  }

  private _fillShip(): void {
    const pad = this._getLaunchpad();
    if (!pad) { this._flash('no launchpad on this scene'); return; }
    const types: RocketComponentType[] = ['hull', 'engine', 'fuel_tank', 'avionics', 'landing_gear'];
    for (const t of types) {
      pad.installComponent({ componentType: t, name: t.toUpperCase(), carrySlots: 1, attributes: {} });
    }
    pad.fillFuel(100);
    EventBus.emit('inventory:changed');
    this._flash(`ship ready — ${pad.componentsInstalled}/5, ${pad.fuelUnits} RF`);
  }

  private _launchShip(): void {
    const pad = this._getLaunchpad();
    if (!pad) { this._flash('no launchpad on this scene'); return; }
    if (pad.launch()) {
      EventBus.emit('inventory:changed');
      this._flash('ship launched');
    } else {
      const need: string[] = [];
      if (pad.componentsInstalled < 5) need.push(`${5 - pad.componentsInstalled} components`);
      if (pad.fuelUnits < 100) need.push(`${100 - pad.fuelUnits} RF`);
      this._flash(`launch failed — need ${need.join(', ') || 'ready state'}`);
    }
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
        case 'stock-a1':
          api.setPlanetStock('planet_a1', 'vorax', 500);
          api.setPlanetStock('planet_a1', 'krysite', 200);
          api.setPlanetStock('planet_a1', 'aethite', 50);
          this._flash('A1 pool filled');
          break;
        case 'fresh':  api.loadPreset('fresh_start'); this._flash('preset: fresh'); break;
        case 'mid':    api.loadPreset('mid_game');    this._flash('preset: mid');   break;
        case 'late':   api.loadPreset('late_game');   this._flash('preset: late');  break;
        case 'reset':  api.resetAll(); this._flash('reset'); break;
        case 'advance60':  api.advanceTime(60);  this._flash('advanced 60s'); break;
        case 'advance300': api.advanceTime(300); this._flash('advanced 300s'); break;
        case 'fill-ship':  this._fillShip(); break;
        case 'launch':     this._launchShip(); break;
        case 'half-res':   this._halfResources(); break;
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
    window.removeEventListener('keydown', this._keydown);
    this._root.remove();
  }
}
