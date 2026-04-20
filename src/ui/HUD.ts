/**
 * HUD — HTML/CSS heads-up display.
 *
 * Plain TypeScript class; zero PixiJS.  Creates real DOM elements and wires
 * them to the reactive signals in gameStore via effect().  Each effect()
 * call returns an unsubscribe function stored in _cleanups so that destroy()
 * can release all subscriptions without leaking memory.
 *
 * Layout (mirroring the ARCHITECTURE_REDESIGN.md spec):
 *   top-left    → planet name
 *   top-center  → storage bar
 *   top-right   → credits
 *   bottom-left → drone count
 */
import { effect } from '@preact/signals-core';
import { credits, currentPlanet, storageUsed, storageMax, droneCount } from '@store/gameStore';

export class HUD {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];

  constructor() {
    this._root = this._build();
    this._wire();
  }

  // ── DOM construction ────────────────────────────────────────

  private _build(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'hud';

    // Planet name — top left
    const planet = document.createElement('div');
    planet.id = 'hud-planet';
    planet.className = 'hud-panel';
    hud.appendChild(planet);

    // Storage bar — top center
    const storage = document.createElement('div');
    storage.id = 'hud-storage';
    storage.className = 'hud-panel';
    storage.innerHTML = `
      <span id="hud-storage-label">STORAGE</span>
      <div id="hud-storage-bar-bg">
        <div id="hud-storage-bar-fill"></div>
      </div>
      <span id="hud-storage-text">0 / 0</span>
    `;
    hud.appendChild(storage);

    // Credits — top right
    const creds = document.createElement('div');
    creds.id = 'hud-credits';
    creds.className = 'hud-panel';
    hud.appendChild(creds);

    // Drone count — bottom left
    const drones = document.createElement('div');
    drones.id = 'hud-drones';
    drones.className = 'hud-panel';
    hud.appendChild(drones);

    return hud;
  }

  // ── Signal wiring ────────────────────────────────────────────

  private _wire(): void {
    const creditsEl    = this._root.querySelector<HTMLElement>('#hud-credits')!;
    const planetEl     = this._root.querySelector<HTMLElement>('#hud-planet')!;
    const storageText  = this._root.querySelector<HTMLElement>('#hud-storage-text')!;
    const storageFill  = this._root.querySelector<HTMLElement>('#hud-storage-bar-fill')!;
    const dronesEl     = this._root.querySelector<HTMLElement>('#hud-drones')!;

    this._cleanups.push(
      effect(() => {
        creditsEl.textContent = `${Math.floor(credits.value).toLocaleString()} CR`;
      }),

      effect(() => {
        const id = currentPlanet.value;
        planetEl.textContent = id.toUpperCase().replace(/_/g, ' ');
      }),

      effect(() => {
        const used = storageUsed.value;
        const max  = storageMax.value;
        storageText.textContent = `${used} / ${max}`;
        const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
        storageFill.style.width = `${pct.toFixed(1)}%`;
      }),

      effect(() => {
        dronesEl.textContent = `DRONES ${droneCount.value}`;
      }),
    );
  }

  // ── Lifecycle ────────────────────────────────────────────────

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  destroy(): void {
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this._root.remove();
  }
}
