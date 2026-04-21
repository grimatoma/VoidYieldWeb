/**
 * Drone Bay panel — matches design_mocks/13_shop_panel.svg (DRONES tab) and
 * design_mocks/03_drone_swarm_overview.svg. Opens on E near DroneBay. Lists
 * available drone types with cost + stats, purchase buttons, and a live
 * roster summary of the current fleet.
 */
import { effect } from '@preact/signals-core';
import { credits, droneCount } from '@store/gameStore';
import { fleetManager } from '@services/FleetManager';
import { ScoutDrone } from '@entities/ScoutDrone';
import { HeavyDrone } from '@entities/HeavyDrone';
import { RefineryDrone } from '@entities/RefineryDrone';
import { SurveyDrone } from '@entities/SurveyDrone';
import { BuilderDrone } from '@entities/BuilderDrone';
import { CargoDrone } from '@entities/CargoDrone';
import { RepairDrone } from '@entities/RepairDrone';
import type { DroneBay } from '@entities/DroneBay';
import type { Container } from 'pixi.js';
import type { DroneType } from '@data/types';

type DroneSpec = {
  key: DroneType;
  label: string;
  desc: string;
  cost: number;
  droneType: DroneType;
};

const DRONE_SPECS: DroneSpec[] = [
  { key: 'scout',    label: 'SCOUT DRONE',    desc: '60 px/s \u00B7 3 ore \u00B7 3s execute',  cost: ScoutDrone.COST,    droneType: 'scout'   },
  { key: 'heavy',    label: 'HEAVY DRONE',    desc: '40 px/s \u00B7 10 ore \u00B7 2s execute', cost: HeavyDrone.COST,    droneType: 'heavy'   },
  { key: 'refinery', label: 'REFINERY DRONE', desc: '50 px/s \u00B7 onboard smelter',           cost: RefineryDrone.COST, droneType: 'refinery' },
  { key: 'survey',   label: 'SURVEY DRONE',   desc: '35 px/s \u00B7 surveys deposits',     cost: SurveyDrone.COST,   droneType: 'survey'  },
  { key: 'builder',  label: 'BUILDER DRONE',  desc: '45 px/s \u00B7 15 mat \u00B7 builds',       cost: BuilderDrone.COST,  droneType: 'builder' },
  { key: 'cargo',    label: 'CARGO DRONE',    desc: '35 px/s \u00B7 20 cap \u00B7 inter-planet', cost: CargoDrone.COST,    droneType: 'cargo'   },
  { key: 'repair',   label: 'REPAIR DRONE',   desc: '90 px/s \u00B7 repairs harvesters',    cost: RepairDrone.COST,   droneType: 'repair'  },
];

export class DroneBayPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _bay: DroneBay | null = null;
  private _world: Container | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

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
        <button class="trade-panel-close" aria-label="close">\u2715</button>
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
      <div class="trade-panel-list dronebay-list"></div>
      <div class="trade-panel-hint">[E] or [ESC] to close</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _render(): void {
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
    const fleetDetail = this._root.querySelector<HTMLElement>('.dronebay-fleet-detail')!;
    const active = fleetManager.getActive().length;
    const idle = fleetManager.getIdleDrones().length;
    fleetDetail.textContent = `${active} active / ${idle} idle`;
    this._root.querySelector<HTMLElement>('.dronebay-fleet-count')!.textContent =
      String(fleetManager.getDrones().length);
  }

  private _purchase(key: DroneType): void {
    if (!this._bay || !this._world) return;
    this._bay.purchase(key, this._world);
    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('.trade-panel-cr-value')!;
    this._cleanups.push(
      effect(() => {
        crEl.textContent = Math.floor(credits.value).toLocaleString();
        if (this._visible) this._render();
      }),
      effect(() => {
        // React to droneCount changes — just triggers the re-render signal.
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
