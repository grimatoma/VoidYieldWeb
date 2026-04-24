/**
 * DroneManagementPanel — unified drone management UI.
 *
 * Sections:
 *   1. ALLOCATION — +/- counters to assign miners to ore types and
 *      size the logistics pool.
 *   2. ROSTER — all owned drones with live status and Destroy button.
 *   3. BUY — purchase drone types into the first available empty slot.
 *
 * Opened via the touch menu "Drone Management" button or the "Open Drone
 * Management" button on any per-bay simplified panel. No keyboard shortcut.
 */
import { effect } from '@preact/signals-core';
import { credits, droneCount } from '@store/gameStore';
import { fleetManager } from '@services/FleetManager';
import { droneBayRegistry } from '@services/DroneBayRegistry';
import { droneAllocationManager } from '@services/DroneAllocationManager';
import { EventBus } from '@services/EventBus';
import type { DroneBase } from '@entities/DroneBase';
import type { DroneType, OreType } from '@data/types';
import { ScoutDrone } from '@entities/ScoutDrone';
import { HeavyDrone } from '@entities/HeavyDrone';
import { RefineryDrone } from '@entities/RefineryDrone';

const MINER_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['scout', 'heavy']);
const LOGISTICS_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['refinery', 'cargo']);

const DRONE_SPECS: Array<{ key: DroneType; label: string; sublabel: string; cost: number; isMiner: boolean }> = [
  { key: 'scout',    label: 'MINING DRONE',    sublabel: 'Scout class',    cost: ScoutDrone.COST,    isMiner: true  },
  { key: 'heavy',    label: 'HEAVY MINER',     sublabel: 'Heavy class',    cost: HeavyDrone.COST,    isMiner: true  },
  { key: 'refinery', label: 'LOGISTICS DRONE', sublabel: 'Refinery class', cost: RefineryDrone.COST, isMiner: false },
];

const ORE_OPTIONS: Array<{ value: OreType; label: string }> = [
  { value: 'vorax',      label: 'VORAX'   },
  { value: 'krysite',    label: 'KRYSITE' },
  { value: 'gas',        label: 'GAS'     },
  { value: 'aethite',    label: 'AETHITE' },
  { value: 'iron_ore',   label: 'IRON'    },
  { value: 'copper_ore', label: 'COPPER'  },
  { value: 'water',      label: 'WATER'   },
];

const DRONE_TYPE_LABEL: Record<DroneType, string> = {
  scout: 'MINING', heavy: 'HEAVY', refinery: 'LOGISTICS',
  survey: 'SURVEY', builder: 'BUILDER', cargo: 'CARGO', repair: 'REPAIR',
};

function droneStatusLabel(d: DroneBase): string {
  if (d.disabled) return 'OFF';
  if (d.state === 'IDLE') return 'IDLE';
  const task = d.peekTask();
  const hasCargo = d.cargo !== null && d.cargo.quantity > 0;
  if (hasCargo) return d.state === 'EXECUTING' ? 'RETURNING' : 'HAULING';
  if (task?.type === 'MINE') return 'MINING';
  if (task?.type === 'CARRY') return 'MOVING';
  if (task?.type === 'FUEL' || task?.type === 'EMPTY') return 'SERVICING';
  return d.state === 'EXECUTING' ? 'WORKING' : 'MOVING';
}

function allocationLabel(d: DroneBase): string {
  if (MINER_TYPES.has(d.droneType)) {
    if (!d.orePreference) return '— unallocated';
    const ore = ORE_OPTIONS.find(o => o.value === d.orePreference);
    return `→ ${ore?.label ?? d.orePreference.toUpperCase()}`;
  }
  if (LOGISTICS_TYPES.has(d.droneType)) {
    return d.disabled ? '— parked' : '→ Pool';
  }
  return '—';
}

