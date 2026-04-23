/**
 * HUD — HTML/CSS heads-up display.
 *
 * Layout mirrors design_mocks/11_hud_desktop.svg:
 *   top-left     → RESOURCES rail (ORE / CRYSTAL / FUEL rows with carried + pool)
 *   top-center   → STORAGE bar
 *   top-right    → CR chip
 *   bottom-left  → DRONES chip
 *   top-center-above-rail → OUTPOST ID header (A1 / planet name)
 *
 * Plain TypeScript class; zero PixiJS. All reactive via @preact/signals-core.
 */
import { effect } from '@preact/signals-core';
import {
  credits,
  currentPlanet,
  storageUsed,
  storageMax,
  droneCount,
  planetResources,
  outpostId,
} from '@store/gameStore';

// Removed static RESOURCE_ROWS

export class HUD {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];

  constructor() {
    this._root = this._build();
    this._wire();
  }

  private _build(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'hud';

    // Top-left — RESOURCES rail (mock 11)
    const rail = document.createElement('div');
    rail.id = 'hud-resources';
    rail.className = 'hud-panel hud-resources';
    rail.innerHTML = `
      <div class="hud-resources-header">
        <span>RESOURCES</span>
        <span id="hud-outpost-id"></span>
      </div>
      <div id="hud-resource-rows-container"></div>
    `;
    hud.appendChild(rail);

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

  private _wire(): void {
    const creditsEl    = this._root.querySelector<HTMLElement>('#hud-credits')!;
    const storageText  = this._root.querySelector<HTMLElement>('#hud-storage-text')!;
    const storageFill  = this._root.querySelector<HTMLElement>('#hud-storage-bar-fill')!;
    const dronesEl     = this._root.querySelector<HTMLElement>('#hud-drones')!;
    const outpostEl    = this._root.querySelector<HTMLElement>('#hud-outpost-id')!;

    this._cleanups.push(
      effect(() => {
        creditsEl.innerHTML = `<span class="cr-value">${Math.floor(credits.value).toLocaleString()}</span> <span class="cr-unit">CR</span>`;
      }),

      effect(() => {
        // Show "A1 · OUTPOST" in the rail header (no separate top bar).
        const id = currentPlanet.value;
        const planetName = id.toUpperCase().replace(/_/g, ' ');
        outpostEl.textContent = `${outpostId.value} \u00B7 ${planetName}`;
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

      effect(() => {
        const resList = planetResources.value;
        const container = this._root.querySelector<HTMLElement>('#hud-resource-rows-container')!;
        
        // Rebuild DOM if keys don't match
        const currentKeys = Array.from(container.querySelectorAll('.hud-resource-row')).map(el => (el as HTMLElement).dataset.key);
        const newKeys = resList.map(r => r.key);
        if (currentKeys.join(',') !== newKeys.join(',')) {
          container.innerHTML = resList.map(r => `
            <div class="hud-resource-row" data-key="${r.key}">
              <span class="hud-resource-swatch" style="background:${r.swatchColor}"></span>
              <div class="hud-resource-body">
                <div class="hud-resource-pool-label">
                  <span class="hud-resource-label">${r.label} <span style="opacity:0.6;font-size:0.85em">${r.subLabel}</span></span>
                  <span data-field="pool-text">0 / 0</span>
                </div>
                <div class="hud-resource-pool-bar">
                  <div class="hud-resource-pool-fill" style="background:${r.swatchColor}"></div>
                </div>
              </div>
            </div>
          `).join('');
        }

        for (const data of resList) {
          const el = container.querySelector<HTMLElement>(`[data-key="${data.key}"]`);
          if (!el) continue;
          const poolText = el.querySelector<HTMLElement>('[data-field="pool-text"]')!;
          const fill = el.querySelector<HTMLElement>('.hud-resource-pool-fill')!;
          poolText.textContent = `${data.pool} / ${data.cap}`;
          const pct = data.cap > 0 ? Math.min(100, (data.pool / data.cap) * 100) : 0;
          fill.style.width = `${pct.toFixed(1)}%`;
        }
      }),
    );
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  destroy(): void {
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this._root.remove();
  }
}
