import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';
import type { Furnace, FurnaceRecipe } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';

export class FurnaceOverlay {
  private _furnace: Furnace;
  private _onInsert: () => void;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _pollId: ReturnType<typeof setInterval> | null = null;

  private _statusEl!: HTMLElement;
  private _progressFill!: HTMLElement;
  private _insertBtn!: HTMLButtonElement;
  private _ironBtn!: HTMLButtonElement;
  private _copperBtn!: HTMLButtonElement;
  private _noneBtn!: HTMLButtonElement;
  private _recipeDesc!: HTMLElement;
  private _cargoHint!: HTMLElement;

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
      'background:rgba(13,27,62,0.95)',
      'border:1px solid #D4A843',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:14px 18px',
      'min-width:340px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');

    this._root.innerHTML = `
      <div style="font-size:15px;font-weight:bold;text-align:center;margin-bottom:12px;letter-spacing:2px;">FURNACE</div>

      <div style="margin-bottom:10px;">
        <div style="font-size:10px;opacity:0.6;margin-bottom:5px;letter-spacing:1px;">SELECT RECIPE</div>
        <div style="display:flex;gap:6px;">
          <button id="furnace-btn-iron"   style="${this._btnStyle()}">IRON</button>
          <button id="furnace-btn-copper" style="${this._btnStyle()}">COPPER</button>
          <button id="furnace-btn-none"   style="${this._btnStyle()}">NONE</button>
        </div>
      </div>

      <div id="furnace-recipe-desc" style="font-size:11px;opacity:0.6;margin-bottom:12px;min-height:16px;"></div>

      <div style="margin-bottom:12px;">
        <div style="background:#0A1525;border:1px solid #1E2E4A;height:10px;border-radius:2px;overflow:hidden;margin-bottom:5px;">
          <div id="furnace-progress-fill" style="height:100%;width:0%;background:#D4A843;border-radius:2px;transition:width 0.15s linear;"></div>
        </div>
        <div id="furnace-status" style="text-align:center;font-size:11px;opacity:0.8;">IDLE</div>
      </div>

      <div style="text-align:center;">
        <button id="furnace-insert-btn" style="${this._btnStyle()}">INSERT ORE</button>
        <div id="furnace-cargo-hint" style="font-size:10px;opacity:0.5;margin-top:5px;min-height:14px;"></div>
      </div>
    `;

    parent.appendChild(this._root);

    this._statusEl     = this._root.querySelector('#furnace-status')!       as HTMLElement;
    this._progressFill = this._root.querySelector('#furnace-progress-fill')! as HTMLElement;
    this._insertBtn    = this._root.querySelector('#furnace-insert-btn')!   as HTMLButtonElement;
    this._ironBtn      = this._root.querySelector('#furnace-btn-iron')!     as HTMLButtonElement;
    this._copperBtn    = this._root.querySelector('#furnace-btn-copper')!   as HTMLButtonElement;
    this._noneBtn      = this._root.querySelector('#furnace-btn-none')!     as HTMLButtonElement;
    this._recipeDesc   = this._root.querySelector('#furnace-recipe-desc')!  as HTMLElement;
    this._cargoHint    = this._root.querySelector('#furnace-cargo-hint')!   as HTMLElement;

    this._ironBtn.addEventListener('click', () => {
      this._furnace.setRecipe('iron');
      this.refresh();
    });
    this._copperBtn.addEventListener('click', () => {
      this._furnace.setRecipe('copper');
      this.refresh();
    });
    this._noneBtn.addEventListener('click', () => {
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
    this._stopPoll();
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
      this._startPoll();
    }
  }

  close(): void {
    this._stopPoll();
    this._open = false;
    if (this._root) this._root.style.display = 'none';
  }

  isOpen(): boolean { return this._open; }

  refresh(): void {
    if (!this._root) return;

    const recipe   = this._furnace.recipe;
    const plantState = this._furnace.getPlantState();
    const progress = this._furnace.getBatchProgress();
    const isLoaded = this._furnace.isLoaded();

    // Recipe buttons — highlight active selection.
    this._ironBtn.setAttribute('style',   recipe === 'iron'   ? this._btnStyle(true) : this._btnStyle());
    this._copperBtn.setAttribute('style', recipe === 'copper' ? this._btnStyle(true) : this._btnStyle());
    this._noneBtn.setAttribute('style',   recipe === 'off'    ? this._btnStyle(true) : this._btnStyle());

    // Recipe description line.
    if (recipe === 'iron') {
      this._recipeDesc.textContent = '2 iron ore → 1 iron bar · 6s per batch';
    } else if (recipe === 'copper') {
      this._recipeDesc.textContent = '2 copper ore → 1 copper bar · 8s per batch';
    } else {
      this._recipeDesc.textContent = 'No recipe selected';
    }

    // Progress bar.
    this._progressFill.style.width = `${Math.round(progress * 100)}%`;

    // Status text.
    if (recipe === 'off') {
      this._statusEl.textContent = 'Select a recipe above to start';
    } else if (plantState === 'NO_POWER') {
      this._statusEl.textContent = 'NO POWER';
    } else if (isLoaded) {
      this._statusEl.textContent = `PROCESSING... ${Math.round(progress * 100)}%`;
    } else {
      this._statusEl.textContent = 'IDLE — insert ore to begin';
    }

    // Insert button label and enabled state.
    const r = recipe !== 'off'
      ? FURNACE_RECIPES[recipe as Exclude<FurnaceRecipe, 'off'>]
      : null;

    const oreName  = r ? r.input.replace(/_/g, ' ') : '';
    const inCargo  = r ? inventory.getByType(r.input) : 0;
    const canInsert = r !== null && inCargo > 0 && !isLoaded;

    this._insertBtn.textContent = r
      ? `INSERT ${r.input.replace(/_/g, ' ').toUpperCase()}`
      : 'INSERT ORE';
    this._insertBtn.disabled = !canInsert;
    this._insertBtn.style.opacity = canInsert ? '1' : '0.4';

    if (isLoaded) {
      this._cargoHint.textContent = 'Processing batch — wait for completion';
    } else if (!r) {
      this._cargoHint.textContent = '';
    } else if (inCargo > 0) {
      this._cargoHint.textContent = `Cargo: ${inCargo} ${oreName}`;
    } else {
      this._cargoHint.textContent = `No ${oreName} in cargo`;
    }
  }

  private _startPoll(): void {
    if (this._pollId !== null) return;
    this._pollId = setInterval(() => {
      if (this._open) this.refresh();
    }, 100);
  }

  private _stopPoll(): void {
    if (this._pollId !== null) {
      clearInterval(this._pollId);
      this._pollId = null;
    }
  }

  private _btnStyle(active = false): string {
    return [
      'font-family:monospace',
      'font-size:11px',
      'padding:4px 10px',
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
