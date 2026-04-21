/**
 * Ship Bay panel — mirrors design_mocks/19_ship_bay.svg. Opens when the
 * player presses E on the Launchpad (compound center). Shows the rocket
 * assembly checklist: Hull, Engine, Fuel Tank, Avionics, Landing Gear, plus
 * a fuel gauge and LAUNCH button that becomes live at 5/5 + ≥100 RF.
 */
import { effect } from '@preact/signals-core';
import { credits } from '@store/gameStore';
import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';
import { Launchpad } from '@entities/Launchpad';
import type { StorageDepot } from '@entities/StorageDepot';
import type { RocketComponentType } from '@data/types';

const COMPONENTS: Array<{ id: RocketComponentType; label: string; costCr: number }> = [
  { id: 'hull',          label: 'HULL',          costCr: 400 },
  { id: 'engine',        label: 'ENGINE',        costCr: 600 },
  { id: 'fuel_tank',     label: 'FUEL TANK',     costCr: 300 },
  { id: 'avionics',      label: 'AVIONICS',      costCr: 500 },
  { id: 'landing_gear',  label: 'LANDING GEAR',  costCr: 250 },
];

export class ShipBayPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _pad: Launchpad | null = null;
  private _depot: StorageDepot | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }
  setPad(pad: Launchpad): void { this._pad = pad; }
  setDepot(depot: StorageDepot): void { this._depot = depot; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'shipbay-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>SHIP BAY</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span class="trade-panel-cr-value">0</span>
      </div>
      <div class="shipbay-gauge">
        <div class="shipbay-gauge-label">
          <span>ROCKET FUEL</span>
          <span class="shipbay-fuel-text">0 / 100 RF</span>
        </div>
        <div class="shipbay-gauge-bar"><div class="shipbay-gauge-fill"></div></div>
      </div>
      <div class="shipbay-status"></div>
      <div class="trade-panel-list shipbay-list"></div>
      <div class="shipbay-actions">
        <button class="shipbay-load-fuel" disabled>LOAD FUEL</button>
        <button class="shipbay-launch" disabled>LAUNCH</button>
      </div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    panel.querySelector<HTMLButtonElement>('.shipbay-launch')!
      .addEventListener('click', () => this._attemptLaunch());
    panel.querySelector<HTMLButtonElement>('.shipbay-load-fuel')!
      .addEventListener('click', () => this._loadFuel());
    return panel;
  }

  private _attemptLaunch(): void {
    if (!this._pad) return;
    if (this._pad.launch()) {
      EventBus.emit('inventory:changed');
      this._render();
    }
  }

  private _buyComponent(comp: typeof COMPONENTS[number]): void {
    if (!this._pad) return;
    if (this._pad.getInstalledComponents().has(comp.id)) return;
    if (gameState.credits < comp.costCr) return;
    gameState.addCredits(-comp.costCr);
    this._pad.installComponent({
      componentType: comp.id,
      name: comp.label,
      carrySlots: 1,
      attributes: {},
    });
    EventBus.emit('inventory:changed');
    this._render();
  }

  private _loadFuel(): void {
    if (!this._pad || !this._depot) return;
    const pulled = this._pad.loadFuel(this._depot);
    if (pulled > 0) {
      EventBus.emit('inventory:changed');
      this._render();
    }
  }

  private _render(): void {
    if (!this._pad) return;
    const list = this._root.querySelector<HTMLElement>('.shipbay-list')!;
    const installed = this._pad.getInstalledComponents();
    list.innerHTML = '';
    let filled = 0;
    for (const comp of COMPONENTS) {
      const has = installed.has(comp.id);
      if (has) filled++;
      const affordable = credits.value >= comp.costCr;
      const row = document.createElement('div');
      row.className = 'trade-row shipbay-row' + (has ? ' shipbay-row--filled' : '');
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${comp.label}</div>
          <div class="trade-row-desc">${has ? 'installed' : `${comp.costCr} CR`}</div>
        </div>
        <div class="trade-row-buy">
          <div class="shipbay-row-badge ${has ? 'badge-ok' : 'badge-empty'}">${has ? 'OK' : '—'}</div>
          ${has ? '' : `<button class="trade-row-buy-btn" ${affordable ? '' : 'disabled'}>BUY</button>`}
        </div>
      `;
      const buyBtn = row.querySelector<HTMLButtonElement>('.trade-row-buy-btn');
      if (buyBtn) buyBtn.addEventListener('click', () => this._buyComponent(comp));
      list.appendChild(row);
    }

    // Fuel gauge
    const fuel = this._pad.fuelUnits;
    this._root.querySelector<HTMLElement>('.shipbay-fuel-text')!.textContent = `${fuel} / 100 RF`;
    const pct = Math.min(100, (fuel / 100) * 100);
    this._root.querySelector<HTMLElement>('.shipbay-gauge-fill')!.style.width = `${pct}%`;

    // Assembly percent + launch state
    const assembly = Math.round((filled / COMPONENTS.length) * 100);
    const launchReady = this._pad.isLaunchReady;
    const statusEl = this._root.querySelector<HTMLElement>('.shipbay-status')!;
    statusEl.className = 'shipbay-status ' + (launchReady ? 'shipbay-status--ready' : '');
    statusEl.textContent = launchReady
      ? 'READY TO LAUNCH'
      : `ASSEMBLY ${assembly}%  •  ${filled}/5 COMPONENTS`;

    const btn = this._root.querySelector<HTMLButtonElement>('.shipbay-launch')!;
    btn.disabled = !launchReady;
    btn.textContent = launchReady ? 'LAUNCH' : 'NOT READY';

    // Load Fuel button — enabled when depot has rocket_fuel and tank has room.
    const loadBtn = this._root.querySelector<HTMLButtonElement>('.shipbay-load-fuel')!;
    const depotFuel = this._depot?.getStockpile().get('rocket_fuel') ?? 0;
    const tankRoom = Launchpad.FUEL_CAP - fuel;
    const canLoad = !!this._depot && depotFuel > 0 && tankRoom > 0;
    loadBtn.disabled = !canLoad;
    loadBtn.textContent = canLoad
      ? `LOAD FUEL (${Math.min(depotFuel, tankRoom)} RF)`
      : depotFuel === 0 ? 'NO FUEL IN DEPOT' : 'TANK FULL';
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(effect(() => {
      crEl.textContent = Math.floor(credits.value).toLocaleString();
      if (this._visible) this._render();
    }));
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._render();
  }

  close(): void {
    if (!this._visible) return;
    this._visible = false;
    this._root.style.display = 'none';
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    for (const c of this._cleanups) c();
    this._cleanups = [];
    this._root.remove();
  }
}
