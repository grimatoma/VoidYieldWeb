import type { DroneDepot } from '@entities/DroneDepot';
import type { DroneBase } from '@entities/DroneBase';
import type { DroneBaySlot } from '@services/OutpostDispatcher';
import type { OreType } from '@data/types';
import type { Container } from 'pixi.js';
import { gameState } from '@services/GameState';
import { outpostDispatcher } from '@services/OutpostDispatcher';

const DRONE_SPECS = [
  { type: 'scout' as const, label: 'MINING DRONE', cost: 25  },
  { type: 'heavy' as const, label: 'HEAVY MINER', cost: 150 },
  { type: 'refinery' as const, label: 'LOGISTICS DRONE', cost: 75 },
];

/** ore/min per active miner drone */
const MINER_RATE = 4.8;
/** units/min per active logistics drone (approx. 8-tile circuit) */
const LOGI_RATE = 6;
/** ore/min the furnace consumes (recipe ×2 ore/bar, 10-batch/min = 8/min rough) */
const FURNACE_DEMAND = 8;

/** Derive effective role from a slot (role override or droneType default). */
function slotRole(slot: DroneBaySlot): 'miner' | 'logistics' | 'idle' {
  if (!slot.drone) return 'idle';
  if (slot.role) return slot.role;
  if (slot.drone.droneType === 'refinery' || slot.drone.droneType === 'cargo') return 'logistics';
  return 'miner';
}

export class DroneDepotOverlay {
  private _depot: DroneDepot;
  private _getWorldContainer: () => Container;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _pollHandle: ReturnType<typeof setInterval> | null = null;

  /** Tracks drag state for the allocation slider. */
  private _sliderDragging = false;

  constructor(depot: DroneDepot, getWorldContainer: () => Container) {
    this._depot = depot;
    this._getWorldContainer = getWorldContainer;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;
    this._root = document.createElement('div');
    this._root.id = 'drone-depot-overlay';
    this._root.className = 'facility-panel';
    this._root.style.display = 'none';
    this._root.style.setProperty('--facility-accent', '#c084fc');
    this._root.style.setProperty('--facility-accent-soft', 'rgba(192, 132, 252, 0.14)');
    this._root.style.setProperty('--facility-accent-border', 'rgba(192, 132, 252, 0.42)');
    this._root.style.width = 'min(calc(560px * var(--hud-scale)), 94vw)';
    parent.appendChild(this._root);
    this._render();
  }

  unmount(): void {
    this._stopPoll();
    this._root?.remove();
    this._root = null;
    this._open = false;
  }

  open(): void {
    this._open = true;
    if (this._root) {
      this._root.style.display = 'flex';
      this._render();
    }
    this._startPoll();
  }

  close(): void {
    this._open = false;
    if (this._root) this._root.style.display = 'none';
    this._stopPoll();
  }

  isOpen(): boolean { return this._open; }

  private _startPoll(): void {
    this._stopPoll();
    this._pollHandle = setInterval(() => {
      if (this._open) this._render();
    }, 500);
  }

  private _stopPoll(): void {
    if (this._pollHandle !== null) {
      clearInterval(this._pollHandle);
      this._pollHandle = null;
    }
  }