export class DroneManagementPanel {
  private _root: HTMLElement;
  private _cleanups: Array<() => void> = [];
  private _visible = false;
  private _updateTimer = 0;
  private _needsRender = false;
  private _onKeydown: (e: KeyboardEvent) => void;
  private _unsubBus: Array<() => void> = [];

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';

    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'drone-mgmt-panel';
    panel.className = 'trade-panel';
    panel.style.maxHeight = '85vh';
    panel.style.overflowY = 'auto';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>DRONE MANAGEMENT</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="trade-panel-credits">
        <span>CR</span>
        <span id="dmp-credits">0</span>
        &nbsp;·&nbsp;
        <span id="dmp-slots">Slots: 0/0</span>
      </div>
      <div id="dmp-body"></div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _render(): void {
    const body = this._root.querySelector<HTMLElement>('#dmp-body')!;
    body.innerHTML = '';

    body.appendChild(this._buildAllocationSection());
    body.appendChild(this._buildRosterSection());
    body.appendChild(this._buildBuySection());

    this._wireEvents();
  }

  private _buildAllocationSection(): HTMLElement {
    const sec = document.createElement('div');
    sec.className = 'dronebay-section-head';
    sec.textContent = 'ALLOCATION';

    const container = document.createElement('div');
    container.appendChild(sec);

    const drones = fleetManager.getDrones();
    const miners = drones.filter(d => MINER_TYPES.has(d.droneType) && !d.disabled);
    const logistics = drones.filter(d => LOGISTICS_TYPES.has(d.droneType));
    const totalMiners = miners.length;
    const totalLogistics = logistics.length;
    const allocated = droneAllocationManager.totalAllocatedMiners();
    const unallocatedMiners = Math.max(0, totalMiners - allocated);
    const logAlloc = droneAllocationManager.getLogisticsAlloc();
    const unallocLogi = Math.max(0, totalLogistics - logAlloc);

    const grid = document.createElement('div');
    grid.className = 'trade-panel-list';
    grid.style.gap = '4px';

    if (totalMiners === 0 && totalLogistics === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#666;font-size:11px;padding:8px 0;';
      empty.textContent = 'No drones owned.';
      grid.appendChild(empty);
      container.appendChild(grid);
      return container;
    }

    // Mining block
    if (totalMiners > 0) {
      const mHead = document.createElement('div');
      mHead.style.cssText = 'font-size:10px;color:#D4A843;letter-spacing:1px;margin:8px 0 4px;font-weight:bold;';
      mHead.textContent = `MINING DRONES (${totalMiners})`;
      grid.appendChild(mHead);

      // Unallocated row (display only)
      grid.appendChild(this._allocRow('Unallocated', unallocatedMiners, null, false));

      // Per-ore rows
      const alloc = droneAllocationManager.getMinerAlloc();
      for (const opt of ORE_OPTIONS) {
        const count = alloc.get(opt.value) ?? 0;
        const canInc = unallocatedMiners > 0;
        const canDec = count > 0;
        grid.appendChild(this._allocRow(opt.label, count, opt.value, true, canInc, canDec));
      }
    }

    // Logistics block
    if (totalLogistics > 0) {
      const lHead = document.createElement('div');
      lHead.style.cssText = 'font-size:10px;color:#00B8D4;letter-spacing:1px;margin:8px 0 4px;font-weight:bold;';
      lHead.textContent = `LOGISTICS DRONES (${totalLogistics})`;
      grid.appendChild(lHead);

      grid.appendChild(this._allocRow('Unallocated', unallocLogi, null, false));
      const canIncL = logAlloc < totalLogistics;
      const canDecL = logAlloc > 0;
      grid.appendChild(this._allocRow('Pool', logAlloc, '__logistics__' as OreType, true, canIncL, canDecL));
    }

    container.appendChild(grid);
    return container;
  }

