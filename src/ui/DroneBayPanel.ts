/**
 * Drone Bay panel — fleet roster + purchase interface.
 *
 * Two sections, top-to-bottom:
 *   1. ROSTER — every owned drone, one row each. Shows live status
 *      (IDLE / MINING / HAULING / RETURNING or OFF), an ore-type preference
 *      dropdown for miner types, and an active/inactive checkbox. Active
 *      count is capped by gameState.maxActiveDrones (bay-slot stat).
 *   2. BUY — purchase rows for every drone SKU (SCOUT relabeled as
 *      "MINING DRONE", HEAVY as "HEAVY MINER"; others remain stubs).
 *
 * Opens on [E] near the DroneBay; closes on [E]/[Esc].
 */
import { effect } from '@preact/signals-core';
import { credits, droneCount } from '@store/gameStore';
import { fleetManager } from '@services/FleetManager';
import { gameState } from '@services/GameState';
import { ScoutDrone } from '@entities/ScoutDrone';
import { HeavyDrone } from '@entities/HeavyDrone';
import { RefineryDrone } from '@entities/RefineryDrone';
import { SurveyDrone } from '@entities/SurveyDrone';
import { BuilderDrone } from '@entities/BuilderDrone';
import { CargoDrone } from '@entities/CargoDrone';
import { RepairDrone } from '@entities/RepairDrone';
import type { DroneBase } from '@entities/DroneBase';
import type { DroneBay } from '@entities/DroneBay';
import type { Container } from 'pixi.js';
import type { DroneType, OreType } from '@data/types';

type DroneSpec = {
  key: DroneType;
  label: string;
  desc: string;
  cost: number;
  droneType: DroneType;
  isMiner: boolean;
};

/** Shop rows. "Miner" types drive the mining auto-dispatch; the rest are
 * stubs for now (see TODOs at the top of each drone class). */
const DRONE_SPECS: DroneSpec[] = [
  { key: 'scout',    label: 'MINING DRONE',   desc: '60 px/s · 3 ore · 3s mine',   cost: ScoutDrone.COST,    droneType: 'scout',    isMiner: true  },
  { key: 'heavy',    label: 'HEAVY MINER',    desc: '40 px/s · 10 ore · 2s mine',  cost: HeavyDrone.COST,    droneType: 'heavy',    isMiner: true  },
  { key: 'refinery', label: 'REFINERY DRONE', desc: '50 px/s · harvester logistics',      cost: RefineryDrone.COST, droneType: 'refinery', isMiner: false },
  { key: 'survey',   label: 'SURVEY DRONE',   desc: '35 px/s · surveys deposits (stub)',  cost: SurveyDrone.COST,   droneType: 'survey',   isMiner: false },
  { key: 'builder',  label: 'BUILDER DRONE',  desc: '45 px/s · 15 mat · builds (stub)',cost: BuilderDrone.COST,  droneType: 'builder',  isMiner: false },
  { key: 'cargo',    label: 'CARGO DRONE',    desc: '35 px/s · 20 cap · inter-planet (stub)', cost: CargoDrone.COST, droneType: 'cargo', isMiner: false },
  { key: 'repair',   label: 'REPAIR DRONE',   desc: '90 px/s · repairs harvesters (stub)',cost: RepairDrone.COST,   droneType: 'repair',   isMiner: false },
];

const DRONE_LABEL: Record<DroneType, string> = {
  scout:    'MINING',
  heavy:    'HEAVY',
  refinery: 'REFINERY',
  survey:   'SURVEY',
  builder:  'BUILDER',
  cargo:    'CARGO',
  repair:   'REPAIR',
};

/** Ore types the player can point miner drones at. Kept short — all deposits
 * across every currently-playable planet use one of these four types. */
const MINER_ORE_CHOICES: Array<{ value: OreType | ''; label: string }> = [
  { value: '',         label: 'ANY' },
  { value: 'vorax',    label: 'VORAX' },
  { value: 'krysite',  label: 'KRYSITE' },
  { value: 'gas',      label: 'GAS' },
  { value: 'aethite',  label: 'AETHITE' },
];

/** Map drone runtime state + current task + cargo to a human-readable badge
 * matching the user-facing vocabulary: IDLE / MINING / HAULING / RETURNING. */
function droneStatusLabel(d: DroneBase): string {
  if (d.disabled) return 'OFF';
  if (d.state === 'IDLE') return 'IDLE';
  const task = d.peekTask();
  const hasCargo = d.cargo !== null && d.cargo.quantity > 0;
  if (hasCargo) {
    return d.state === 'EXECUTING' ? 'RETURNING' : 'HAULING';
  }
  // Empty cargo — either seeking the deposit or mining it.
  if (task?.type === 'MINE') {
    return d.state === 'EXECUTING' ? 'MINING' : 'MINING';
  }
  if (task?.type === 'CARRY') return 'MOVING';
  if (task?.type === 'FUEL' || task?.type === 'EMPTY') return 'SERVICING';
  return d.state === 'EXECUTING' ? 'WORKING' : 'MOVING';
}

