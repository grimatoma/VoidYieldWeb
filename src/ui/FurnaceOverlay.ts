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

  private _statusBadgeEl!: HTMLElement;
  private _ironBtn!: HTMLButtonElement;
  private _copperBtn!: HTMLButtonElement;
  private _noneBtn!: HTMLButtonElement;
  private _activeRecipeEl!: HTMLElement;
  private _recipeIOEl!: HTMLElement;
  private _throughputSectionEl!: HTMLElement;
  private _batchTimeEl!: HTMLElement;
  private _outputRateEl!: HTMLElement;
  private _inputRateEl!: HTMLElement;
  private _efficiencyBarEl!: HTMLElement;
  private _efficiencyPctEl!: HTMLElement;
  private _valueSectionEl!: HTMLElement;
  private _rawOreValEl!: HTMLElement;
  private _ingotValEl!: HTMLElement;
  private _multiplierEl!: HTMLElement;
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
    this._root.className = 'facility-panel facility-panel--side';
    this._root.style.display = 'none';
    this._root.style.setProperty('--facility-accent', '#f59e0b');
    this._root.style.setProperty('--facility-accent-soft', 'rgba(245, 158, 11, 0.14)');
    this._root.style.setProperty('--facility-accent-border', 'rgba(245, 158, 11, 0.42)');

    this._root.innerHTML = `
      <div class="facility-panel-head">
        <div class="facility-panel-heading">
          <div class="facility-panel-kicker">Refining</div>
          <h2 class="facility-panel-title">Processing Plant</h2>
          <div class="facility-panel-subtitle">Select a recipe, load ore, and monitor throughput from a standard plant menu.</div>
        </div>
        <div class="facility-panel-meta">
          <span id="furnace-status-badge" class="facility-chip"></span>
        </div>
      </div>

      <div class="facility-panel-body">
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Recipe control</div>
          <div id="furnace-active-recipe" class="facility-section-copy"></div>
          <div class="facility-actions">
            <button id="furnace-btn-iron" class="facility-btn facility-btn--small">Iron</button>
            <button id="furnace-btn-copper" class="facility-btn facility-btn--small">Copper</button>
            <button id="furnace-btn-none" class="facility-btn facility-btn--small">Off</button>
          </div>
          <div id="furnace-recipe-io" class="facility-card facility-card--accent"></div>
        </div>

        <div id="furnace-throughput-section" class="facility-section">
          <div class="facility-section-title">Throughput</div>
          <div class="facility-row">
            <span class="facility-row-label">Batch time</span>
            <span id="furnace-batch-time" class="facility-row-value">-</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Output rate</span>
            <span id="furnace-output-rate" class="facility-row-value facility-row-value--good">-</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Input rate</span>
            <span id="furnace-input-rate" class="facility-row-value facility-row-value--warn">-</span>
          </div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Quality influence</div>
          <div class="facility-row">
            <span class="facility-row-label">Ore ER average</span>
            <span class="facility-row-value">Live batch estimate</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Ingot quality</span>
            <span class="facility-row-value">Derived from current input</span>
          </div>
          <div class="facility-row facility-row--top">
            <span class="facility-row-label">Efficiency</span>
            <span class="facility-row-value">
              <span id="furnace-efficiency-bar"></span>
              <span id="furnace-efficiency-pct" style="margin-left:8px;"></span>
            </span>
          </div>
        </div>

        <div id="furnace-value-section" class="facility-section">
          <div class="facility-section-title">Value multiplier</div>
          <div class="facility-row">
            <span id="furnace-raw-ore-label" class="facility-row-label">Raw ore</span>
            <span id="furnace-raw-ore-val" class="facility-row-value"></span>
          </div>
          <div class="facility-row">
            <span id="furnace-ingot-label" class="facility-row-label">Ingot</span>
            <span id="furnace-ingot-val" class="facility-row-value"></span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Yield multiple</span>
            <span id="furnace-multiplier" class="facility-row-value facility-row-value--accent"></span>
          </div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Buffers</div>
          <div class="facility-row">
            <span class="facility-row-label">Input</span>
            <span id="furnace-in-buf" class="facility-row-value">0</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Output</span>
            <span id="furnace-out-buf" class="facility-row-value facility-row-value--good">0</span>
          </div>
          <div class="facility-actions">
            <button id="furnace-insert-btn" class="facility-btn facility-btn--primary">Insert ore</button>
            <button id="furnace-extract-btn" class="facility-btn">Extract</button>
          </div>
          <div id="furnace-cargo-hint" class="facility-note"></div>
        </div>
      </div>
    `;

    parent.appendChild(this._root);

    this._statusBadgeEl = this._root.querySelector('#furnace-status-badge') as HTMLElement;
    this._ironBtn = this._root.querySelector('#furnace-btn-iron') as HTMLButtonElement;
    this._copperBtn = this._root.querySelector('#furnace-btn-copper') as HTMLButtonElement;
    this._noneBtn = this._root.querySelector('#furnace-btn-none') as HTMLButtonElement;
    this._activeRecipeEl = this._root.querySelector('#furnace-active-recipe') as HTMLElement;
    this._recipeIOEl = this._root.querySelector('#furnace-recipe-io') as HTMLElement;
    this._throughputSectionEl = this._root.querySelector('#furnace-throughput-section') as HTMLElement;
    this._batchTimeEl = this._root.querySelector('#furnace-batch-time') as HTMLElement;
    this._outputRateEl = this._root.querySelector('#furnace-output-rate') as HTMLElement;
    this._inputRateEl = this._root.querySelector('#furnace-input-rate') as HTMLElement;
    this._efficiencyBarEl = this._root.querySelector('#furnace-efficiency-bar') as HTMLElement;
    this._efficiencyPctEl = this._root.querySelector('#furnace-efficiency-pct') as HTMLElement;
    this._valueSectionEl = this._root.querySelector('#furnace-value-section') as HTMLElement;
    this._rawOreValEl = this._root.querySelector('#furnace-raw-ore-val') as HTMLElement;
    this._ingotValEl = this._root.querySelector('#furnace-ingot-val') as HTMLElement;
    this._multiplierEl = this._root.querySelector('#furnace-multiplier') as HTMLElement;
    this._inBufEl = this._root.querySelector('#furnace-in-buf') as HTMLElement;
    this._outBufEl = this._root.querySelector('#furnace-out-buf') as HTMLElement;
    this._insertBtn = this._root.querySelector('#furnace-insert-btn') as HTMLButtonElement;
    this._extractBtn = this._root.querySelector('#furnace-extract-btn') as HTMLButtonElement;
    this._cargoHintEl = this._root.querySelector('#furnace-cargo-hint') as HTMLElement;

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
      this._root.style.display = 'flex';
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

    const recipe = this._furnace.recipe;
    const plantState = this._furnace.getPlantState();
    const progress = this._furnace.getBatchProgress();
    const isLoaded = this._furnace.isLoaded();
    const plant = this._furnace.plant;

    const stateUpper = plantState.toUpperCase();
    let badgeClass = 'facility-chip';
    let badgeLabel = stateUpper;
    if (stateUpper === 'RUNNING') {
      badgeClass = 'facility-chip facility-chip--good';
      badgeLabel = 'Running';
    } else if (stateUpper === 'STALLED') {
      badgeClass = 'facility-chip facility-chip--warn';
      badgeLabel = 'Stalled';
    } else if (recipe === 'off') {
      badgeLabel = 'Idle';
    }
    this._statusBadgeEl.className = badgeClass;
    this._statusBadgeEl.textContent = badgeLabel;

    this._setRecipeButtonState(this._ironBtn, recipe === 'iron');
    this._setRecipeButtonState(this._copperBtn, recipe === 'copper');
    this._setRecipeButtonState(this._noneBtn, recipe === 'off');

    if (recipe === 'iron') this._activeRecipeEl.textContent = 'Active recipe: Iron Ingot';
    else if (recipe === 'copper') this._activeRecipeEl.textContent = 'Active recipe: Copper Ingot';
    else this._activeRecipeEl.textContent = 'Active recipe: None';

    const activeRecipe = recipe !== 'off'
      ? FURNACE_RECIPES[recipe as Exclude<FurnaceRecipe, 'off'>]
      : null;

    if (activeRecipe) {
      const oreLabel = activeRecipe.input.replace(/_/g, ' ');
      const barLabel = activeRecipe.output.replace(/_/g, ' ');
      this._recipeIOEl.innerHTML = `
        <div class="facility-row">
          <span class="facility-row-label">Input</span>
          <span class="facility-row-value">${oreLabel}</span>
        </div>
        <div class="facility-row">
          <span class="facility-row-label">Output</span>
          <span class="facility-row-value">${barLabel}</span>
        </div>
      `;
    } else {
      this._recipeIOEl.innerHTML = '<div class="facility-row-label">Select a recipe to see its ore flow.</div>';
    }

    if (activeRecipe) {
      this._throughputSectionEl.style.display = 'flex';
      this._batchTimeEl.textContent = `${activeRecipe.batchSec.toFixed(1)}s`;
      this._outputRateEl.textContent = `+${((60 / activeRecipe.batchSec) * activeRecipe.outputQty).toFixed(1)} bars/min`;
      this._inputRateEl.textContent = `-${((60 / activeRecipe.batchSec) * activeRecipe.inputQty).toFixed(1)} ore/min`;
    } else {
      this._throughputSectionEl.style.display = 'none';
    }

    const effPct = stateUpper === 'RUNNING' ? Math.round(progress * 100) : 70;
    const filledCells = Math.round(effPct / 10);
    this._efficiencyBarEl.textContent = `${'█'.repeat(filledCells)}${'░'.repeat(10 - filledCells)}`;
    this._efficiencyPctEl.textContent = `${effPct}%`;

    if (activeRecipe) {
      const rawPrice = SELL_PRICES[activeRecipe.input] ?? 0;
      const ingotPrice = SELL_PRICES[activeRecipe.output] ?? 0;
      if (rawPrice > 0 && ingotPrice > 0) {
        this._valueSectionEl.style.display = 'flex';
        const oreLabel = activeRecipe.input.replace(/_/g, ' ');
        const barLabel = activeRecipe.output.replace(/_/g, ' ');
        this._rawOreValEl.textContent = `${rawPrice} CR/unit`;
        this._ingotValEl.textContent = `${ingotPrice} CR/unit`;
        this._multiplierEl.textContent = `×${(ingotPrice / rawPrice).toFixed(1)}`;
        const rawLabel = this._valueSectionEl.querySelector('#furnace-raw-ore-label') as HTMLElement | null;
        const ingLabel = this._valueSectionEl.querySelector('#furnace-ingot-label') as HTMLElement | null;
        if (rawLabel) rawLabel.textContent = `${oreLabel}:`;
        if (ingLabel) ingLabel.textContent = `${barLabel}:`;
      } else {
        this._valueSectionEl.style.display = 'none';
      }
    } else {
      this._valueSectionEl.style.display = 'none';
    }

    const maxIn = plant.schematic.inputQty * 10;
    const maxOut = plant.schematic.outputQty * 10;
    this._inBufEl.textContent = `${plant.inputBuffer}/${maxIn}`;
    this._outBufEl.textContent = `${plant.outputBuffer}/${maxOut}`;

    const oreName = activeRecipe ? activeRecipe.input.replace(/_/g, ' ') : '';
    const inCargo = activeRecipe ? inventory.getByType(activeRecipe.input) : 0;
    const inStorage = activeRecipe && this._getStorageOre ? (this._getStorageOre(activeRecipe.input) ?? 0) : 0;
    const canInsert = activeRecipe !== null && (inCargo > 0 || inStorage > 0) && !isLoaded;

    this._insertBtn.textContent = activeRecipe
      ? `Insert ${activeRecipe.input.replace(/_/g, ' ').toUpperCase()}`
      : 'Insert ore';
    this._insertBtn.disabled = !canInsert;
    this._insertBtn.className = 'facility-btn facility-btn--primary';

    const canExtract = plant.outputBuffer > 0;
    this._extractBtn.textContent = activeRecipe
      ? `Take ${activeRecipe.output.replace(/_/g, ' ').toUpperCase()}`
      : 'Extract';
    this._extractBtn.disabled = !canExtract;
    this._extractBtn.style.display = canExtract ? 'inline-flex' : 'none';

    this._cargoHintEl.className = 'facility-note';
    if (isLoaded) {
      this._cargoHintEl.textContent = 'Processing batch in progress. Wait for completion before loading more ore.';
    } else if (!activeRecipe) {
      this._cargoHintEl.textContent = 'Choose a recipe to see what ore the plant can accept.';
    } else if (inCargo > 0) {
      this._cargoHintEl.classList.add('facility-note--good');
      this._cargoHintEl.textContent = `Cargo ready: ${inCargo} ${oreName}`;
    } else if (inStorage > 0) {
      this._cargoHintEl.textContent = `Storage available: ${inStorage} ${oreName}`;
    } else {
      this._cargoHintEl.classList.add('facility-note--warn');
      this._cargoHintEl.textContent = `No ${oreName} available to insert.`;
    }
  }

  private _setRecipeButtonState(button: HTMLButtonElement, active: boolean): void {
    button.className = `facility-btn facility-btn--small${active ? ' facility-btn--active' : ''}`;
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

  private _onStateChanged = (_state: 'idle' | 'running' | 'output-ready'): void => {
    if (this._open) this.refresh();
  };

  private _onInventoryChanged = (): void => {
    if (this._open) this.refresh();
  };
}
