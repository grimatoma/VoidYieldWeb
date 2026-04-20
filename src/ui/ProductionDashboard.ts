import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { StorageDepot } from '@entities/StorageDepot';
import type { ProcessingPlant } from '@entities/ProcessingPlant';

export class ProductionDashboard {
  readonly container: Container;
  private _bg!: Graphics;
  private _rows: Text[] = [];
  private _visible = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Panel background: 240×160, top-left at (10, 40)
    this._bg = new Graphics();
    this._bg.rect(0, 0, 240, 160).fill({ color: 0x0D1B3E, alpha: 0.92 });
    this._bg.rect(0, 0, 240, 160).stroke({ width: 1, color: 0x00B8D4 });
    this.container.addChild(this._bg);
    this.container.x = 10;
    this.container.y = 40;

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#00B8D4' });
    const title = new Text({ text: '[ PRODUCTION ]', style: titleStyle });
    title.x = 8;
    title.y = 8;
    this.container.addChild(title);

    // Row texts (up to 6 rows)
    const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
    for (let i = 0; i < 6; i++) {
      const row = new Text({ text: '', style: rowStyle });
      row.x = 8;
      row.y = 28 + i * 18;
      this.container.addChild(row);
      this._rows.push(row);
    }
  }

  /**
   * Refresh display from depot stockpile and plant states.
   * Call once per second (or when toggled open).
   */
  refresh(depot: StorageDepot, plants: readonly ProcessingPlant[]): void {
    const stockpile = depot.getStockpile();
    const lines: string[] = [];

    // Show ore types that have stockpile or active plants
    const types: Array<{ key: string; label: string }> = [
      { key: 'vorax', label: 'Vorax Ore' },
      { key: 'steel_bars', label: 'Steel Bars' },
      { key: 'krysite', label: 'Krysite' },
      { key: 'gas', label: 'Gas' },
    ];

    for (const { key, label } of types) {
      const qty = stockpile.get(key as never) ?? 0;
      // Find plants producing this type
      const producers = plants.filter(p => p.schematic.outputType === key);
      if (qty > 0 || producers.length > 0) {
        const rate = producers.reduce((acc, p) => {
          return acc + (p.state === 'RUNNING' ? p.schematic.batchPerMin * p.schematic.outputQty : 0);
        }, 0);
        const rateStr = rate > 0 ? `+${rate}/min` : producers.length > 0 ? 'STALLED' : '---';
        lines.push(`${label.padEnd(12)} ${String(qty).padStart(5)}  ${rateStr}`);
      }
    }

    for (let i = 0; i < this._rows.length; i++) {
      this._rows[i].text = lines[i] ?? '';
    }
  }

  toggle(): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
  }

  get visible(): boolean { return this._visible; }
}
