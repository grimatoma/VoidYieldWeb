import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';
import type { Furnace, FurnaceRecipe } from '@entities/Furnace';
import { FURNACE_RECIPES } from '@entities/Furnace';
import { SELL_PRICES } from '@services/MarketplaceService';
import type { OreType } from '@data/types';

export class FurnaceOverlay {
  private _furnace: Furnace;
  private _onInsert: () => void;
  private _getStorageOre: ((ore: OreType) => number) | null = null;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _pollId: ReturnType<typeof setInterval> | null = null;

  // Header
  private _statusBadgeEl!: HTMLElement;

  // Recipe section
  private _ironBtn!: HTMLButtonElement;
  private _copperBtn!: HTMLButtonElement;
  private _noneBtn!: HTMLButtonElement;
  private _activeRecipeEl!: HTMLElement;
  private _recipeIOEl!: HTMLElement;

  // Throughput section
  private _throughputSectionEl!: HTMLElement;
  private _batchTimeEl!: HTMLElement;
  private _outputRateEl!: HTMLElement;
  private _inputRateEl!: HTMLElement;

  // Quality influence section
  private _efficiencyBarEl!: HTMLElement;
  private _efficiencyPctEl!: HTMLElement;

  // Value multiplier section
  private _valueSectionEl!: HTMLElement;
  private _rawOreValEl!: HTMLElement;
  private _ingotValEl!: HTMLElement;
  private _multiplierEl!: HTMLElement;

  // I/O buffers & buttons
  private _inBufEl!: HTMLElement;
  private _outBufEl!: HTMLElement;
  private _insertBtn!: HTMLButtonElement;
  private _extractBtn!: HTMLButtonElement;
  private _cargoHintEl!: HTMLElement;

