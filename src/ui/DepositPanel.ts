import type { Deposit } from '@entities/Deposit';

/** Options passed when opening the panel. */
export interface DepositPanelOptions {
  oreLabel: string;
  stockRemaining: number;
  stockMax: number;
  roadConnected: boolean;
  assignedDroneName: string | null;
  onHandMine: () => void;
  onRecall: () => void;
  onClose: () => void;
}

/**
 * DOM overlay panel shown when the player presses [E] near a deposit.
 * Follows the same mount/unmount pattern as DroneDepotOverlay.
 */
export class DepositPanel {
  private _root: HTMLElement | null = null;
  private _open = false;
  private _options: DepositPanelOptions | null = null;
  private _deposit: Deposit | null = null;
  private _pollHandle: ReturnType<typeof setInterval> | null = null;

  mount(): void {
    if (this._root) return;
    const parent = document.getElementById('ui-layer') ?? document.body;
    this._root = document.createElement('div');
    this._root.id = 'deposit-panel';
    this._root.className = 'facility-panel';
    this._root.style.display = 'none';
    this._root.style.setProperty('--facility-accent', '#fb923c');
    this._root.style.setProperty('--facility-accent-soft', 'rgba(251, 146, 60, 0.14)');
    this._root.style.setProperty('--facility-accent-border', 'rgba(251, 146, 60, 0.42)');
    this._root.style.width = 'min(calc(380px * var(--hud-scale)), 92vw)';
    parent.appendChild(this._root);
  }

  unmount(): void {
    this._stopPoll();
    this._root?.remove();
    this._root = null;
    this._open = false;
    this._deposit = null;
    this._options = null;
  }

  open(deposit: Deposit, options: DepositPanelOptions): void {
    this._deposit = deposit;
    this._options = options;
    this._open = true;
    if (this._root) {
      this._root.style.display = 'flex';
      this._render();
    }
    this._startPoll();
  }

  close(): void {
    this._stopPoll();
    this._open = false;
    if (this._root) this._root.style.display = 'none';
    this._deposit = null;
    this._options = null;
  }

  isOpen(): boolean { return this._open; }

  /** Update the stock progress bar while the panel is open (called from scene update). */
  updateStock(remaining: number): void {
    if (!this._open || !this._options) return;
    this._options.stockRemaining = remaining;
    this._renderStockBar();
  }

  private _startPoll(): void {
    this._stopPoll();
    this._pollHandle = setInterval(() => {
      if (this._open && this._deposit && this._options) {
        this._options.stockRemaining = this._deposit.data.yieldRemaining;
        this._renderStockBar();
      }
    }, 333);
  }

  private _stopPoll(): void {
    if (this._pollHandle !== null) {
      clearInterval(this._pollHandle);
      this._pollHandle = null;
    }
  }

  private _render(): void {
    if (!this._root || !this._options || !this._deposit) return;
    const opts = this._options;
    const hasDrone = opts.assignedDroneName !== null;
    const isExhausted = this._deposit.data.isExhausted;

    const badgeClass = isExhausted
      ? 'facility-chip'
      : hasDrone
        ? 'facility-chip facility-chip--good'
        : 'facility-chip facility-chip--accent';
    const badgeLabel = isExhausted ? 'Depleted' : hasDrone ? 'Mining' : 'Unclaimed';

    const stockBarHtml = this._buildStockBarHtml(opts.stockRemaining, opts.stockMax);
    const roadText = opts.roadConnected ? 'Connected' : 'No road';
    const roadClass = opts.roadConnected ? 'facility-row-value facility-row-value--good' : 'facility-row-value facility-row-value--muted';

    let bodyHtml: string;
    if (hasDrone) {
      bodyHtml = `
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Yield reserve</div>
          ${stockBarHtml}
        </div>
        <div class="facility-section">
          <div class="facility-row">
            <span class="facility-row-label">Assigned drone</span>
            <span class="facility-row-value facility-row-value--good">${opts.assignedDroneName} • mining</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Output rate</span>
            <span class="facility-row-value">4.8 ore/min</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Road access</span>
            <span class="${roadClass}">${roadText}</span>
          </div>
        </div>
        <div class="facility-actions">
          <button id="dp-recall" class="facility-btn facility-btn--danger">Recall drone</button>
          <button id="dp-close" class="facility-btn">Close</button>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Yield reserve</div>
          ${stockBarHtml}
        </div>
        <div class="facility-section">
          <div class="facility-row">
            <span class="facility-row-label">Road access</span>
            <span class="${roadClass}">${roadText}</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Drone miner</span>
            <span class="facility-row-value facility-row-value--muted">None assigned</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Hand-mine yield</span>
            <span class="facility-row-value">3-5 ore / swing</span>
          </div>
          <div class="facility-row">
            <span class="facility-row-label">Swing interval</span>
            <span class="facility-row-value">0.8 sec (hold E)</span>
          </div>
        </div>
        <div class="facility-actions">
          <button id="dp-mine" ${isExhausted ? 'disabled' : ''} class="facility-btn facility-btn--primary">Hand mine</button>
          <button id="dp-close" class="facility-btn">Close</button>
        </div>
        <div class="facility-note facility-note--good">Ore goes straight into storage. Assigning a miner drone will automate this deposit.</div>
      `;
    }

    this._root.innerHTML = `
      <div class="facility-panel-head">
        <div class="facility-panel-heading">
          <div class="facility-panel-kicker">Resource Node</div>
          <h2 class="facility-panel-title">${opts.oreLabel}</h2>
          <div class="facility-panel-subtitle">Monitor remaining yield and decide whether to mine manually or automate it.</div>
        </div>
        <div class="facility-panel-meta">
          <span class="${badgeClass}">${badgeLabel}</span>
        </div>
      </div>
      <div class="facility-panel-body">
        ${bodyHtml}
      </div>
    `;

    this._wireEvents();
  }

  private _buildStockBarHtml(remaining: number, max: number): string {
    const pct = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, max)) * 100)));
    return `
      <div class="facility-progress-labels">
        <span>Remaining reserve</span>
        <span id="dp-stock-num">~${Math.ceil(remaining)} ore</span>
      </div>
      <div class="facility-progress">
        <div id="dp-stock-fill" class="facility-progress-fill" style="width:${pct}%; background:linear-gradient(90deg, #fb923c 0%, #f97316 100%);"></div>
      </div>
    `;
  }

  private _renderStockBar(): void {
    if (!this._root || !this._options) return;
    const fill = this._root.querySelector<HTMLElement>('#dp-stock-fill');
    const num = this._root.querySelector<HTMLElement>('#dp-stock-num');
    if (!fill || !num) return;
    const { stockRemaining, stockMax } = this._options;
    const pct = Math.max(0, Math.min(100, Math.round((stockRemaining / Math.max(1, stockMax)) * 100)));
    fill.style.width = `${pct}%`;
    num.textContent = `~${Math.ceil(stockRemaining)} ore`;
  }

  private _wireEvents(): void {
    if (!this._root || !this._options) return;
    const opts = this._options;

    this._root.querySelector('#dp-close')?.addEventListener('click', () => {
      opts.onClose();
      this.close();
    });

    this._root.querySelector('#dp-mine')?.addEventListener('click', () => {
      opts.onHandMine();
    });

    this._root.querySelector('#dp-recall')?.addEventListener('click', () => {
      opts.onRecall();
    });
  }
}
