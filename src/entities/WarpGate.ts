import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

/** Build cost for the Warp Gate */
export const WARP_GATE_COST = { credits: 20000, void_cores: 50, alloy_rods: 100 };

export class WarpGate {
  readonly container: Container;
  readonly x: number;
  readonly y: number;
  private _isBuilt = false;
  private _isActive = false;
  private body!: Graphics;
  private statusLabel!: Text;

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
    this.statusLabel = new Text({ text: 'WARP GATE\n[UNBUILT]', style });
    this.statusLabel.anchor.set(0.5);
    this.statusLabel.y = -50;
    this.container.addChild(this.statusLabel);
  }

  private _drawState(): void {
    this.body.clear();
    if (!this._isBuilt) {
      // Unbuilt: grey outline
      this.body.circle(0, 0, 40).stroke({ width: 3, color: 0x444444 });
      this.body.circle(0, 0, 30).stroke({ width: 2, color: 0x333333 });
    } else if (this._isActive) {
      // Active: golden ring with teal glow
      this.body.circle(0, 0, 48).fill({ color: 0x003040, alpha: 0.8 });
      this.body.circle(0, 0, 45).stroke({ width: 4, color: 0x00B8D4 });
      this.body.circle(0, 0, 35).stroke({ width: 3, color: 0xD4A843 });
      this.body.circle(0, 0, 15).fill({ color: 0x00B8D4, alpha: 0.6 });
    } else {
      // Built but not active: amber ring
      this.body.circle(0, 0, 45).stroke({ width: 4, color: 0xD4A843 });
      this.body.circle(0, 0, 32).stroke({ width: 2, color: 0x886622 });
    }
  }

  /**
   * Attempt to build the Warp Gate. Deducts resources from depot stockpile.
   * Returns true if build succeeded.
   */
  build(depot: StorageDepot): boolean {
    if (this._isBuilt) return false;
    const stock = depot.getStockpile();
    if ((stock.get('void_cores') ?? 0) < WARP_GATE_COST.void_cores) return false;
    if ((stock.get('alloy_rods') ?? 0) < WARP_GATE_COST.alloy_rods) return false;
    if (gameState.credits < WARP_GATE_COST.credits) return false;

    depot.pull('void_cores', WARP_GATE_COST.void_cores);
    depot.pull('alloy_rods', WARP_GATE_COST.alloy_rods);
    gameState.addCredits(-WARP_GATE_COST.credits);

    this._isBuilt = true;
    this._isActive = true;
    this._drawState();
    this.statusLabel.text = 'WARP GATE\n[ACTIVE]';
    EventBus.emit('warpgate:built');
    return true;
  }

  /** Force-activate for testing/debug */
  activate(): void {
    this._isBuilt = true;
    this._isActive = true;
    this._drawState();
    this.statusLabel.text = 'WARP GATE\n[ACTIVE]';
    EventBus.emit('warpgate:built');
  }

  get isBuilt(): boolean { return this._isBuilt; }
  get isActive(): boolean { return this._isActive; }
}