  private _allocRow(
    label: string,
    count: number,
    ore: OreType | null,
    interactive: boolean,
    canInc = false,
    canDec = false,
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px;';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:1;color:#C8C4B0;';
    lbl.textContent = label;

    const cnt = document.createElement('span');
    cnt.style.cssText = 'color:#D4A843;min-width:24px;text-align:center;font-weight:bold;';
    cnt.textContent = String(count);

    row.appendChild(lbl);
    row.appendChild(cnt);

    if (interactive && ore !== null) {
      const decBtn = document.createElement('button');
      decBtn.className = 'trade-row-buy-btn';
      decBtn.textContent = '−';
      decBtn.style.cssText = 'padding:2px 8px;font-size:14px;min-width:28px;';
      decBtn.disabled = !canDec;
      decBtn.dataset.ore = ore;
      decBtn.dataset.delta = '-1';

      const incBtn = document.createElement('button');
      incBtn.className = 'trade-row-buy-btn';
      incBtn.textContent = '+';
      incBtn.style.cssText = 'padding:2px 8px;font-size:14px;min-width:28px;';
      incBtn.disabled = !canInc;
      incBtn.dataset.ore = ore;
      incBtn.dataset.delta = '1';

      row.appendChild(decBtn);
      row.appendChild(incBtn);
    }

    return row;
  }

  private _buildRosterSection(): HTMLElement {
    const sec = document.createElement('div');
    sec.className = 'dronebay-section-head';
    sec.textContent = 'DRONE ROSTER';

    const container = document.createElement('div');
    container.appendChild(sec);

    const list = document.createElement('div');
    list.className = 'trade-panel-list';
    list.id = 'dmp-roster';

    const drones = fleetManager.getDrones();
    if (drones.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dronebay-roster-empty';
      empty.textContent = 'No drones owned.';
      list.appendChild(empty);
      container.appendChild(list);
      return container;
    }

    const perTypeCounters = new Map<DroneType, number>();
    for (const d of drones) {
      const n = (perTypeCounters.get(d.droneType) ?? 0) + 1;
      perTypeCounters.set(d.droneType, n);
      const typeLabel = DRONE_TYPE_LABEL[d.droneType];
      const status = droneStatusLabel(d);
      const allocLbl = allocationLabel(d);

      const row = document.createElement('div');
      row.className = 'dronebay-roster-row' + (d.disabled ? ' dronebay-roster-row--off' : '');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;';

      const namePart = document.createElement('div');
      namePart.style.cssText = 'flex:1;min-width:0;';
      namePart.innerHTML = `
        <span class="dronebay-roster-name" style="font-size:12px;">
          ${typeLabel} #${n}
          <span class="dronebay-roster-status" data-status="${status}">${status}</span>
        </span>
        <div style="font-size:10px;color:#888;margin-top:2px;">${allocLbl}</div>
      `;

      const destroyBtn = document.createElement('button');
      destroyBtn.className = 'trade-panel-action';
      destroyBtn.textContent = 'DESTROY';
      destroyBtn.dataset.droneId = d.id;
      destroyBtn.style.cssText = 'color:#E53935;border-color:#E53935;font-size:10px;padding:2px 6px;flex-shrink:0;';

      row.appendChild(namePart);
      row.appendChild(destroyBtn);
      list.appendChild(row);
    }

    container.appendChild(list);
    return container;
  }