  constructor(furnace: Furnace, onInsert: () => void, getStorageOre?: (ore: OreType) => number) {
    this._furnace = furnace;
    this._onInsert = onInsert;
    this._getStorageOre = getStorageOre ?? null;
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'furnace-overlay';
    this._root.style.cssText = [
      'position:absolute',
      'top:50%',
      'right:10px',
      'transform:translateY(-50%)',
      'width:320px',
      'max-height:90vh',
      'overflow-y:auto',
      'background:rgba(13,27,62,0.97)',
      'border:1px solid #D4A843',
      'color:#E8E4D0',
      'font-family:monospace',
      'font-size:12px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
      'box-sizing:border-box',
    ].join(';');

    this._root.innerHTML = `
      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px 8px;border-bottom:1px solid #1E2E4A;">
        <span style="font-size:14px;font-weight:bold;color:#D4A843;letter-spacing:2px;">PROCESSING PLANT</span>
        <span id="furnace-status-badge" style="font-size:11px;display:flex;align-items:center;gap:5px;"></span>
      </div>

      <!-- RECIPE SECTION -->
      <div style="padding:10px 14px 0;">
        <div id="furnace-active-recipe" style="color:#D4A843;font-size:12px;margin-bottom:8px;min-height:16px;"></div>

        <div style="font-size:10px;color:#8a9ab0;letter-spacing:1px;margin-bottom:6px;">RECIPE</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button id="furnace-btn-iron"   style="${this._btnStyle()}">IRON</button>
          <button id="furnace-btn-copper" style="${this._btnStyle()}">COPPER</button>
          <button id="furnace-btn-none"   style="${this._btnStyle()}">NONE</button>
        </div>
        <div id="furnace-recipe-io" style="font-size:11px;color:#8a9ab0;min-height:32px;line-height:1.6;"></div>
      </div>

      <!-- THROUGHPUT SECTION -->
      <div id="furnace-throughput-section" style="padding:8px 14px 0;border-top:1px solid #1E2E4A;margin-top:8px;">
        <div style="font-size:10px;color:#8a9ab0;letter-spacing:1px;margin-bottom:6px;">THROUGHPUT</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span style="color:#8a9ab0;">Batch time:</span>
          <span id="furnace-batch-time" style="color:#E8E4D0;">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span style="color:#8a9ab0;">Output rate:</span>
          <span id="furnace-output-rate" style="color:#4CAF50;">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span style="color:#8a9ab0;">Input rate:</span>
          <span id="furnace-input-rate" style="color:#FFC107;">—</span>
        </div>
      </div>

      <!-- QUALITY INFLUENCE SECTION -->
      <div style="padding:8px 14px 0;border-top:1px solid #1E2E4A;margin-top:8px;">
        <div style="font-size:10px;color:#8a9ab0;letter-spacing:1px;margin-bottom:6px;">QUALITY INFLUENCE</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span style="color:#8a9ab0;">Ore ER avg:</span>
          <span style="color:#E8E4D0;">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px;">
          <span style="color:#8a9ab0;">Ingot quality:</span>
          <span style="color:#E8E4D0;">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
          <span style="color:#8a9ab0;">Efficiency:</span>
          <span style="display:flex;align-items:center;gap:6px;">
            <span id="furnace-efficiency-bar" style="color:#D4A843;font-size:13px;letter-spacing:-1px;"></span>
            <span id="furnace-efficiency-pct" style="color:#E8E4D0;min-width:32px;text-align:right;"></span>
          </span>
        </div>
      </div>

      <!-- VALUE MULTIPLIER SECTION -->
      <div id="furnace-value-section" style="padding:8px 14px 0;border-top:1px solid #1E2E4A;margin-top:8px;">
        <div style="font-size:10px;color:#8a9ab0;letter-spacing:1px;margin-bottom:6px;">VALUE MULTIPLIER</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span id="furnace-raw-ore-label" style="color:#8a9ab0;">Raw ore:</span>
          <span id="furnace-raw-ore-val" style="color:#E8E4D0;"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span id="furnace-ingot-label" style="color:#8a9ab0;">Ingot:</span>
          <span id="furnace-ingot-val" style="color:#E8E4D0;"></span>
        </div>
        <div style="text-align:right;font-size:13px;color:#D4A843;font-weight:bold;">
          <span id="furnace-multiplier"></span>
        </div>
      </div>

      <!-- I/O BUFFER ROW -->
      <div style="padding:8px 14px 0;border-top:1px solid #1E2E4A;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px;">
          <span style="color:#8a9ab0;">IN: <span id="furnace-in-buf" style="color:#D4A843;font-weight:bold;">0</span></span>
          <span style="color:#8a9ab0;">OUT: <span id="furnace-out-buf" style="color:#4CAF50;font-weight:bold;">0</span></span>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <button id="furnace-insert-btn"  style="${this._btnStyle()};flex:1;">INSERT ORE</button>
          <button id="furnace-extract-btn" style="${this._btnStyle()};flex:1;">EXTRACT</button>
        </div>
        <div id="furnace-cargo-hint" style="font-size:10px;color:#555555;min-height:14px;text-align:center;padding-bottom:8px;"></div>
      </div>

      <!-- BOTTOM HINT -->
      <div style="padding:6px 14px 8px;border-top:1px solid #1E2E4A;text-align:center;font-size:10px;color:#555555;letter-spacing:1px;">
        [E] OPEN PLANT · [O] PRODUCTION
      </div>
    `;

    parent.appendChild(this._root);

    // Header
    this._statusBadgeEl   = this._root.querySelector('#furnace-status-badge')!   as HTMLElement;

    // Recipe
    this._ironBtn          = this._root.querySelector('#furnace-btn-iron')!       as HTMLButtonElement;
    this._copperBtn        = this._root.querySelector('#furnace-btn-copper')!     as HTMLButtonElement;
    this._noneBtn          = this._root.querySelector('#furnace-btn-none')!       as HTMLButtonElement;
    this._activeRecipeEl   = this._root.querySelector('#furnace-active-recipe')!  as HTMLElement;
    this._recipeIOEl       = this._root.querySelector('#furnace-recipe-io')!      as HTMLElement;

    // Throughput
    this._throughputSectionEl = this._root.querySelector('#furnace-throughput-section')! as HTMLElement;
    this._batchTimeEl      = this._root.querySelector('#furnace-batch-time')!     as HTMLElement;
    this._outputRateEl     = this._root.querySelector('#furnace-output-rate')!    as HTMLElement;
    this._inputRateEl      = this._root.querySelector('#furnace-input-rate')!     as HTMLElement;

    // Quality
    this._efficiencyBarEl  = this._root.querySelector('#furnace-efficiency-bar')! as HTMLElement;
    this._efficiencyPctEl  = this._root.querySelector('#furnace-efficiency-pct')! as HTMLElement;

    // Value multiplier
    this._valueSectionEl   = this._root.querySelector('#furnace-value-section')!  as HTMLElement;
    this._rawOreValEl      = this._root.querySelector('#furnace-raw-ore-val')!    as HTMLElement;
    this._ingotValEl       = this._root.querySelector('#furnace-ingot-val')!      as HTMLElement;
    this._multiplierEl     = this._root.querySelector('#furnace-multiplier')!     as HTMLElement;

    // I/O & buttons
    this._inBufEl          = this._root.querySelector('#furnace-in-buf')!         as HTMLElement;
    this._outBufEl         = this._root.querySelector('#furnace-out-buf')!        as HTMLElement;
    this._insertBtn        = this._root.querySelector('#furnace-insert-btn')!     as HTMLButtonElement;
    this._extractBtn       = this._root.querySelector('#furnace-extract-btn')!    as HTMLButtonElement;
    this._cargoHintEl      = this._root.querySelector('#furnace-cargo-hint')!     as HTMLElement;

    // Wire up buttons
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
    this._extractBtn.addEventListener('click', () => {
      this._furnace.takeProducts();
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

    const recipe      = this._furnace.recipe;
    const plantState  = this._furnace.getPlantState();
    const progress    = this._furnace.getBatchProgress();
    const isLoaded    = this._furnace.isLoaded();
    const plant       = this._furnace.plant;

    // ── Header: status badge ─────────────────────────────────────────────────
    const stateUpper = plantState.toUpperCase();
    let badgeColor: string;
    let badgeLabel: string;
    if (stateUpper === 'RUNNING') {
      badgeColor = '#4CAF50';
      badgeLabel = 'RUNNING';
    } else if (stateUpper === 'STALLED') {
      badgeColor = '#FFC107';
      badgeLabel = 'STALLED';
    } else {
      badgeColor = '#555555';
      badgeLabel = recipe === 'off' ? 'IDLE' : stateUpper;
    }
    this._statusBadgeEl.innerHTML =
      `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${badgeColor};"></span>` +
      `<span style="color:${badgeColor};font-size:11px;">${badgeLabel}</span>`;

    // ── Recipe section ───────────────────────────────────────────────────────
    this._ironBtn.setAttribute('style',   recipe === 'iron'   ? this._btnStyle(true) : this._btnStyle());
    this._copperBtn.setAttribute('style', recipe === 'copper' ? this._btnStyle(true) : this._btnStyle());
    this._noneBtn.setAttribute('style',   recipe === 'off'    ? this._btnStyle(true) : this._btnStyle());

    if (recipe === 'iron') {
      this._activeRecipeEl.textContent = 'Active Recipe: Iron Ingot';
    } else if (recipe === 'copper') {
      this._activeRecipeEl.textContent = 'Active Recipe: Copper Ingot';
    } else {
      this._activeRecipeEl.textContent = 'Active Recipe: None';
    }

    const r = recipe !== 'off'
      ? FURNACE_RECIPES[recipe as Exclude<FurnaceRecipe, 'off'>]
      : null;

    if (r) {
      const oreLabel = r.input.replace(/_/g, ' ');
      const barLabel = r.output.replace(/_/g, ' ');
      this._recipeIOEl.innerHTML =
        `<div>INPUT:&nbsp;&nbsp;<span style="color:#D4A843;">⬡ ${oreLabel}</span></div>` +
        `<div>OUTPUT: <span style="color:#D4A843;">▭ ${barLabel}</span></div>`;
    } else {
      this._recipeIOEl.innerHTML = '';
    }

    // ── Throughput section ───────────────────────────────────────────────────
    if (r) {
      this._throughputSectionEl.style.display = 'block';
      this._batchTimeEl.textContent  = `${r.batchSec.toFixed(1)}s`;
      this._outputRateEl.textContent = `+${((60 / r.batchSec) * r.outputQty).toFixed(1)} bars/min`;
      this._inputRateEl.textContent  = `−${((60 / r.batchSec) * r.inputQty).toFixed(1)} ore/min`;
    } else {
      this._throughputSectionEl.style.display = 'none';
    }

    // ── Quality influence section ────────────────────────────────────────────
    // Efficiency bar: use batch progress when RUNNING, static 70% otherwise
    const effPct = stateUpper === 'RUNNING' ? Math.round(progress * 100) : 70;
    const filledCells = Math.round(effPct / 10);
    this._efficiencyBarEl.textContent =
      '█'.repeat(filledCells) + '░'.repeat(10 - filledCells);
    this._efficiencyPctEl.textContent = `${effPct}%`;

    // ── Value multiplier section ─────────────────────────────────────────────
    if (r) {
      const rawPrice = SELL_PRICES[r.input] ?? 0;
      const ingotPrice = SELL_PRICES[r.output] ?? 0;
      if (rawPrice > 0 && ingotPrice > 0) {
        this._valueSectionEl.style.display = 'block';
        const oreLabel  = r.input.replace(/_/g, ' ');
        const barLabel  = r.output.replace(/_/g, ' ');
        this._rawOreValEl.textContent  = `${rawPrice} CR/unit`;
        this._ingotValEl.textContent   = `${ingotPrice} CR/unit`;
        this._multiplierEl.textContent = `×${(ingotPrice / rawPrice).toFixed(1)}`;
        // Update the labels to show the actual ore/bar names
        const rawLabel  = this._valueSectionEl.querySelector('#furnace-raw-ore-label') as HTMLElement | null;
        const ingLabel  = this._valueSectionEl.querySelector('#furnace-ingot-label')   as HTMLElement | null;
        if (rawLabel)  rawLabel.textContent  = `${oreLabel}:`;
        if (ingLabel)  ingLabel.textContent  = `${barLabel}:`;
      } else {
        this._valueSectionEl.style.display = 'none';
      }
    } else {
      this._valueSectionEl.style.display = 'none';
    }

    // ── I/O buffer readouts ──────────────────────────────────────────────────
    const maxIn  = plant.schematic.inputQty * 10;
    const maxOut = plant.schematic.outputQty * 10;
    this._inBufEl.textContent  = `${plant.inputBuffer}/${maxIn}`;
    this._outBufEl.textContent = `${plant.outputBuffer}/${maxOut}`;

    // ── Insert button ────────────────────────────────────────────────────────
    const oreName    = r ? r.input.replace(/_/g, ' ') : '';
    const inCargo    = r ? inventory.getByType(r.input) : 0;
    const inStorage  = r && this._getStorageOre ? (this._getStorageOre(r.input) ?? 0) : 0;
    const canInsert  = r !== null && (inCargo > 0 || inStorage > 0) && !isLoaded;

    this._insertBtn.textContent = r
      ? `INSERT ${r.input.replace(/_/g, ' ').toUpperCase()}`
      : 'INSERT ORE';
    this._insertBtn.disabled     = !canInsert;
    this._insertBtn.style.opacity = canInsert ? '1' : '0.4';

    // ── Extract button ───────────────────────────────────────────────────────
    const canExtract = plant.outputBuffer > 0;
    this._extractBtn.textContent = r
      ? `TAKE ${r.output.replace(/_/g, ' ').toUpperCase()}`
      : 'EXTRACT';
    this._extractBtn.disabled    = !canExtract;
    this._extractBtn.style.display = canExtract ? 'inline-block' : 'none';

    // ── Cargo hint ───────────────────────────────────────────────────────────
    if (isLoaded) {
      this._cargoHintEl.textContent = 'Processing batch — wait for completion';
    } else if (!r) {
      this._cargoHintEl.textContent = '';
    } else if (inCargo > 0) {
      this._cargoHintEl.textContent = `Cargo: ${inCargo} ${oreName}`;
    } else if (inStorage > 0) {
      this._cargoHintEl.textContent = `Storage: ${inStorage} ${oreName}`;
    } else {
      this._cargoHintEl.textContent = `No ${oreName} available`;
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
