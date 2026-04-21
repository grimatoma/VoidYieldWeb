/**
 * FabricatorPanel — opens when the player presses E near a Fabricator.
 * Lists the available recipes (FABRICATOR_SCHEMATICS) and lets the player
 * switch which item the fabricator is producing. The active recipe is
 * highlighted. Inputs/outputs, batch rate, and power draw are shown so
 * players can compare recipes before committing.
 */
import { FABRICATOR_SCHEMATICS, type FabricatorSchematic } from '@data/schematics';
import type { Fabricator } from '@entities/Fabricator';

const STATE_LABELS: Record<string, string> = {
  RUNNING: 'RUNNING',
  STALLED_A: 'STALLED (INPUT A)',
  STALLED_B: 'STALLED (INPUT B)',
  NO_POWER: 'NO POWER',
  IDLE: 'IDLE',
};

function prettyOre(t: string): string {
  return t.toUpperCase().replace(/_/g, ' ');
}

export class FabricatorPanel {
  private _root: HTMLElement;
  private _fab: Fabricator | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this._root = this._build();
    this._root.style.display = 'none';
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  setFabricator(fab: Fabricator): void {
    this._fab = fab;
    if (this._visible) this._render();
  }

  private _build(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'fabricator-panel';
    panel.className = 'trade-panel';
    panel.innerHTML = `
      <div class="trade-panel-head">
        <h2>FABRICATOR</h2>
        <button class="trade-panel-close" aria-label="close">✕</button>
      </div>
      <div class="fabricator-status">
        <span class="fabricator-status-label">STATUS</span>
        <span class="fabricator-status-value">IDLE</span>
      </div>
      <div class="fabricator-active">
        <div class="fabricator-active-label">ACTIVE RECIPE</div>
        <div class="fabricator-active-name">—</div>
        <div class="fabricator-active-flow">—</div>
      </div>
      <div class="trade-panel-list fabricator-list"></div>
      <div class="trade-panel-hint">Select a recipe to change what this fabricator constructs. [E] or [ESC] to close.</div>
    `;
    panel.querySelector<HTMLButtonElement>('.trade-panel-close')!
      .addEventListener('click', () => this.close());
    return panel;
  }

  private _render(): void {
    if (!this._fab) return;
    const active = this._fab.schematic;
    this._root.querySelector<HTMLElement>('.fabricator-status-value')!.textContent =
      STATE_LABELS[this._fab.state] ?? this._fab.state;
    this._root.querySelector<HTMLElement>('.fabricator-active-name')!.textContent = active.name;
    this._root.querySelector<HTMLElement>('.fabricator-active-flow')!.textContent =
      `${active.inputQtyA} ${prettyOre(active.inputTypeA)} + ${active.inputQtyB} ${prettyOre(active.inputTypeB)} → ${active.outputQty} ${prettyOre(active.outputType)}  ·  ${active.batchPerHr}/hr  ·  ${active.powerDraw} pwr`;

    const list = this._root.querySelector<HTMLElement>('.fabricator-list')!;
    list.innerHTML = '';
    for (const id of Object.keys(FABRICATOR_SCHEMATICS)) {
      const s: FabricatorSchematic = FABRICATOR_SCHEMATICS[id];
      const isActive = s.schematicId === active.schematicId;
      const row = document.createElement('div');
      row.className = 'trade-row fabricator-row' + (isActive ? ' is-active' : '');
      row.innerHTML = `
        <div class="trade-row-main">
          <div class="trade-row-name">${s.name}</div>
          <div class="trade-row-desc">
            ${s.inputQtyA} ${prettyOre(s.inputTypeA)} + ${s.inputQtyB} ${prettyOre(s.inputTypeB)}
            → ${s.outputQty} ${prettyOre(s.outputType)}
          </div>
          <div class="trade-row-desc">${s.batchPerHr}/hr · ${s.powerDraw} pwr</div>
        </div>
        <div class="trade-row-buy">
          <button class="trade-row-buy-btn" data-recipe="${s.schematicId}" ${isActive ? 'disabled' : ''}>
            ${isActive ? 'ACTIVE' : 'BUILD'}
          </button>
        </div>
      `;
      const btn = row.querySelector<HTMLButtonElement>('button')!;
      btn.addEventListener('click', () => this._select(s));
      list.appendChild(row);
    }
  }

  private _select(schematic: FabricatorSchematic): void {
    if (!this._fab) return;
    this._fab.setSchematic(schematic);
    this._render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  open(): void {
    if (this._visible) return;
    this._visible = true;
    this._root.style.display = 'flex';
    this._render();
  }

  close(): void {
    if (!this._visible) return;
    this._visible = false;
    this._root.style.display = 'none';
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    this._root.remove();
  }
}
