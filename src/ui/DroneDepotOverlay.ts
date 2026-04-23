import type { DroneDepot } from '@entities/DroneDepot';
import type { DroneBase } from '@entities/DroneBase';
import type { DroneBaySlot } from '@services/OutpostDispatcher';
import type { OreType } from '@data/types';
import type { Container } from 'pixi.js';
import { gameState } from '@services/GameState';
import { outpostDispatcher } from '@services/OutpostDispatcher';

const DRONE_SPECS = [
  { type: 'scout' as const, label: 'MINING DRONE', cost: 25  },
  { type: 'heavy' as const, label: 'HEAVY MINER',  cost: 150 },
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
    this._root.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:rgba(7,18,42,0.98)',
      'border:1px solid #8040C0',
      'color:#E8E4D0',
      'font-family:monospace',
      'font-size:13px',
      'padding:0',
      'min-width:460px',
      'max-width:540px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');
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
      this._root.style.display = 'block';
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

    // Counts
    let minerCount = 0;
    let logiCount = 0;
    let idleCount = 0;
    for (const slot of slots) {
      const r = slotRole(slot);
      if (r === 'miner') minerCount++;
      else if (r === 'logistics') logiCount++;
      else idleCount++;
    }
    const activeCount = minerCount + logiCount;
    const totalCount = slots.length;

    // Throughput estimates
    const oreIntake = minerCount * MINER_RATE;
    const logiCap = logiCount * LOGI_RATE;
    const isBottleneck = logiCount > 0 && logiCap < oreIntake;
    const isBalanced = !isBottleneck && activeCount > 0;

    // Header
    let html = `
      <div style="background:#1A0A2A;color:#CC88FF;padding:8px 14px;font-size:12px;font-weight:bold;border-bottom:1px solid #8040C0;display:flex;justify-content:space-between;align-items:center;">
        <span>&#x2B21; DRONE BAY</span>
        <span style="font-size:10px;color:#888;">${totalCount} drones &middot; ${activeCount} active &middot; ${idleCount} idle</span>
      </div>
    `;

    // ── ROLE ALLOCATION ──────────────────────────────────────────────────────
    const minerPct = totalCount > 0 ? (minerCount / totalCount) * 100 : 0;
    const logiPct  = totalCount > 0 ? (logiCount  / totalCount) * 100 : 0;
    const idlePct  = totalCount > 0 ? (idleCount  / totalCount) * 100 : 0;

    // Slider thumb position: fraction of active drones that are miners
    const activeDrones = minerCount + logiCount;
    const sliderPct = activeDrones > 0 ? (minerCount / activeDrones) * 100 : 50;

    html += `
      <div style="padding:10px 14px;border-bottom:1px solid #1A0A2A;">
        <div style="font-size:10px;color:#8040C0;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Role Allocation</div>

        <div id="ddo-alloc-bar" style="height:16px;display:flex;border:1px solid #2A1A3A;overflow:hidden;border-radius:2px;margin-bottom:6px;">
          ${minerPct > 0 ? `<div style="width:${minerPct}%;background:linear-gradient(90deg,#8040C0,#6030A0);display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:bold;white-space:nowrap;overflow:hidden;">MINERS &times;${minerCount}</div>` : ''}
          ${logiPct  > 0 ? `<div style="width:${logiPct}%;background:linear-gradient(90deg,#204080,#2060C0);display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:bold;white-space:nowrap;overflow:hidden;">LOGI &times;${logiCount}</div>` : ''}
          ${idlePct  > 0 ? `<div style="width:${idlePct}%;background:#1A1A2A;display:flex;align-items:center;justify-content:center;font-size:9px;color:#4A4A6A;white-space:nowrap;overflow:hidden;">IDLE &times;${idleCount}</div>` : ''}
        </div>

        <div style="display:flex;align-items:center;gap:8px;margin:4px 0 10px;">
          <span style="font-size:10px;color:#CC88FF;width:60px;">&#x2B21; MINERS</span>
          <div id="ddo-slider-track" style="flex:1;height:6px;background:#1A1A3A;border:1px solid #3A2A5A;border-radius:3px;position:relative;cursor:pointer;">
            <div style="position:absolute;left:0;height:100%;width:${sliderPct}%;background:#8040C0;border-radius:3px;"></div>
            <div id="ddo-slider-thumb" style="position:absolute;width:12px;height:12px;background:#D4A843;border-radius:50%;top:-3px;left:${sliderPct}%;transform:translateX(-50%);cursor:grab;border:1px solid #fff;"></div>
          </div>
          <span style="font-size:10px;color:#88AAFF;width:60px;text-align:right;">LOGI &#x2B21;</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#666;padding:0 2px;margin-bottom:4px;">
          <span>&larr; more mining throughput</span>
          <span>more logistics capacity &rarr;</span>
        </div>
      </div>
    `;

    // ── THROUGHPUT ESTIMATES ─────────────────────────────────────────────────
    const intakeColor = '#E8E4D0';
    const logiCapColor = isBottleneck ? '#FBBF24' : '#4ADE80';
    const balancedHtml = isBottleneck
      ? `<div style="background:#2A1A0A;border:1px solid #FBBF24;padding:6px 10px;font-size:10px;color:#FDE68A;margin:6px 0;">&#x26A0; BOTTLENECK: Logistics &mdash; ore backing up at Storage faster than Furnace consumes it.<br>Suggestion: move 1 drone from Miner &rarr; Logistics.</div>`
      : isBalanced
        ? `<div style="background:#1A2A0A;border:1px solid #4ADE80;padding:6px 10px;font-size:10px;color:#86EFAC;margin:6px 0;">&#x2713; BALANCED &mdash; no bottleneck detected</div>`
        : '';

    html += `
      <div style="padding:10px 14px;border-bottom:1px solid #1A0A2A;">
        <div style="font-size:10px;color:#8040C0;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Live Throughput Estimate</div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:5px;">
          <span style="color:#888;">Ore intake rate</span>
          <span style="color:${intakeColor};">~${oreIntake.toFixed(1)} ore/min <span style="color:#666;font-size:10px;">(${minerCount} miners &times; 4.8)</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:5px;">
          <span style="color:#888;">Logistics capacity</span>
          <span style="color:${logiCapColor};">~${logiCap.toFixed(0)} units/min <span style="color:#666;font-size:10px;">(${logiCount} drone${logiCount !== 1 ? 's' : ''}, circuit)</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:5px;">
          <span style="color:#888;">Furnace demand</span>
          <span style="color:#E8E4D0;">${FURNACE_DEMAND} ore/min <span style="color:#666;font-size:10px;">(recipe &times;2 ore/bar)</span></span>
        </div>
        ${balancedHtml}
      </div>
    `;

    // ── INDIVIDUAL DRONES ────────────────────────────────────────────────────
    html += `
      <div style="padding:10px 14px;border-bottom:1px solid #1A0A2A;">
        <div style="font-size:10px;color:#8040C0;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Individual Drones</div>
    `;

    for (let i = 0; i < slots.length; i++) {
      html += this._renderDroneRow(slots[i], i + 1, i === slots.length - 1);
    }

    html += `</div>`;

    // ── PURCHASE SECTION ─────────────────────────────────────────────────────
    const emptySlots = slots.filter(s => !s.drone);
    if (emptySlots.length > 0) {
      html += `
        <div style="padding:10px 14px;border-bottom:1px solid #1A0A2A;">
          <div style="font-size:10px;color:#8040C0;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Purchase Drone</div>
          <div id="ddo-credits" style="font-size:11px;color:#00B8D4;margin-bottom:8px;">${credits.toLocaleString()} CR available</div>
      `;
      for (const slot of emptySlots) {
        const btns = DRONE_SPECS.map(spec => {
          const canAfford = credits >= spec.cost;
          const style = this._btnStyle(canAfford ? '#00B8D4' : '#555');
          const disabled = canAfford ? '' : 'disabled';
          return `<button id="ddo-buy-${slot.slotId}-${spec.type}" ${disabled} style="${style}">${spec.label} &mdash; ${spec.cost} CR</button>`;
        }).join(' ');
        html += `
          <div style="margin-bottom:8px;">
            <div style="font-size:11px;opacity:0.45;margin-bottom:6px;letter-spacing:1px;">SLOT ${slots.indexOf(slot) + 1} &mdash; EMPTY</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${btns}</div>
          </div>
        `;
      }
      html += `</div>`;
    }

    // ── ACTIONS ───────────────────────────────────────────────────────────────
    html += `
      <div style="padding:10px 14px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="ddo-recall" style="${this._btnStyle('#EA580C')}">RECALL ALL DRONES</button>
          <button id="ddo-close" style="${this._btnStyle('#3A5A8A')}">CLOSE</button>
        </div>
      </div>
    `;

    this._root.innerHTML = html;
    this._wireEvents(slots);
  }

  private _renderDroneRow(slot: DroneBaySlot, num: number, isLast: boolean): string {
    const borderStyle = isLast ? '' : 'border-bottom:1px solid #0F1A2A;';
    const droneId = `D-${String(num).padStart(2, '0')}`;

    if (!slot.drone) {
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;${borderStyle}font-size:11px;">
          <span style="color:#8040C0;width:36px;font-weight:bold;flex-shrink:0;">${droneId}</span>
          <span style="padding:2px 7px;font-size:10px;font-weight:bold;border-radius:2px;width:72px;text-align:center;background:#1A1A2A;color:#4A4A6A;border:1px solid #2A2A4A;flex-shrink:0;">IDLE</span>
          <span style="color:#4A4A6A;flex:1;font-size:10px;">── not assigned</span>
        </div>
      `;
    }

    const role = slotRole(slot);
    const { dotColor, statusText, statusClass } = this._droneStatusInfo(slot.drone);

    let badgeStyle: string;
    let badgeLabel: string;
    if (role === 'miner') {
      badgeStyle = 'background:#2A0A4A;color:#CC88FF;border:1px solid #8040C0;';
      badgeLabel = 'MINER';
    } else if (role === 'logistics') {
      badgeStyle = 'background:#0A1A4A;color:#88AAFF;border:1px solid #2040C0;';
      badgeLabel = 'LOGISTICS';
    } else {
      badgeStyle = 'background:#1A1A2A;color:#4A4A6A;border:1px solid #2A2A4A;';
      badgeLabel = 'IDLE';
    }

    const mActive = role === 'miner';
    const lActive = role === 'logistics';
    const mBtnStyle = mActive
      ? 'background:#8040C0;color:#fff;'
      : 'background:#1A0A2A;color:#8040C0;border:1px solid #4A2A6A;';
    const lBtnStyle = lActive
      ? 'background:#2060C0;color:#fff;'
      : 'background:#0A1A3A;color:#88AAFF;border:1px solid #2A4A8A;';

    const statusColor = statusClass === 'warn' ? '#FBBF24' : statusClass === 'idle' ? '#4A4A6A' : '#4ADE80';

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;${borderStyle}font-size:11px;">
        <span style="color:${dotColor};width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0;margin-left:2px;background:${dotColor};"></span>
        <span style="color:#8040C0;width:34px;font-weight:bold;flex-shrink:0;">${droneId}</span>
        <span style="padding:2px 7px;font-size:10px;font-weight:bold;border-radius:2px;width:72px;text-align:center;flex-shrink:0;${badgeStyle}">${badgeLabel}</span>
        <span style="color:${statusColor};flex:1;font-size:10px;">${statusText}</span>
        <div style="display:flex;gap:4px;margin-left:auto;flex-shrink:0;">
          <button id="ddo-role-m-${slot.slotId}" style="padding:2px 7px;font-family:monospace;font-size:10px;cursor:pointer;border:none;${mBtnStyle}">M</button>
          <button id="ddo-role-l-${slot.slotId}" style="padding:2px 7px;font-family:monospace;font-size:10px;cursor:pointer;border:none;${lBtnStyle}">L</button>
        </div>
      </div>
    `;
  }

  private _droneStatusInfo(drone: DroneBase): { dotColor: string; statusText: string; statusClass: 'active' | 'warn' | 'idle' } {
    const tasks = drone.getTasks();
    const task = tasks[0];
    if (drone.state === 'IDLE' || !task) {
      return { dotColor: '#4A4A6A', statusText: '── not assigned', statusClass: 'idle' };
    }
    if (drone.state === 'MOVING_TO_TARGET') {
      return task.type === 'MINE'
        ? { dotColor: '#8040C0', statusText: '&#x25B6; En route to deposit', statusClass: 'active' }
        : { dotColor: '#00B8D4', statusText: '&#x25B6; Hauling ...', statusClass: 'active' };
    }
    if (drone.state === 'EXECUTING') {
      return task.type === 'MINE'
        ? { dotColor: '#FF6D00', statusText: '&#x25B6; Mining ...', statusClass: 'active' }
        : { dotColor: '#00B8D4', statusText: '&#x25B6; Depositing ...', statusClass: 'active' };
    }
    return { dotColor: '#FBBF24', statusText: '&#x26A0; Busy', statusClass: 'warn' };
  }

  private _btnStyle(color: string): string {
    return [
      'font-family:monospace',
      'font-size:11px',
      'padding:4px 10px',
      `border:1px solid ${color}`,
      'background:transparent',
      `color:${color}`,
      'cursor:pointer',
    ].join(';');
  }

  private _wireEvents(slots: readonly DroneBaySlot[]): void {
    if (!this._root) return;

    // Close
    this._root.querySelector('#ddo-close')?.addEventListener('click', () => this.close());

    // Recall all
    this._root.querySelector('#ddo-recall')?.addEventListener('click', () => {
      for (const slot of slots) {
        if (slot.drone) {
          slot.drone.clearTasks();
        }
      }
      this._render();
    });

    // Slider drag
    this._wireSlider(slots);

    // Per-slot events
    for (const slot of slots) {
      if (!slot.drone) {
        // Buy buttons
        for (const spec of DRONE_SPECS) {
          const btn = this._root.querySelector(`#ddo-buy-${slot.slotId}-${spec.type}`);
          btn?.addEventListener('click', () => {
            this._depot.assignDrone(slot.slotId, spec.type, this._getWorldContainer());
            this._render();
          });
        }
      } else {
        // Role toggle M
        this._root.querySelector(`#ddo-role-m-${slot.slotId}`)?.addEventListener('click', () => {
          outpostDispatcher.setSlotRole(slot.slotId, 'miner');
          this._render();
        });
        // Role toggle L
        this._root.querySelector(`#ddo-role-l-${slot.slotId}`)?.addEventListener('click', () => {
          outpostDispatcher.setSlotRole(slot.slotId, 'logistics');
          this._render();
        });

        // Ore select (on occupied slots that are miners)
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
      const activeDrones = slots.filter(s => s.drone && slotRole(s) !== 'idle');
      const currentMiners = activeDrones.filter(s => slotRole(s) === 'miner').length;
      const targetMiners = Math.round(targetFraction * activeDrones.length);

      if (targetMiners > currentMiners) {
        // Shift one logi → miner
        const logiSlot = [...slots].reverse().find(s => s.drone && slotRole(s) === 'logistics');
        if (logiSlot) outpostDispatcher.setSlotRole(logiSlot.slotId, 'miner');
      } else if (targetMiners < currentMiners) {
        // Shift one miner → logi
        const minerSlot = [...slots].reverse().find(s => s.drone && slotRole(s) === 'miner');
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
