import { Container, Graphics, Text, TextStyle } from 'pixi.js';

let _floraIdCounter = 0;

export class AethonFlora {
  readonly id: string;
  readonly container: Container;
  x: number;
  y: number;
  private _resinReady = true;
  private _harvestCooldown = 0;
  static readonly HARVEST_COOLDOWN_SEC = 720; // 12 in-game minutes (spec 03)
  static readonly YIELD_PER_HARVEST = 3; // midpoint of 2-5 range

  constructor(x: number, y: number) {
    this.id = `flora-${_floraIdCounter++}`;
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Visual: small green organic shape
    const body = new Graphics();
    body.circle(0, 0, 8).fill(0x2e7d32);
    body.circle(0, -6, 5).fill(0x388e3c);
    body.circle(-5, 3, 4).fill(0x388e3c);
    body.circle(5, 3, 4).fill(0x388e3c);
    this.container.addChild(body);

    const label = new Text({
      text: '♠',
      style: new TextStyle({ fontSize: 10, fill: '#4CAF50' }),
    });
    label.anchor.set(0.5);
    label.y = -14;
    this.container.addChild(label);
  }

  update(delta: number): void {
    if (!this._resinReady) {
      this._harvestCooldown -= delta;
      if (this._harvestCooldown <= 0) {
        this._resinReady = true;
        this.container.alpha = 1.0;
      }
    }
  }

  /** Returns Bio-Resin yield if ready, 0 if on cooldown. */
  harvest(): number {
    if (!this._resinReady) return 0;
    this._resinReady = false;
    this._harvestCooldown = AethonFlora.HARVEST_COOLDOWN_SEC;
    this.container.alpha = 0.45; // visual "depleted" state
    return AethonFlora.YIELD_PER_HARVEST;
  }

  get isReady(): boolean {
    return this._resinReady;
  }
}
