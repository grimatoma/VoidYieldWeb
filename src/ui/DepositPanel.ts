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
    this._root.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:#07122a',
      'border:1px solid #D4A843',
      'color:#E8E4D0',
      'font-family:monospace',
      'font-size:13px',
      'padding:0',
      'min-width:320px',
      'max-width:380px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');
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
      this._root.style.display = 'block';
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

  // ─── private ───────────────────────────────────────────────────────────────

  private _startPoll(): void {
    this._stopPoll();
    this._pollHandle = setInterval(() => {
      if (this._open && this._deposit && this._options) {
        // Sync remaining from live deposit data
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

    // Status badge
    let badgeHtml: string;
    if (isExhausted) {
      badgeHtml = `<span style="font-size:10px;padding:2px 8px;border-radius:2px;background:#1e2030;color:#94a3b8;border:1px solid #475569;">DEPLETED</span>`;
    } else if (hasDrone) {
      badgeHtml = `<span style="font-size:10px;padding:2px 8px;border-radius:2px;background:#14532d;color:#4ade80;border:1px solid #22c55e;">MINING</span>`;
    } else {
      badgeHtml = `<span style="font-size:10px;padding:2px 8px;border-radius:2px;background:#1e2030;color:#94a3b8;border:1px solid #475569;">UNMINED</span>`;
    }

    // Stock bar
    const stockBarHtml = this._buildStockBarHtml(opts.stockRemaining, opts.stockMax);

    // Road access row
    const roadHtml = opts.roadConnected
      ? `<span style="color:#4ade80;">&#x2713; Connected</span>`
      : `<span style="color:#94a3b8;">&#x2717; No road</span>`;

    // Body rows
    let bodyHtml: string;
    if (hasDrone) {
      // State B — drone assigned
      bodyHtml = `
        ${stockBarHtml}
        <hr style="border:none;border-top:1px solid #1a3060;margin:8px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Drone</span>
          <span style="color:#4ade80;">${opts.assignedDroneName} &#x25B6; MINING</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Output rate</span>
          <span style="color:#E8E4D0;">4.8 ore/min</span>
        </div>
        <hr style="border:none;border-top:1px solid #1a3060;margin:8px 0;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button id="dp-recall" style="${this._btnStyle('#ea580c')}">RECALL DRONE</button>
          <button id="dp-close"  style="${this._btnStyle('#3a5a8a')}">CLOSE</button>
        </div>
      `;
    } else {
      // State A — no drone
      const mineDisabled = isExhausted;
      const mineStyle = mineDisabled
        ? 'padding:5px 12px;font-family:monospace;font-size:11px;background:#0f1e38;color:#3a5a8a;border:1px solid #1a3060;cursor:default;'
        : 'padding:5px 12px;font-family:monospace;font-size:11px;background:#D4A843;color:#0D1B3E;font-weight:bold;border:none;cursor:pointer;';
      bodyHtml = `
        ${stockBarHtml}
        <hr style="border:none;border-top:1px solid #1a3060;margin:8px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Road access</span>${roadHtml}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Drone miner</span>
          <span style="color:#475569;">None assigned</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Hand-mine yield</span>
          <span style="color:#E8E4D0;">3&#x2013;5 ore / swing</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:8px;">
          <span style="color:#888;">Swing interval</span>
          <span style="color:#E8E4D0;">0.8 sec (hold E)</span>
        </div>
        <hr style="border:none;border-top:1px solid #1a3060;margin:8px 0;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button id="dp-mine"  ${mineDisabled ? 'disabled' : ''} style="${mineStyle}">&#x26CF; HAND MINE (hold E)</button>
          <button id="dp-close" style="${this._btnStyle('#3a5a8a')}">CLOSE</button>
        </div>
        <div style="margin-top:8px;font-size:10px;color:#4ade80;">Ore goes directly to Storage &#x2014; no player carry.</div>
        <div style="margin-top:4px;font-size:10px;color:#666;">Tip: Assign a Miner drone from a Drone Bay to automate this deposit.</div>
      `;
    }

    this._root.innerHTML = `
      <div style="background:#1a2d5a;color:#D4A843;padding:6px 12px;font-size:12px;font-weight:bold;border-bottom:1px solid #D4A843;display:flex;justify-content:space-between;align-items:center;">
        <span>&#x25C9; ${opts.oreLabel}</span>
        ${badgeHtml}
      </div>
      <div style="padding:12px;">
        ${bodyHtml}
      </div>
    `;

    this._wireEvents();
  }

  private _buildStockBarHtml(remaining: number, max: number): string {
    const pct = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, max)) * 100)));
    return `
      <div id="dp-stock-row" style="display:flex;align-items:center;gap:8px;font-size:11px;margin-bottom:8px;">
        <span style="color:#888;width:90px;flex-shrink:0;">Remaining</span>
        <div style="flex:1;height:8px;background:#1a3060;border:1px solid #2a4080;">
          <div id="dp-stock-fill" style="height:100%;width:${pct}%;background:#cd6020;"></div>
        </div>
        <span id="dp-stock-num" style="color:#E8E4D0;font-size:10px;width:60px;text-align:right;">~${remaining} ore</span>
      </div>
    `;
  }

  private _renderStockBar(): void {
    if (!this._root || !this._options) return;
    const fill = this._root.querySelector<HTMLElement>('#dp-stock-fill');
    const num  = this._root.querySelector<HTMLElement>('#dp-stock-num');
    if (!fill || !num) return;
    const { stockRemaining, stockMax } = this._options;
    const pct = Math.max(0, Math.min(100, Math.round((stockRemaining / Math.max(1, stockMax)) * 100)));
    fill.style.width = `${pct}%`;
    num.textContent  = `~${Math.ceil(stockRemaining)} ore`;
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

  private _btnStyle(color: string): string {
    return [
      'padding:5px 12px',
      'font-family:monospace',
      'font-size:11px',
      `border:1px solid ${color}`,
      'background:transparent',
      `color:${color}`,
      'cursor:pointer',
    ].join(';');
  }
}
