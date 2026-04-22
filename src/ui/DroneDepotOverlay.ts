import type { DroneDepot } from '@entities/DroneDepot';
import type { DroneSlotConfig } from '@services/OutpostDispatcher';
import type { OreType } from '@data/types';

const ROLE_OPTIONS: Array<{ value: DroneSlotConfig['role']; label: string }> = [
  { value: 'miner',    label: 'MINER' },
  { value: 'logistics', label: 'LOGISTICS' },
];

const ORE_OPTIONS: Array<{ value: OreType | 'any'; label: string }> = [
  { value: 'iron_ore',    label: 'IRON ORE' },
  { value: 'copper_ore',  label: 'COPPER ORE' },
  { value: 'any',         label: 'ANY' },
];

/**
 * DroneDepotOverlay — HTML overlay for configuring Drone Depot slot configs.
 * Opened when the player interacts with a built DroneDepot.
 * Follows the OutpostHud/FurnaceOverlay HTML overlay pattern.
 */
export class DroneDepotOverlay {
  private _depot: DroneDepot;
  private _root: HTMLElement | null = null;
  private _open = false;

  constructor(depot: DroneDepot) {
    this._depot = depot;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'drone-depot-overlay';
    this._root.style.cssText = [
      'position:absolute',
      'bottom:80px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(13,27,62,0.95)',
      'border:1px solid #6A4A8C',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:12px 16px',
      'min-width:380px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');

    parent.appendChild(this._root);
    this._render();
  }

  unmount(): void {
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
  }

  close(): void {
    this._open = false;
    if (this._root) this._root.style.display = 'none';
  }

  isOpen(): boolean {
    return this._open;
  }

  private _render(): void {
    if (!this._root) return;

    const slots = this._depot.getSlotConfigs();

    const selectStyle = [
      'font-family:monospace',
      'font-size:11px',
      'padding:3px 6px',
      'background:#0D1B3E',
      'border:1px solid #D4A843',
      'color:#D4A843',
      'cursor:pointer',
    ].join(';');

    let html = `
      <div style="font-size:15px;font-weight:bold;margin-bottom:10px;text-align:center;color:#D4A843;">DRONE DEPOT</div>
    `;

    for (const slot of slots) {
      const slotNum = parseInt(slot.slotId.replace('slot_', ''), 10) + 1;

      const roleOpts = ROLE_OPTIONS.map(o =>
        `<option value="${o.value}" ${slot.role === o.value ? 'selected' : ''}>${o.label}</option>`
      ).join('');

      const oreOpts = ORE_OPTIONS.map(o =>
        `<option value="${o.value}" ${slot.oreType === o.value ? 'selected' : ''}>${o.label}</option>`
      ).join('');

      const showOre = slot.role === 'miner';

      html += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px;border:1px solid #2A3A5A;">
          <span style="min-width:48px;opacity:0.7;">Slot ${slotNum}:</span>
          <select id="dd-role-${slot.slotId}" style="${selectStyle}">${roleOpts}</select>
          <select id="dd-ore-${slot.slotId}" style="${selectStyle};${showOre ? '' : 'visibility:hidden'}">${oreOpts}</select>
        </div>
      `;
    }

    html += `
      <div style="text-align:center;margin-top:6px;">
        <button id="dd-close-btn" style="font-family:monospace;font-size:11px;padding:4px 14px;border:1px solid #D4A843;background:transparent;color:#D4A843;cursor:pointer;">CLOSE</button>
      </div>
    `;

    this._root.innerHTML = html;

    // Wire event listeners after rendering
    for (const slot of slots) {
      const roleSelect = this._root.querySelector<HTMLSelectElement>(`#dd-role-${slot.slotId}`);
      const oreSelect  = this._root.querySelector<HTMLSelectElement>(`#dd-ore-${slot.slotId}`);

      roleSelect?.addEventListener('change', () => {
        const newRole = (roleSelect.value as DroneSlotConfig['role']);
        const newOre: OreType | 'any' = oreSelect ? (oreSelect.value as OreType | 'any') : slot.oreType;
        this._depot.setSlotConfig(slot.slotId, { slotId: slot.slotId, role: newRole, oreType: newOre });
        // Re-render to show/hide ore select
        this._render();
      });

      oreSelect?.addEventListener('change', () => {
        const newRole = roleSelect ? (roleSelect.value as DroneSlotConfig['role']) : slot.role;
        const newOre = (oreSelect.value as OreType | 'any');
        this._depot.setSlotConfig(slot.slotId, { slotId: slot.slotId, role: newRole, oreType: newOre });
      });
    }

    const closeBtn = this._root.querySelector<HTMLButtonElement>('#dd-close-btn');
    closeBtn?.addEventListener('click', () => this.close());
  }
}