  private _render(): void {
    if (!this._root) return;
    const slots = this._depot.getBaySlots();
    const credits = gameState.credits;

    let minerCount = 0;
    let logiCount = 0;
    let idleCount = 0;
    for (const slot of slots) {
      const role = slotRole(slot);
      if (role === 'miner') minerCount++;
      else if (role === 'logistics') logiCount++;
      else idleCount++;
    }
    const activeCount = minerCount + logiCount;
    const totalCount = slots.length;

    const oreIntake = minerCount * MINER_RATE;
    const logiCap = logiCount * LOGI_RATE;
    const isBottleneck = logiCount > 0 && logiCap < oreIntake;
    const isBalanced = !isBottleneck && activeCount > 0;

    const minerPct = totalCount > 0 ? (minerCount / totalCount) * 100 : 0;
    const logiPct = totalCount > 0 ? (logiCount / totalCount) * 100 : 0;
    const idlePct = totalCount > 0 ? (idleCount / totalCount) * 100 : 0;
    const activeDrones = minerCount + logiCount;
    const sliderPct = activeDrones > 0 ? (minerCount / activeDrones) * 100 : 50;

    const statusBadge = isBottleneck
      ? '<span class="facility-chip facility-chip--warn">Logistics bottleneck</span>'
      : isBalanced
        ? '<span class="facility-chip facility-chip--good">Balanced</span>'
        : '<span class="facility-chip facility-chip--accent">Awaiting assignments</span>';

    let html = `
      <div class="facility-panel-head">
        <div class="facility-panel-heading">
          <div class="facility-panel-kicker">Drone Command</div>
          <h2 class="facility-panel-title">Drone Bay</h2>
          <div class="facility-panel-subtitle">Manage miner and logistics assignments from one standard command menu.</div>
        </div>
        <div class="facility-panel-meta">
          <span class="facility-chip">${totalCount} total</span>
          <span class="facility-chip facility-chip--accent">${activeCount} active</span>
          ${statusBadge}
        </div>
      </div>
      <div class="facility-panel-body">
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Role allocation</div>
          <div class="facility-segment-bar">
            ${minerPct > 0 ? `<div class="facility-segment" style="width:${minerPct}%; background:linear-gradient(90deg, #9333ea 0%, #c084fc 100%);">MINERS ×${minerCount}</div>` : ''}
            ${logiPct > 0 ? `<div class="facility-segment" style="width:${logiPct}%; background:linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);">LOGISTICS ×${logiCount}</div>` : ''}
            ${idlePct > 0 ? `<div class="facility-segment" style="width:${idlePct}%; background:#1f2937; color:#7c89a6;">IDLE ×${idleCount}</div>` : ''}
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Miners</span>
            <div class="facility-slider" id="ddo-slider-track">
              <div class="facility-slider-fill" style="width:${sliderPct}%;"></div>
              <div class="facility-slider-thumb" id="ddo-slider-thumb" style="left:${sliderPct}%;"></div>
            </div>
            <span class="facility-row-label">Logistics</span>
          </div>
          <div class="facility-progress-labels">
            <span>More mining throughput</span>
            <span>More transport capacity</span>
          </div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Live throughput estimate</div>
          <div class="facility-row">
            <span class="facility-row-label">Ore intake rate</span>
            <span class="facility-row-value">~${oreIntake.toFixed(1)} ore/min</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Logistics capacity</span>
            <span class="facility-row-value ${isBottleneck ? 'facility-row-value--warn' : 'facility-row-value--good'}">~${logiCap.toFixed(0)} units/min</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Furnace demand</span>
            <span class="facility-row-value">${FURNACE_DEMAND} ore/min</span>
          </div>
          ${isBottleneck
            ? '<div class="facility-note facility-note--warn">Ore is arriving faster than your logistics drones can move it. Shift one drone from Miner to Logistics to prevent storage backups.</div>'
            : isBalanced
              ? '<div class="facility-note facility-note--good">No immediate bottleneck detected. Mining and hauling look balanced right now.</div>'
              : '<div class="facility-note">Purchase or assign drones to start production flow across the outpost.</div>'
          }
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Individual drones</div>
          <div class="facility-roster">
            ${slots.map((slot, index) => this._renderDroneRow(slot, index + 1)).join('')}
          </div>
        </div>
    `;

    const emptySlots = slots.filter((slot) => !slot.drone);
    if (emptySlots.length > 0) {
      html += `
        <div class="facility-section">
          <div class="facility-section-title">Purchase drone</div>
          <div class="facility-row">
            <span class="facility-row-label">Available credits</span>
            <span class="facility-row-value facility-row-value--accent">${credits.toLocaleString()} CR</span>
          </div>
      `;
      for (const slot of emptySlots) {
        html += `
          <div class="facility-card">
            <div class="facility-row facility-row--top">
              <div>
                <div class="facility-item-title">Slot ${slots.indexOf(slot) + 1}</div>
                <div class="facility-item-meta">Empty bay slot ready for deployment.</div>
              </div>
            </div>
            <div class="facility-actions" style="margin-top:calc(8px * var(--hud-scale));">
              ${DRONE_SPECS.map((spec) => {
                const canAfford = credits >= spec.cost;
                const classes = `facility-btn facility-btn--small ${spec.type === 'refinery' ? 'facility-btn--accent' : ''}`;
                return `<button id="ddo-buy-${slot.slotId}-${spec.type}" ${canAfford ? '' : 'disabled'} class="${classes}">${spec.label} • ${spec.cost} CR</button>`;
              }).join('')}
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    html += `
        <div class="facility-actions">
          <button id="ddo-recall" class="facility-btn facility-btn--danger">Recall all drones</button>
          <button id="ddo-close" class="facility-btn">Close</button>
        </div>
      </div>
    `;

    this._root.innerHTML = html;
    this._wireEvents(slots);
  }

  private _renderDroneRow(slot: DroneBaySlot, num: number): string {
    const droneId = `D-${String(num).padStart(2, '0')}`;
    if (!slot.drone) {
      return `
        <div class="facility-roster-row">
          <span class="facility-status-dot" style="--dot-color:#475569;"></span>
          <span class="facility-roster-id">${droneId}</span>
          <span class="facility-pill">Idle</span>
          <span class="facility-roster-status">No drone assigned to this slot.</span>
          <span class="facility-row-value facility-row-value--muted">Empty bay</span>
        </div>
      `;
    }

    const role = slotRole(slot);
    const { dotColor, statusText, statusClass } = this._droneStatusInfo(slot.drone);

    const pillStyle = role === 'miner'
      ? '--pill-bg:rgba(88,28,135,0.28); --pill-border:rgba(192,132,252,0.48); --pill-text:#d8b4fe;'
      : role === 'logistics'
        ? '--pill-bg:rgba(30,64,175,0.28); --pill-border:rgba(96,165,250,0.48); --pill-text:#93c5fd;'
        : '--pill-bg:rgba(31,41,55,0.82); --pill-border:rgba(71,85,105,0.48); --pill-text:#94a3b8;';
    const pillLabel = role === 'miner' ? 'Miner' : role === 'logistics' ? 'Logistics' : 'Idle';

    const minerBtnClass = `facility-btn facility-btn--small ${role === 'miner' ? 'facility-btn--active' : ''}`;
    const logiBtnClass = `facility-btn facility-btn--small ${role === 'logistics' ? 'facility-btn--accent' : ''}`;
    const statusColorClass = statusClass === 'warn'
      ? 'facility-row-value--warn'
      : statusClass === 'idle'
        ? 'facility-row-value--muted'
        : 'facility-row-value--good';

    const oreOptions: Array<{ value: string; label: string }> = [
      { value: 'any', label: 'ANY' },
      { value: 'iron_ore', label: 'IRON' },
      { value: 'copper_ore', label: 'COPPER' },
      { value: 'water', label: 'WATER' },
    ];
    const oreSelectHtml = role === 'miner'
      ? `
        <select id="ddo-ore-${slot.slotId}" class="facility-select">
          ${oreOptions.map((option) => (
            `<option value="${option.value}"${slot.oreType === option.value ? ' selected' : ''}>${option.label}</option>`
          )).join('')}
        </select>
      `
      : '';

    return `
      <div class="facility-roster-row">
        <span class="facility-status-dot" style="--dot-color:${dotColor};"></span>
        <span class="facility-roster-id">${droneId}</span>
        <span class="facility-pill" style="${pillStyle}">${pillLabel}</span>
        <span class="facility-roster-status ${statusColorClass}">${statusText}</span>
        <div class="facility-inline-actions">
          ${oreSelectHtml}
          <button id="ddo-role-m-${slot.slotId}" class="${minerBtnClass}">M</button>
          <button id="ddo-role-l-${slot.slotId}" class="${logiBtnClass}">L</button>
        </div>
      </div>
    `;
  }

  private _droneStatusInfo(drone: DroneBase): { dotColor: string; statusText: string; statusClass: 'active' | 'warn' | 'idle' } {
    const tasks = drone.getTasks();
    const task = tasks[0];
    if (drone.state === 'IDLE' || !task) {
      return { dotColor: '#64748b', statusText: 'Not assigned', statusClass: 'idle' };
    }
    if (drone.state === 'MOVING_TO_TARGET') {
      return task.type === 'MINE'
        ? { dotColor: '#c084fc', statusText: 'En route to deposit', statusClass: 'active' }
        : { dotColor: '#38bdf8', statusText: 'Hauling resources', statusClass: 'active' };
    }
    if (drone.state === 'EXECUTING') {
      return task.type === 'MINE'
        ? { dotColor: '#f97316', statusText: 'Mining deposit', statusClass: 'active' }
        : { dotColor: '#22d3ee', statusText: 'Depositing cargo', statusClass: 'active' };
    }
    return { dotColor: '#fbbf24', statusText: 'Busy', statusClass: 'warn' };
  }

  private _wireEvents(slots: readonly DroneBaySlot[]): void {
    if (!this._root) return;

    this._root.querySelector('#ddo-close')?.addEventListener('click', () => this.close());

    this._root.querySelector('#ddo-recall')?.addEventListener('click', () => {
      for (const slot of slots) {
        if (slot.drone) slot.drone.clearTasks();
      }
      this._render();
    });

    this._wireSlider(slots);

    for (const slot of slots) {
      if (!slot.drone) {
        for (const spec of DRONE_SPECS) {
          const btn = this._root.querySelector(`#ddo-buy-${slot.slotId}-${spec.type}`);
          btn?.addEventListener('click', () => {
            this._depot.assignDrone(slot.slotId, spec.type, this._getWorldContainer());
            this._render();
          });
        }
      } else {
        this._root.querySelector(`#ddo-role-m-${slot.slotId}`)?.addEventListener('click', () => {
          outpostDispatcher.setSlotRole(slot.slotId, 'miner');
          this._render();
        });
        this._root.querySelector(`#ddo-role-l-${slot.slotId}`)?.addEventListener('click', () => {
          outpostDispatcher.setSlotRole(slot.slotId, 'logistics');
          this._render();
        });

        const oreSelect = this._root.querySelector<HTMLSelectElement>(`#ddo-ore-${slot.slotId}`);
        oreSelect?.addEventListener('change', () => {
          this._depot.setSlotOreType(slot.slotId, oreSelect.value as OreType | 'any');
        });
      }
    }
  }

  /**
   * Wire the allocation slider: dragging it left/right shifts one drone between
   * miner and logistics roles. The slider position reflects live miner% of
   * active drones — no extra state is stored.
   */
  private _wireSlider(slots: readonly DroneBaySlot[]): void {
    const track = this._root?.querySelector<HTMLElement>('#ddo-slider-track');
    if (!track) return;

    const getTargetMinerFraction = (clientX: number): number => {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const onMove = (clientX: number) => {
      if (!this._sliderDragging) return;
      const targetFraction = getTargetMinerFraction(clientX);
      const activeDrones = slots.filter((slot) => slot.drone && slotRole(slot) !== 'idle');
      const currentMiners = activeDrones.filter((slot) => slotRole(slot) === 'miner').length;
      const targetMiners = Math.round(targetFraction * activeDrones.length);

      if (targetMiners > currentMiners) {
        const logiSlot = [...slots].reverse().find((slot) => slot.drone && slotRole(slot) === 'logistics');
        if (logiSlot) outpostDispatcher.setSlotRole(logiSlot.slotId, 'miner');
      } else if (targetMiners < currentMiners) {
        const minerSlot = [...slots].reverse().find((slot) => slot.drone && slotRole(slot) === 'miner');
        if (minerSlot) outpostDispatcher.setSlotRole(minerSlot.slotId, 'logistics');
      }
      this._render();
    };

    track.addEventListener('mousedown', (e: MouseEvent) => {
      this._sliderDragging = true;
      onMove(e.clientX);
    });
    document.addEventListener('mousemove', (e: MouseEvent) => onMove(e.clientX));
    document.addEventListener('mouseup', () => { this._sliderDragging = false; });
  }
}
