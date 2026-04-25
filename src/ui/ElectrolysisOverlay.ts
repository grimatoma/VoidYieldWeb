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
    this._root.className = 'facility-panel';
    this._root.style.display = 'none';
    this._root.style.setProperty('--facility-accent', '#5eead4');
    this._root.style.setProperty('--facility-accent-soft', 'rgba(94, 234, 212, 0.14)');
    this._root.style.setProperty('--facility-accent-border', 'rgba(94, 234, 212, 0.42)');
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
      this._root.style.display = 'flex';
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
      if (this._open) this._render();
    }, 500);
  }

  private _stopPoll(): void {
    if (this._pollHandle !== null) {
      clearInterval(this._pollHandle);
      this._pollHandle = null;
    }
  }

  private _render(): void {
    if (!this._root) return;
    const unit = this._unit;

    const statusClass = unit.state === 'RUNNING'
      ? 'facility-chip facility-chip--good'
      : unit.state === 'STALLED_OUTPUT'
        ? 'facility-chip facility-chip--warn'
        : 'facility-chip';
    const statusLabel = unit.state === 'RUNNING'
      ? 'Running'
      : unit.state === 'STALLED_OUTPUT'
        ? 'Output full'
        : 'Idle';

    const inputPct = Math.round((unit.inputBuffer / ElectrolysisUnit.MAX_INPUT) * 100);
    const outputPct = Math.round((unit.outputBuffer / ElectrolysisUnit.MAX_OUTPUT) * 100);
    const cyclePct = Math.round(unit.cycleProgress * 100);
    const cycleRemaining = unit.state === 'RUNNING'
      ? `${((1 - unit.cycleProgress) * ElectrolysisUnit.CYCLE_SECONDS).toFixed(1)}s remaining`
      : 'Waiting for next cycle';

    const stateNote = unit.state === 'RUNNING'
      ? `<div class="facility-note facility-note--good">The chamber is actively separating water into fuel. Logistics drones can keep the cycle uninterrupted by feeding water and clearing fuel.</div>`
      : unit.state === 'STALLED_OUTPUT'
        ? `<div class="facility-note facility-note--warn">Output buffer is full. Clear Hydrolox Fuel to storage so the chamber can resume.</div>`
        : `<div class="facility-note">Idle until at least ${ElectrolysisUnit.INPUT_PER_CYCLE} water is available in the input buffer.</div>`;

    this._root.innerHTML = `
      <div class="facility-panel-head">
        <div class="facility-panel-heading">
          <div class="facility-panel-kicker">Fuel Processing</div>
          <h2 class="facility-panel-title">Electrolysis Unit</h2>
          <div class="facility-panel-subtitle">Converts stored water into Hydrolox fuel for outbound shipping.</div>
        </div>
        <div class="facility-panel-meta">
          <span class="${statusClass}"><span class="facility-chip-dot"></span>${statusLabel}</span>
        </div>
      </div>
      <div class="facility-panel-body">
        <div class="facility-section facility-section--accent">
          <div class="facility-section-title">Reaction recipe</div>
          <div class="facility-card facility-card--accent">
            <div class="facility-row">
              <span class="facility-row-label">Conversion</span>
              <span class="facility-row-value">Water × ${ElectrolysisUnit.INPUT_PER_CYCLE} → Hydrolox Fuel × ${ElectrolysisUnit.OUTPUT_PER_CYCLE}</span>
            </div>
            <div class="facility-item-meta">Cycle length: ${ElectrolysisUnit.CYCLE_SECONDS}s</div>
          </div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Input buffer</div>
          <div class="facility-progress-labels">
            <span>Water</span>
            <span>${unit.inputBuffer} / ${ElectrolysisUnit.MAX_INPUT}</span>
          </div>
          <div class="facility-progress">
            <div class="facility-progress-fill" style="width:${inputPct}%; background:linear-gradient(90deg, #60a5fa 0%, #5eead4 100%);"></div>
          </div>
          <div class="facility-item-meta">Logistics drones haul water from storage into the chamber.</div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Output buffer</div>
          <div class="facility-progress-labels">
            <span>Hydrolox Fuel</span>
            <span>${unit.outputBuffer} / ${ElectrolysisUnit.MAX_OUTPUT}</span>
          </div>
          <div class="facility-progress">
            <div class="facility-progress-fill" style="width:${outputPct}%; background:linear-gradient(90deg, #67e8f9 0%, #22d3ee 100%);"></div>
          </div>
          <div class="facility-item-meta">Fuel is export-ready once drones clear the output buffer.</div>
        </div>

        <div class="facility-section">
          <div class="facility-section-title">Cycle progress</div>
          <div class="facility-progress facility-progress--thin">
            <div class="facility-progress-fill" style="width:${cyclePct}%;"></div>
          </div>
          <div class="facility-progress-labels">
            <span>${cyclePct}% complete</span>
            <span>${cycleRemaining}</span>
          </div>
        </div>

        ${stateNote}

        <div class="facility-actions">
          <button id="elec-close" class="facility-btn">Close</button>
        </div>
      </div>
    `;

    this._root.querySelector('#elec-close')?.addEventListener('click', () => this.close());
  }
}
