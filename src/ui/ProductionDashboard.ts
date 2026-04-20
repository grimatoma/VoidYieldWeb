import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { OreType } from '@data/types';
import type { StorageDepot } from '@entities/StorageDepot';
import type { ProcessingPlant } from '@entities/ProcessingPlant';
import type { Fabricator } from '@entities/Fabricator';

const RESOURCE_LABELS: Partial<Record<OreType, string>> = {
  vorax:         'Vorax Ore   ',
  steel_bars:    'Steel Bars  ',
  krysite:       'Krysite     ',
  alloy_rods:    'Alloy Rods  ',
  gas:           'Gas         ',
  compressed_gas: 'Comp. Gas   ',
  water:         'Water       ',
};

const TRACKED_ORDER: OreType[] = ['vorax', 'steel_bars', 'krysite', 'alloy_rods', 'gas', 'compressed_gas', 'water'];

export class ProductionDashboard {
  readonly container: Container;
  private _bg!: Graphics;
  private _rows: Text[] = [];
  private _titleText!: Text;
  private _visible = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.x = 10;
    this.container.y = 40;

    // Panel: 360×220
    this._bg = new Graphics();
    this._bg.rect(0, 0, 360, 220).fill({ color: 0x0D1B3E, alpha: 0.93 });
    this._bg.rect(0, 0, 360, 220).stroke({ width: 1, color: 0x00B8D4 });
    this.container.addChild(this._bg);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#00B8D4' });
    this._titleText = new Text({ text: '[ PRODUCTION DASHBOARD ]', style: titleStyle });
    this._titleText.x = 8;
    this._titleText.y = 8;
    this.container.addChild(this._titleText);

    // Header row
    const headerStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#888888' });
    const header = new Text({ text: 'RESOURCE        STOCK   +PROD   NET', style: headerStyle });
    header.x = 8;
    header.y = 26;
    this.container.addChild(header);

    // Separator line
    const sep = new Graphics();
    sep.rect(8, 37, 344, 1).fill(0x334477);
    this.container.addChild(sep);

    // Resource rows (up to 10)
    for (let i = 0; i < 10; i++) {
      const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
      const row = new Text({ text: '', style: rowStyle });
      row.x = 8;
      row.y = 42 + i * 17;
      this.container.addChild(row);
      this._rows.push(row);
    }
  }

  refresh(depot: StorageDepot, plants: readonly ProcessingPlant[], fabricators: readonly Fabricator[] = []): void {
    const stockpile = depot.getStockpile();
    let rowIdx = 0;

    for (const oreType of TRACKED_ORDER) {
      if (rowIdx >= this._rows.length) break;

      const qty = stockpile.get(oreType) ?? 0;

      // Production from ProcessingPlants (units/min)
      const plantProd = plants
        .filter(p => p.schematic.outputType === oreType && p.state === 'RUNNING')
        .reduce((acc, p) => acc + p.schematic.batchPerMin * p.schematic.outputQty, 0);

      // Plant consumption of this ore (as input)
      const plantCons = plants
        .filter(p => p.schematic.inputType === oreType && p.state === 'RUNNING')
        .reduce((acc, p) => acc + p.schematic.batchPerMin * p.schematic.inputQty, 0);

      // Fabricator production (per hr → per min)
      const fabProd = fabricators
        .filter(f => f.schematic.outputType === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.outputQty, 0);

      // Fabricator consumption
      const fabConsA = fabricators
        .filter(f => f.schematic.inputTypeA === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.inputQtyA, 0);
      const fabConsB = fabricators
        .filter(f => f.schematic.inputTypeB === oreType && f.state === 'RUNNING')
        .reduce((acc, f) => acc + (f.schematic.batchPerHr / 60) * f.schematic.inputQtyB, 0);

      const totalProd = plantProd + fabProd;
      const totalCons = plantCons + fabConsA + fabConsB;
      const net = totalProd - totalCons;

      // Only show rows with activity or stockpile
      if (qty === 0 && totalProd === 0 && totalCons === 0) continue;

      const label = (RESOURCE_LABELS[oreType] ?? oreType.padEnd(12)).slice(0, 12);
      const qtyStr = String(qty).padStart(6);
      const prodStr = totalProd > 0 ? `+${totalProd.toFixed(1)}/m`.padStart(8) : '       -';
      const netStr = net === 0 ? '  ±0' : net > 0 ? ` +${net.toFixed(1)}` : ` ${net.toFixed(1)}`;

      const row = this._rows[rowIdx];
      row.text = `${label}${qtyStr}  ${prodStr}  ${netStr}`;

      // Stall indicator
      const stalledPlants = plants.filter(p => p.schematic.outputType === oreType && p.state === 'STALLED');
      if (stalledPlants.length > 0) {
        row.text += ' [!]';
      }

      // Update color based on net delta
      (row.style as TextStyle).fill = net > 0 ? '#4CAF50' : net < 0 ? '#F44336' : '#D4A843';

      rowIdx++;
    }

    // Clear remaining rows
    for (let i = rowIdx; i < this._rows.length; i++) {
      this._rows[i].text = '';
    }
  }

  toggle(): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
  }

  get visible(): boolean { return this._visible; }
}
