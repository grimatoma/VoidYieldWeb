import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

export const GALACTIC_HUB_COST = {
  credits: 30000,
  steel_bars: 200,
  alloy_rods: 100,
  void_cores: 50,
};

export class GalacticHub {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  private _isBuilt = false;
  private body!: Graphics;
  private statusLabel!: Text;

  /** Sell price multiplier for goods sold through A3 (1.2 = +20%) */
  static readonly SELL_BONUS = 1.2;
  /** RP generation multiplier when Galactic Hub is active */
  static readonly RP_MULTIPLIER = 2.0;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
    this._buildVisual();
  }

  private _buildVisual(): void {
    this.body = new Graphics();
    this._drawState();
    this.container.addChild(this.body);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
    this.statusLabel = new Text({ text: 'GALACTIC HUB\n[UNBUILT]', style });
    this.statusLabel.anchor.set(0.5);
    this.statusLabel.y = -60;
    this.container.addChild(this.statusLabel);
  }

  private _drawState(): void {
    this.body.clear();
    if (!this._isBuilt) {
      // Unbuilt: grey hexagon outline
      this.body.rect(-40, -40, 80, 80).stroke({ width: 3, color: 0x444444 });
    } else {
      // Built: golden hub with teal accent
      this.body.rect(-44, -44, 88, 88).fill({ color: 0x1A1A2E, alpha: 0.9 });
      this.body.rect(-44, -44, 88, 88).stroke({ width: 4, color: 0xD4A843 });
      this.body.rect(-30, -30, 60, 60).stroke({ width: 2, color: 0x00B8D4 });
      this.body.circle(0, 0, 12).fill({ color: 0xD4A843 });
      // Corner accents
      for (const [cx, cy] of [[-36, -36], [36, -36], [-36, 36], [36, 36]] as const) {
        this.body.circle(cx, cy, 4).fill({ color: 0x00B8D4 });
      }
    }
  }

  build(depot: StorageDepot): boolean {
    if (this._isBuilt) return false;
    const stock = depot.getStockpile();
    if ((stock.get('steel_bars') ?? 0) < GALACTIC_HUB_COST.steel_bars) return false;
    if ((stock.get('alloy_rods') ?? 0) < GALACTIC_HUB_COST.alloy_rods) return false;
    if ((stock.get('void_cores') ?? 0) < GALACTIC_HUB_COST.void_cores) return false;
    if (gameState.credits < GALACTIC_HUB_COST.credits) return false;

    depot.pull('steel_bars', GALACTIC_HUB_COST.steel_bars);
    depot.pull('alloy_rods', GALACTIC_HUB_COST.alloy_rods);
    depot.pull('void_cores', GALACTIC_HUB_COST.void_cores);
    gameState.addCredits(-GALACTIC_HUB_COST.credits);

    this._isBuilt = true;
    this._drawState();
    this.statusLabel.text = 'GALACTIC HUB\n[ACTIVE]';
    EventBus.emit('galactichub:built');
    return true;
  }

  activate(): void {
    this._isBuilt = true;
    this._drawState();
    this.statusLabel.text = 'GALACTIC HUB\n[ACTIVE]';
    EventBus.emit('galactichub:built');
  }

  get isBuilt(): boolean { return this._isBuilt; }
}
