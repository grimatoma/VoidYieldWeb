import { ElectrolysisUnit } from '@entities/ElectrolysisUnit';

/**
 * ElectrolysisOverlay — HTML panel opened by [E] near the Electrolysis Unit.
 * Shows recipe, input/output buffers, cycle progress, and status.
 * TDD §3.13.
 */
export class ElectrolysisOverlay {
  private _unit: ElectrolysisUnit;
  private _root: HTMLElement | null = null;
  private _open = false;
  private _pollHandle: ReturnType<typeof setInterval> | null = null;
  private _onKeydown: (e: KeyboardEvent) => void;

  constructor(unit: ElectrolysisUnit) {
    this._unit = unit;
    this._onKeydown = (e: KeyboardEvent) => {
      if (!this._open) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;
    this._root = document.createElement('div');
    this._root.id = 'electrolysis-overlay';
    this._root.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:rgba(7,18,42,0.98)',
      'border:1px solid #00B8D4',
      'color:#E8E4D0',
      'font-family:monospace',
      'font-size:13px',
      'padding:0',
      'min-width:420px',
      'max-width:500px',
      'z-index:20',
      'pointer-events:auto',
      'display:none',
    ].join(';');
    parent.appendChild(this._root);
    this._render();
  }

  unmount(): void {
    this._stopPoll();
    window.removeEventListener('keydown', this._onKeydown, true);
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
    this._pollHandle = setInterval(() => { if (this._open) this._render(); }, 500);
  }

  private _stopPoll(): void {
    if (this._pollHandle !== null) { clearInterval(this._pollHandle); this._pollHandle = null; }
  }

  private _render(): void {
    if (!this._root) return;
    const u = this._unit;

    const statusColor = u.state === 'RUNNING' ? '#4ADE80' : u.state === 'STALLED_OUTPUT' ? '#FBBF24' : '#4A4A6A';
    const statusLabel = u.state === 'RUNNING' ? '▶ RUNNING' : u.state === 'STALLED_OUTPUT' ? '⚠ STALLED (OUTPUT FULL)' : '— IDLE';

    const inputPct  = Math.round((u.inputBuffer  / ElectrolysisUnit.MAX_INPUT)  * 100);
    const outputPct = Math.round((u.outputBuffer / ElectrolysisUnit.MAX_OUTPUT) * 100);
    const cyclePct  = Math.round(u.cycleProgress * 100);
    const cycleRemaining = u.state === 'RUNNING'
      ? ((1 - u.cycleProgress) * ElectrolysisUnit.CYCLE_SECONDS).toFixed(1) + 's remaining'
      : '—';

    const barStyle = (pct: number, color: string) =>
      `display:inline-block;width:${pct}%;height:10px;background:${color};vertical-align:middle;`;

    this._root.innerHTML = `
      <div style="background:#041229;color:#00B8D4;padding:8px 14px;font-size:12px;font-weight:bold;border-bottom:1px solid #00B8D4;display:flex;justify-content:space-between;align-items:center;">
        <span>⚗ ELECTROLYSIS UNIT</span>
        <span style="font-size:10px;color:${statusColor};">${statusLabel}</span>
      </div>
      <div style="padding:12px 14px;">
        <div style="font-size:11px;color:#00B8D4;letter-spacing:1px;margin-bottom:10px;">RECIPE</div>
        <div style="font-size:12px;margin-bottom:14px;padding:8px;background:#071220;border:1px solid #0A3050;">
          Water × ${ElectrolysisUnit.INPUT_PER_CYCLE} → Hydrolox Fuel × ${ElectrolysisUnit.OUTPUT_PER_CYCLE}
          <span style="color:#666;font-size:10px;">&nbsp;&nbsp;(cycle: ${ElectrolysisUnit.CYCLE_SECONDS}s)</span>
        </div>

        <div style="font-size:11px;color:#00B8D4;letter-spacing:1px;margin-bottom:8px;">INPUT BUFFER</div>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="color:#3D85C6;width:50px;">Water</span>
            <div style="flex:1;height:10px;background:#0A1A2A;border:1px solid #1A3A5A;position:relative;">
              <div style="${barStyle(inputPct, '#3D85C6')}"></div>
            </div>
            <span style="color:#E8E4D0;width:60px;text-align:right;">${u.inputBuffer} / ${ElectrolysisUnit.MAX_INPUT}</span>
          </div>
          <div style="font-size:10px;color:#444;">→ Logistics drone hauls water from Storage</div>
        </div>

        <div style="font-size:11px;color:#00B8D4;letter-spacing:1px;margin-bottom:8px;">OUTPUT BUFFER</div>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="color:#00E5FF;width:50px;">Fuel</span>
            <div style="flex:1;height:10px;background:#0A1A2A;border:1px solid #1A3A5A;position:relative;">
              <div style="${barStyle(outputPct, '#00E5FF')}"></div>
            </div>
            <span style="color:#E8E4D0;width:60px;text-align:right;">${u.outputBuffer} / ${ElectrolysisUnit.MAX_OUTPUT}</span>
          </div>
          <div style="font-size:10px;color:#444;">→ Logistics drone hauls fuel to Storage</div>
        </div>

        ${u.state === 'RUNNING' ? `
        <div style="font-size:11px;color:#00B8D4;letter-spacing:1px;margin-bottom:8px;">CYCLE PROGRESS</div>
        <div style="margin-bottom:14px;">
          <div style="height:6px;background:#0A1A2A;border:1px solid #1A3A5A;">
            <div style="${barStyle(cyclePct, '#00B8D4')}"></div>
          </div>
          <div style="font-size:10px;color:#666;margin-top:4px;">${cycleRemaining}</div>
        </div>
        ` : u.state === 'IDLE' ? `
        <div style="font-size:11px;color:#4A4A6A;margin-bottom:14px;">Idle — needs ≥ ${ElectrolysisUnit.INPUT_PER_CYCLE} water in input buffer to start.</div>
        ` : `
        <div style="font-size:11px;color:#FBBF24;margin-bottom:14px;">⚠ Output full — logistics drone must haul fuel to Storage to resume.</div>
        `}

        <div style="display:flex;justify-content:flex-end;">
          <button id="elec-close" style="font-family:monospace;font-size:11px;padding:4px 12px;border:1px solid #3A5A8A;background:transparent;color:#E8E4D0;cursor:pointer;">CLOSE</button>
        </div>
      </div>
    `;

    this._root.querySelector('#elec-close')?.addEventListener('click', () => this.close());
  }
}
