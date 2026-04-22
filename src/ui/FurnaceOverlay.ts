import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';
import type { Furnace, FurnaceRecipe } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';

/**
 * FurnaceOverlay — small HTML overlay for the Furnace.
 * Mounts into #ui-layer (same container as OutpostHud and other panels).
 * Opens/closes on demand; refreshes on furnace:state-changed and inventory:changed.
 */
export class FurnaceOverlay {
  private _furnace: Furnace;
  private _onInsert: () => void;
  private _root: HTMLElement | null = null;
  private _open = false;

  private _statusEl!: HTMLElement;
  private _insertBtn!: HTMLButtonElement;
  private _ironBtn!: HTMLButtonElement;
  private _copperBtn!: HTMLButtonElement;
  private _offBtn!: HTMLButtonElement;

  constructor(furnace: Furnace, onInsert: () => void) {
    this._furnace = furnace;
    this._onInsert = onInsert;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'furnace-overlay';
    this._root.style.cssText = [
      'position:absolute',
      'bottom:80px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(13,27,62,0.92)',
      'border:1px solid #D4A843',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:12px 16px',
      'min-width:320px',
      'z-index:20',
      'display:none',
    ].join(';');

    this._root.innerHTML = `
      <div style="font-size:15px;font-weight:bold;margin-bottom:8px;text-align:center;">FURNACE</div>
      <div id="furnace-recipe-row" style="display:flex;gap:6px;margin-bottom:8px;justify-content:center;">
        <button id="furnace-btn-iron"   style="${this._btnStyle()}">IRON (2 ore → 1 bar, 6s)</button>
        <button id="furnace-btn-copper" style="${this._btnStyle()}">COPPER (2 ore → 1 bar, 8s)</button>
        <button id="furnace-btn-off"    style="${this._btnStyle()}">OFF</button>
      </div>
      <div id="furnace-status" style="text-align:center;margin-bottom:8px;">IDLE</div>
      <div style="text-align:center;">
        <button id="furnace-insert-btn" style="${this._btnStyle()}">INSERT ORE</button>
      </div>
    `;

    parent.appendChild(this._root);

    this._statusEl  = this._root.querySelector('#furnace-status')!     as HTMLElement;
    this._insertBtn = this._root.querySelector('#furnace-insert-btn')! as HTMLButtonElement;
    this._ironBtn   = this._root.querySelector('#furnace-btn-iron')!   as HTMLButtonElement;
    this._copperBtn = this._root.querySelector('#furnace-btn-copper')! as HTMLButtonElement;
    this._offBtn    = this._root.querySelector('#furnace-btn-off')!    as HTMLButtonElement;

    this._ironBtn.addEventListener('click', () => {
      this._furnace.setRecipe('iron');
      this.refresh();
    });
    this._copperBtn.addEventListener('click', () => {
      this._furnace.setRecipe('copper');
      this.refresh();
    });
    this._offBtn.addEventListener('click', () => {
      this._furnace.setRecipe('off');
      this.refresh();
    });
    this._insertBtn.addEventListener('click', () => {
      this._onInsert();
      this.refresh();
    });

    EventBus.on('furnace:state-changed', this._onStateChanged);
    EventBus.on('inventory:changed', this._onInventoryChanged);
  }

  unmount(): void {
    EventBus.off('furnace:state-changed', this._onStateChanged);
    EventBus.off('inventory:changed', this._onInventoryChanged);
    this._root?.remove();
    this._root = null;
    this._open = false;
  }

  open(): void {
    this._open = true;
    if (this._root) {
      this._root.style.display = 'block';
      this.refresh();
    }
  }

  close(): void {
    this._open = false;
    if (this._root) this._root.style.display = 'none';
  }

  isOpen(): boolean { return this._open; }

  /** Re-render the entire overlay from current furnace/inventory state. */
  refresh(): void {
    if (!this._root) return;

    const recipe = this._furnace.recipe;
    const plantState = this._furnace.getPlantState();

    // Highlight the active recipe button.
    const activeStyle = this._btnStyle(true);
    const inactiveStyle = this._btnStyle(false);
    this._ironBtn.setAttribute('style', recipe === 'iron'   ? activeStyle : inactiveStyle);
    this._copperBtn.setAttribute('style', recipe === 'copper' ? activeStyle : inactiveStyle);
    this._offBtn.setAttribute('style', recipe === 'off'     ? activeStyle : inactiveStyle);

    // Status line.
    if (recipe === 'off' || plantState === 'OFF') {
      this._statusEl.textContent = 'OFF';
    } else if (plantState === 'RUNNING') {
      const progress = Math.round(this._furnace.getBatchProgress() * 100);
      this._statusEl.textContent = `RUNNING... ${progress}%`;
    } else if (plantState === 'STALLED') {
      this._statusEl.textContent = 'IDLE';
    } else {
      this._statusEl.textContent = plantState;
    }

    // Insert button — disabled if no matching ore in inventory.
    let canInsert = false;
    if (recipe !== 'off') {
      const r = FURNACE_RECIPES[recipe as Exclude<FurnaceRecipe, 'off'>];
      canInsert = inventory.getByType(r.input) > 0;
    }
    this._insertBtn.disabled = !canInsert;
    this._insertBtn.style.opacity = canInsert ? '1' : '0.4';
  }

  private _btnStyle(active = false): string {
    return [
      'font-family:monospace',
      'font-size:11px',
      'padding:4px 8px',
      'border:1px solid #D4A843',
      'cursor:pointer',
      active
        ? 'background:#D4A843;color:#0D1B3E;'
        : 'background:transparent;color:#D4A843;',
    ].join(';');
  }

  private _onStateChanged = (_state: 'idle' | 'running' | 'output-ready'): void => {
    if (this._open) this.refresh();
  };

  private _onInventoryChanged = (): void => {
    if (this._open) this.refresh();
  };
}