  private _buildBuySection(): HTMLElement {
    const emptySlots = droneBayRegistry.totalEmptySlots();
    const balance = credits.value;

    const sec = document.createElement('div');
    sec.className = 'dronebay-section-head';
    sec.textContent = `BUY DRONE (${emptySlots} slot${emptySlots !== 1 ? 's' : ''} free)`;

    const container = document.createElement('div');
    container.appendChild(sec);

    if (emptySlots === 0) {
      const msg = document.createElement('div');
      msg.style.cssText = 'color:#666;font-size:11px;padding:8px 0;';
      msg.textContent = 'No empty slots. Upgrade a bay or destroy a drone.';
      container.appendChild(msg);
      return container;
    }

    const list = document.createElement('div');
    list.className = 'trade-panel-list';

    for (const spec of DRONE_SPECS) {
      const affordable = balance >= spec.cost;
      const row = document.createElement('div');
      row.className = 'trade-row' + (affordable ? '' : ' trade-row--dim');
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${spec.label}</div>
          <div class="trade-row-sub">${spec.sublabel}</div>
        </div>
        <div class="trade-row-buy">
          <div class="trade-row-cost">${spec.cost} CR</div>
          <button class="trade-row-buy-btn" data-buy="${spec.key}" ${affordable ? '' : 'disabled'}>BUY</button>
        </div>
      `;
      list.appendChild(row);
    }

    container.appendChild(list);
    return container;
  }

  private _wireEvents(): void {
    const body = this._root.querySelector<HTMLElement>('#dmp-body')!;

    // Allocation +/- buttons
    body.querySelectorAll<HTMLButtonElement>('button[data-ore][data-delta]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ore = btn.dataset.ore!;
        const delta = parseInt(btn.dataset.delta!);
        const drones = fleetManager.getDrones();

        if (ore === '__logistics__') {
          const total = drones.filter(d => LOGISTICS_TYPES.has(d.droneType)).length;
          droneAllocationManager.allocateLogistics(delta, total);
        } else {
          const total = drones.filter(d => MINER_TYPES.has(d.droneType) && !d.disabled).length;
          droneAllocationManager.allocateMiner(ore as OreType, delta, total);
        }
        this._needsRender = true;
      });
    });

    // Destroy buttons
    body.querySelectorAll<HTMLButtonElement>('button[data-drone-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.droneId!;
        if (confirm('Destroy this drone? Full purchase cost will be refunded.')) {
          droneBayRegistry.destroyDrone(id);
          this._needsRender = true;
        }
      });
    });

    // Buy buttons
    body.querySelectorAll<HTMLButtonElement>('button[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.buy as DroneType;
        const slot = droneBayRegistry.findEmptySlot();
        if (slot) {
          slot.bay.purchaseIntoSlot(type);
          this._needsRender = true;
        }
      });
    });
  }

  private _renderSummary(): void {
    const used = droneBayRegistry.totalUsedSlots();
    const total = droneBayRegistry.totalSlots();
    const el = this._root.querySelector<HTMLElement>('#dmp-slots');
    if (el) el.textContent = `Slots: ${used}/${total}`;
  }

  update(delta: number): void {
    if (!this._visible) return;
    this._updateTimer += delta;
    if (!this._needsRender && this._updateTimer < 0.25) return;
    this._updateTimer = 0;
    this._needsRender = false;
    this._render();
    this._renderSummary();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
    const crEl = this._root.querySelector<HTMLElement>('#dmp-credits')!;
    this._cleanups.push(
      effect(() => {
        crEl.textContent = Math.floor(credits.value).toLocaleString();
        if (this._visible) this._needsRender = true;
      }),
      effect(() => {
        droneCount.value;
        if (this._visible) this._needsRender = true;
      }),
    );

    const onAlloc = () => { if (this._visible) this._needsRender = true; };
    const onRoster = () => { if (this._visible) this._needsRender = true; };
    EventBus.on('drone:allocation_changed', onAlloc);
    EventBus.on('fleet:roster_changed', onRoster);
    this._unsubBus.push(
      () => EventBus.off('drone:allocation_changed', onAlloc),
      () => EventBus.off('fleet:roster_changed', onRoster),
    );
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._render();
    this._renderSummary();
  }

  close(): void {
    if (!this._visible) return;
    this._visible = false;
    this._root.style.display = 'none';
  }

  toggle(): void {
    if (this._visible) this.close();
    else this.open();
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    for (const c of this._cleanups) c();
    this._cleanups = [];
    for (const u of this._unsubBus) u();
    this._unsubBus = [];
    this._root.remove();
  }
}
