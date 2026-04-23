import type { DroneDepot } from '@entities/DroneDepot';
import type { DroneBase } from '@entities/DroneBase';
import type { DroneBaySlot } from '@services/OutpostDispatcher';
import type { OreType } from '@data/types';
import type { Container } from 'pixi.js';
import { gameState } from '@services/GameState';

const ORE_OPTIONS: Array<{ value: OreType | 'any'; label: string }> = [
  { value: 'iron_ore',   label: 'IRON ORE' },
  { value: 'copper_ore', label: 'COPPER ORE' },
  { value: 'any',        label: 'ANY' },
];

const DRONE_SPECS = [
  { type: 'scout' as const, label: 'MINING DRONE', cost: 25  },
  { type: 'heavy' as const, label: 'HEAVY MINER',  cost: 150 },
  { type: 'refinery' as const, label: 'LOGISTICS DRONE', cost: 75 },
];

export class DroneDepotOverlay {
  private _depot: DroneDepot;
  private _getWorldContainer: () => Container;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _pollHandle: ReturnType<typeof setInterval> | null = null;

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
      'background:rgba(13,27,62,0.97)',
      'border:1px solid #6A4A8C',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:16px 20px',
      'min-width:440px',
      'max-width:520px',
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
      if (this._open) this._updatePoll();
    }, 250);
  }

  private _updatePoll(): void {
    if (!this._root) return;
    const creditsEl = this._root.querySelector('#ddo-credits');
    if (creditsEl) creditsEl.textContent = `${gameState.credits.toLocaleString()} CR`;

    const slots = this._depot.getBaySlots();
    for (const slot of slots) {
      if (slot.drone) {
        const { dotColor, label } = this._droneStatus(slot.drone);
        const dotEl = this._root.querySelector(`#ddo-dot-${slot.slotId}`) as HTMLElement;
        const lblEl = this._root.querySelector(`#ddo-lbl-${slot.slotId}`) as HTMLElement;
        if (dotEl) dotEl.style.color = dotColor;
        if (lblEl) lblEl.textContent = label;
      }
    }
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

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2A3A5A;padding-bottom:10px;margin-bottom:4px;">
        <span style="font-size:15px;font-weight:bold;letter-spacing:1px;">DRONE DEPOT</span>
        <span id="ddo-credits" style="color:#00B8D4;font-size:12px;">${credits.toLocaleString()} CR</span>
      </div>
    `;

    for (let i = 0; i < slots.length; i++) {
      html += this._renderSlot(slots[i], i + 1);
    }

    html += `
      <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #2A3A5A;">
        <button id="ddo-close" style="${this._btnStyle('#D4A843')}">CLOSE</button>
      </div>
    `;

    this._root.innerHTML = html;
    this._wireEvents(slots);
  }

  private _renderSlot(slot: DroneBaySlot, num: number): string {
    const wrap = 'border-top:1px solid #2A3A5A;padding:12px 0 8px;';

    if (!slot.drone) {
      const btns = DRONE_SPECS.map(spec => {
        const canAfford = gameState.credits >= spec.cost;
        const style = this._btnStyle(canAfford ? '#00B8D4' : '#555');
        const disabled = canAfford ? '' : 'disabled';
        return `<button id="ddo-buy-${slot.slotId}-${spec.type}" ${disabled} style="${style}">${spec.label} — ${spec.cost} CR</button>`;
      }).join(' ');

      return `
        <div style="${wrap}">
          <div style="font-size:11px;opacity:0.45;margin-bottom:8px;letter-spacing:1px;">SLOT ${num} — EMPTY</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${btns}</div>
        </div>
      `;
    }

    const { dotColor, label } = this._droneStatus(slot.drone);
    const droneName = slot.droneType === 'scout' ? 'Mining Drone' : slot.droneType === 'refinery' ? 'Logistics Drone' : 'Heavy Miner';

    const oreOpts = ORE_OPTIONS.map(o =>
      `<option value="${o.value}" ${slot.oreType === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    const selectStyle = [
      'font-family:monospace',
      'font-size:11px',
      'padding:3px 6px',
      'background:#0D1B3E',
      'border:1px solid #D4A843',
      'color:#D4A843',
      'cursor:pointer',
    ].join(';');

    const selectHtml = slot.droneType !== 'refinery'
      ? `<select id="ddo-ore-${slot.slotId}" style="${selectStyle}">${oreOpts}</select>`
      : `<span style="font-size:10px;opacity:0.5;margin-right:10px;">AUTO LOGISTICS</span>`;

    return `
      <div style="${wrap}">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;opacity:0.45;min-width:52px;letter-spacing:1px;">SLOT ${num}</span>
          <span id="ddo-dot-${slot.slotId}" style="color:${dotColor};font-size:16px;line-height:1;">●</span>
          <span id="ddo-lbl-${slot.slotId}" style="flex:1;font-size:12px;font-weight:bold;">${label}</span>
          ${selectHtml}
          <button id="ddo-release-${slot.slotId}" style="${this._btnStyle('#FF5252')}">RELEASE</button>
        </div>
        <div style="font-size:10px;opacity:0.4;margin-top:5px;padding-left:60px;">${droneName}</div>
      </div>
    `;
  }

  private _droneStatus(drone: DroneBase): { dotColor: string; label: string } {
    const tasks = drone.getTasks();
    const task = tasks[0];
    if (drone.state === 'IDLE' || !task) {
      return { dotColor: '#4CAF50', label: 'IDLE' };
    }
    if (drone.state === 'MOVING_TO_TARGET') {
      return task.type === 'MINE'
        ? { dotColor: '#FFC107', label: 'EN ROUTE' }
        : { dotColor: '#00B8D4', label: 'RETURNING' };
    }
    if (drone.state === 'EXECUTING') {
      return task.type === 'MINE'
        ? { dotColor: '#FF6D00', label: 'MINING' }
        : { dotColor: '#00B8D4', label: 'DEPOSITING' };
    }
    return { dotColor: '#FFC107', label: 'BUSY' };
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

    this._root.querySelector('#ddo-close')?.addEventListener('click', () => this.close());

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
        const oreSelect = this._root.querySelector<HTMLSelectElement>(`#ddo-ore-${slot.slotId}`);
        oreSelect?.addEventListener('change', () => {
          this._depot.setSlotOreType(slot.slotId, oreSelect.value as OreType | 'any');
        });

        const releaseBtn = this._root.querySelector(`#ddo-release-${slot.slotId}`);
        releaseBtn?.addEventListener('click', () => {
          this._depot.releaseDrone(slot.slotId);
          this._render();
        });
      }
    }
  }
}
