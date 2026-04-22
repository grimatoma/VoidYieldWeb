import type { StorageDepot } from '@entities/StorageDepot';
import type { PlacedEntry } from '@services/BuildGrid';

export interface BuildMenuCallbacks {
  getStorage(): StorageDepot | null;
  onBuildStart(buildingType: string): void;  // enter placement mode
  onMoveStart(buildingId: string): void;     // pick up existing building
  getPlacedBuildings(): PlacedEntry[];
}

interface BuildingDef {
  type: string;
  label: string;
  footprintLabel: string;
  ironBarCost: number;
  copperBarCost: number;
}

const BUILDABLE: BuildingDef[] = [
  {
    type: 'marketplace',
    label: 'Marketplace',
    footprintLabel: '2×1',
    ironBarCost: 5,
    copperBarCost: 3,
  },
  {
    type: 'drone_depot',
    label: 'Drone Depot',
    footprintLabel: '2×2',
    ironBarCost: 10,
    copperBarCost: 5,
  },
];

/**
 * BuildMenuOverlay — HTML overlay panel opened/closed by the build_menu action (N key).
 * Shows stored bar counts and lets the player start placement or move existing buildings.
 * Mounts into #ui-layer (same pattern as OutpostHud).
 */
export class BuildMenuOverlay {
  private _root: HTMLElement | null = null;
  private _open = false;
  private readonly _callbacks: BuildMenuCallbacks;

  constructor(callbacks: BuildMenuCallbacks) {
    this._callbacks = callbacks;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'build-menu-overlay';
    this._root.style.cssText = [
      'position:fixed',
      'top:50%',
      'left:50%',
      'transform:translate(-50%, -50%)',
      'background:#0D1B3E',
      'border:1px solid #2A3A5A',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:12px 16px',
      'min-width:260px',
      'z-index:100',
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

  refresh(): void {
    this._render();
  }

  isOpen(): boolean {
    return this._open;
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
    if (this._root) {
      this._root.style.display = 'none';
    }
  }

  toggle(): void {
    if (this._open) {
      this.close();
    } else {
      this.open();
    }
  }

  private _render(): void {
    if (!this._root) return;

    const depot = this._callbacks.getStorage();
    const ironBars = depot ? depot.getBarCount('iron_bar') : 0;
    const copperBars = depot ? depot.getBarCount('copper_bar') : 0;
    const placed = this._callbacks.getPlacedBuildings();

    let html = `
      <div style="font-size:11px;opacity:0.7;margin-bottom:8px;letter-spacing:1px;">BUILD MENU</div>
      <div style="margin-bottom:12px;font-size:12px;">
        IRON BAR: <strong>${ironBars}</strong>&nbsp;&nbsp;COPPER BAR: <strong>${copperBars}</strong>
      </div>
      <div style="font-size:11px;opacity:0.7;margin-bottom:6px;letter-spacing:1px;">BUILDABLE</div>
    `;

    for (const def of BUILDABLE) {
      const canAfford =
        ironBars >= def.ironBarCost && copperBars >= def.copperBarCost;
      const disabledStyle = canAfford
        ? 'cursor:pointer;background:#1A3060;border:1px solid #D4A843;color:#D4A843;'
        : 'cursor:not-allowed;background:#1A1A2A;border:1px solid #444;color:#666;';

      html += `
        <div style="margin-bottom:10px;padding:8px;border:1px solid #2A3A5A;">
          <div style="margin-bottom:4px;">
            ${def.label}
            <span style="opacity:0.6;font-size:11px;">[${def.footprintLabel}]</span>
          </div>
          <div style="font-size:11px;opacity:0.7;margin-bottom:6px;">
            ${def.ironBarCost} IRON BAR + ${def.copperBarCost} COPPER BAR
          </div>
          <button
            data-build-type="${def.type}"
            ${canAfford ? '' : 'disabled'}
            style="font-family:monospace;font-size:11px;padding:3px 8px;${disabledStyle}"
          >BUILD ${def.label.toUpperCase()}</button>
        </div>
      `;
    }

    if (placed.length > 0) {
      html += `<div style="font-size:11px;opacity:0.7;margin-top:8px;margin-bottom:6px;letter-spacing:1px;">PLACED BUILDINGS</div>`;
      for (const entry of placed) {
        html += `
          <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <span>${entry.buildingType.toUpperCase()} [${entry.footprint.rows}×${entry.footprint.cols}]</span>
            <button
              data-move-id="${entry.buildingId}"
              style="font-family:monospace;font-size:11px;padding:3px 8px;cursor:pointer;background:#1A3060;border:1px solid #D4A843;color:#D4A843;margin-left:8px;"
            >MOVE</button>
          </div>
        `;
      }
    }

    this._root.innerHTML = html;

    // Attach build button listeners
    this._root.querySelectorAll<HTMLButtonElement>('button[data-build-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const buildType = btn.getAttribute('data-build-type');
        if (buildType && !btn.disabled) {
          this._callbacks.onBuildStart(buildType);
          this.close();
        }
      });
    });

    // Attach move button listeners
    this._root.querySelectorAll<HTMLButtonElement>('button[data-move-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const buildingId = btn.getAttribute('data-move-id');
        if (buildingId) {
          this._callbacks.onMoveStart(buildingId);
          this.close();
        }
      });
    });
  }
}
