import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TradeRoute } from '@data/types';

const STATUS_COLOR: Record<string, string> = {
  IDLE:        '#888888',
  LOADING:     '#FFC107',
  IN_TRANSIT:  '#2196F3',
  DELIVERING:  '#4CAF50',
  STALLED:     '#F44336',
};

export class LogisticsOverlay {
  readonly container: Container;
  private _bg!: Graphics;
  private _rowContainer!: Container;
  private _visible = false;
  private _onDispatch?: (routeId: string) => void;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Panel: 380×280 at top-right (screen x=570, y=40 for 960-wide screen)
    this._bg = new Graphics();
    this._bg.rect(0, 0, 380, 280).fill({ color: 0x0D1B3E, alpha: 0.93 });
    this._bg.rect(0, 0, 380, 280).stroke({ width: 1, color: 0xD4A843 });
    this.container.addChild(this._bg);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#D4A843' });
    const title = new Text({ text: '[ LOGISTICS ]', style: titleStyle });
    title.x = 8;
    title.y = 8;
    this.container.addChild(title);

    // Column headers
    const hStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#556677' });
    const headers = new Text({ text: 'ROUTE            STATUS     TRIPS  CARGO', style: hStyle });
    headers.x = 8;
    headers.y = 26;
    this.container.addChild(headers);

    const sep = new Graphics();
    sep.rect(8, 38, 364, 1).fill(0x334477);
    this.container.addChild(sep);

    this._rowContainer = new Container();
    this._rowContainer.y = 42;
    this.container.addChild(this._rowContainer);

    this.container.x = 570;
    this.container.y = 40;
  }

  onDispatch(cb: (routeId: string) => void): void {
    this._onDispatch = cb;
  }

  /** Refresh the route list. Call once per second or when toggled. */
  refresh(routes: readonly TradeRoute[]): void {
    this._rowContainer.removeChildren();

    if (routes.length === 0) {
      const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#556677' });
      const empty = new Text({ text: 'No routes configured.', style });
      empty.x = 8;
      empty.y = 4;
      this._rowContainer.addChild(empty);
      return;
    }

    routes.forEach((route, i) => {
      const y = i * 38;
      const color = STATUS_COLOR[route.status] ?? '#888888';

      // Route label: "A1→B  steel_bars×100"
      const label = `${route.sourcePlanet.replace('planet_', '').toUpperCase()}→${route.destPlanet.replace('planet_', '').toUpperCase()}  ${route.cargoType}×${route.cargoQty}`;
      const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: color });
      const rowText = new Text({
        text: `${label.padEnd(28)}${route.status.padEnd(12)}${String(route.tripsCompleted).padStart(3)}`,
        style: rowStyle,
      });
      rowText.x = 8;
      rowText.y = y + 2;
      this._rowContainer.addChild(rowText);

      // Progress bar (for IN_TRANSIT)
      if (route.status === 'IN_TRANSIT') {
        const pct = Math.min(route.elapsedSec / route.tripTimeSec, 1);
        const bar = new Graphics();
        bar.rect(8, y + 16, 200, 4).fill(0x222244);
        bar.rect(8, y + 16, Math.round(200 * pct), 4).fill(0x2196F3);
        this._rowContainer.addChild(bar);
      }

      // Dispatch button (only for IDLE routes)
      if (route.status === 'IDLE' || route.status === 'STALLED') {
        const btn = new Graphics();
        btn.rect(8, y + 22, 60, 14).fill(0x1A3A1A);
        btn.rect(8, y + 22, 60, 14).stroke({ width: 1, color: 0x4CAF50 });
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        const routeId = route.routeId;
        btn.on('pointerdown', () => this._onDispatch?.(routeId));
        this._rowContainer.addChild(btn);

        const btnStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#4CAF50' });
        const btnText = new Text({ text: 'DISPATCH', style: btnStyle });
        btnText.x = 11;
        btnText.y = y + 25;
        this._rowContainer.addChild(btnText);
      }
    });
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this.container.visible = v;
  }

  toggle(): void {
    this.setVisible(!this._visible);
  }

  get visible(): boolean {
    return this._visible;
  }
}
