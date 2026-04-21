/**
 * ProductionDashboard — HTML production overview panel. Scales with --hud-scale.
 */
import type { OreType } from '@data/types';
import type { StorageDepot } from '@entities/StorageDepot';
import type { ProcessingPlant } from '@entities/ProcessingPlant';
import type { Fabricator } from '@entities/Fabricator';

const RESOURCE_LABELS: Partial<Record<OreType, string>> = {
  vorax:         'Vorax Ore',
  steel_bars:    'Steel Bars',
  krysite:       'Krysite',
  alloy_rods:    'Alloy Rods',
  gas:           'Gas',
  compressed_gas:'Comp. Gas',
  water:         'Water',
};

const TRACKED_ORDER: OreType[] = ['vorax', 'steel_bars', 'krysite', 'alloy_rods', 'gas', 'compressed_gas', 'water'];

export class ProductionDashboard {
  private _root: HTMLElement;
  private _body: HTMLElement;
  private _visible = false;
  private _mounted = false;

  constructor() {
    this._root = document.createElement('div');
    this._root.className = 'production-panel';
    this._root.style.display = 'none';
    this._root.innerHTML = `
      <div class="production-panel-head">
        <span class="production-panel-title">[ PRODUCTION ]</span>
        <span class="production-panel-hint">[H] close</span>
      </div>
      <div class="production-panel-headers">
        <span>RESOURCE</span>
        <span>STOCK</span>
        <span>+PROD</span>
        <span>NET</span>
      </div>
      <div class="production-panel-body"></div>
    `;
    this._body = this._root.querySelector<HTMLElement>('.production-panel-body')!;
  }

  mount(parent: HTMLElement): void {
    if (this._mounted) return;
    parent.appendChild(this._root);
    this._mounted = true;
  }

  refresh(depot: StorageDepot, plants: readonly ProcessingPlant[], fabricators: readonly Fabricator[] = []): void {
    const stockpile = depot.getStockpile();
    const rows: string[] = [];

    for (const oreType of TRACKED_ORDER) {
      const qty = stockpile.get(oreType) ?? 0;

      const plantProd = plants.filter(p => p.schematic.outputType === oreType && p.state === 'RUNNING')
        .reduce((acc, p) => acc + p.schematic.batchPerMin * p.schematic.outputQty, 0);
      const plantCons = plants.filter(p => p.schematic.inputType === oreType && p.state === 'RUNNING')
        .reduce((acc, p) => acc + p.schematic.batchPerMin * p.schematic.inputQty, 0);
      const fabProd = fabricators.filter(f => f.schematic.outputType === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.outputQty, 0);
      const fabConsA = fabricators.filter(f => f.schematic.inputTypeA === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.inputQtyA, 0);
      const fabConsB = fabricators.filter(f => f.schematic.inputTypeB === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.inputQtyB, 0);

      const totalProd = plantProd + fabProd;
      const totalCons = plantCons + fabConsA + fabConsB;
      const net = totalProd - totalCons;
      if (qty === 0 && totalProd === 0 && totalCons === 0) continue;

      const label = RESOURCE_LABELS[oreType] ?? oreType;
      const prodStr = totalProd > 0 ? `+${totalProd.toFixed(1)}/m` : '—';
      const netStr = net === 0 ? '±0' : net > 0 ? `+${net.toFixed(1)}` : net.toFixed(1);
      const netClass = net > 0 ? 'pos' : net < 0 ? 'neg' : 'zero';
      const stalled = plants.some(p => p.schematic.outputType === oreType && p.state === 'STALLED');

      rows.push(`
        <div class="production-row production-row--${netClass}">
          <span class="production-row-name">${label}${stalled ? ' [!]' : ''}</span>
          <span class="production-row-qty">${qty}</span>
          <span class="production-row-prod">${prodStr}</span>
          <span class="production-row-net">${netStr}</span>
        </div>
      `);
    }

    this._body.innerHTML = rows.length > 0
      ? rows.join('')
      : `<div class="production-empty">No production activity.</div>`;
  }

  toggle(): void {
    this._visible = !this._visible;
    this._root.style.display = this._visible ? 'block' : 'none';
  }

  get visible(): boolean { return this._visible; }

  destroy(): void { this._root.remove(); }
}