export class DroneBayPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _bay: DroneBay | null = null;
  private _world: Container | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;
  private _updateTimer = 0;
  /** When true, the next update() tick will re-render the roster even if
   * not enough time has elapsed. Set by state-changing callbacks. */
  private _needsRender = false;

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  setBay(bay: DroneBay, world: Container): void {
    this._bay = bay;
    this._world = world;
  }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'dronebay-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>DRONE BAY</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span class="trade-panel-cr-value">0</span>
      </div>
      <div class="dronebay-fleet">
        <span>FLEET</span>
        <span class="dronebay-fleet-count">0</span>
        <span class="dronebay-fleet-detail"></span>
      </div>
      <div class="dronebay-section-head">ROSTER</div>
      <div class="trade-panel-list dronebay-roster"></div>
      <div class="dronebay-section-head">BUY</div>
      <div class="trade-panel-list dronebay-list"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  /** Full re-render: roster + shop + header summary. */
  private _render(): void {
    this._renderShop();
    this._renderRoster();
    this._renderSummary();
  }

  private _renderShop(): void {
    const list = this._root.querySelector<HTMLElement>('.dronebay-list')!;
    list.innerHTML = '';
    const balance = credits.value;
    for (const spec of DRONE_SPECS) {
      const owned = fleetManager.getDronesByType(spec.droneType).length;
      const affordable = balance >= spec.cost;
      const row = document.createElement('div');
      row.className = 'trade-row' + (affordable ? '' : ' trade-row--dim');
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${spec.label}</div>
          <div class="trade-row-desc">${spec.desc}</div>
          <div class="trade-row-stock">owned ${owned}</div>
        </div>
        <div class="trade-row-buy">
          <div class="trade-row-cost">${spec.cost} CR</div>
          <button class="trade-row-buy-btn" data-key="${spec.key}" ${affordable ? '' : 'disabled'}>BUY</button>
        </div>
      `;
      row.querySelector<HTMLButtonElement>('.trade-row-buy-btn')!
        .addEventListener('click', () => this._purchase(spec.key));
      list.appendChild(row);
    }
  }

  private _renderRoster(): void {
    const list = this._root.querySelector<HTMLElement>('.dronebay-roster')!;
    list.innerHTML = '';
    const drones = fleetManager.getDrones();
    if (drones.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dronebay-roster-empty';
      empty.textContent = 'No drones owned. Buy one below.';
      list.appendChild(empty);
      return;
    }
    const isMiner = (t: DroneType) => t === 'scout' || t === 'heavy';
    // Render a short, stable label (MINING #1, HEAVY #2) rather than the
    // full internal id so the roster stays legible.
    const perTypeCounters = new Map<DroneType, number>();
    for (const d of drones) {
      const n = (perTypeCounters.get(d.droneType) ?? 0) + 1;
      perTypeCounters.set(d.droneType, n);
      const typeLabel = DRONE_LABEL[d.droneType];
      const status = droneStatusLabel(d);

      const row = document.createElement('div');
      row.className = 'dronebay-roster-row' + (d.disabled ? ' dronebay-roster-row--off' : '');
      row.dataset.droneId = d.id;
      // Three columns: label + status badge | ore-pref dropdown | active toggle.
      row.innerHTML = `
        <div class="dronebay-roster-name">
          ${typeLabel} #${n}
          <span class="dronebay-roster-status" data-status="${status}">${status}</span>
        </div>
        <div class="dronebay-roster-ore"></div>
        <label class="dronebay-roster-toggle">
          <input type="checkbox" ${d.disabled ? '' : 'checked'} />
          <span>ACTIVE</span>
        </label>
      `;

      const oreCell = row.querySelector<HTMLElement>('.dronebay-roster-ore')!;
      if (isMiner(d.droneType)) {
        const sel = document.createElement('select');
        sel.className = 'dronebay-roster-ore-select';
        for (const opt of MINER_ORE_CHOICES) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if ((d.orePreference ?? '') === opt.value) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
          const v = sel.value as OreType | '';
          fleetManager.setDroneOrePreference(d.id, v === '' ? null : v);
          this._needsRender = true;
        });
        oreCell.appendChild(sel);
      } else {
        oreCell.textContent = '—';
      }

      const toggle = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      toggle.addEventListener('change', () => {
        const res = fleetManager.setDroneDisabled(d.id, !toggle.checked);
        if (!res.ok) {
          // Rejected (bay cap). Snap the checkbox back.
          toggle.checked = !res.disabled;
        }
        this._needsRender = true;
      });

      list.appendChild(row);
    }
  }

  private _renderSummary(): void {
    const fleetDetail = this._root.querySelector<HTMLElement>('.dronebay-fleet-detail')!;
    const drones = fleetManager.getDrones();
    const active = fleetManager.getActiveCount();
    const cap = gameState.maxActiveDrones;
    fleetDetail.textContent = `${active}/${cap} active · ${drones.length} owned`;
    this._root.querySelector<HTMLElement>('.dronebay-fleet-count')!.textContent =
      String(drones.length);
  }

  /** Called each frame while the panel is visible. Throttled to 4Hz so the
   * status badges update live as drones move through mine/haul/return. */
  update(delta: number): void {
    if (!this._visible) return;
    this._updateTimer += delta;
    if (!this._needsRender && this._updateTimer < 0.25) return;
    this._updateTimer = 0;
    this._needsRender = false;
    this._renderRoster();
    this._renderSummary();
  }

  private _purchase(key: DroneType): void {
    if (!this._bay || !this._world) return;
    this._bay.purchase(key, this._world);
    this._needsRender = true;
    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(
      effect(() => {
        crEl.textContent = Math.floor(credits.value).toLocaleString();
        if (this._visible) this._renderShop();
      }),
      effect(() => {
        droneCount.value;
        if (this._visible) this._render();
      }),
    );
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
