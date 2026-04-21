import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { gameState } from '@services/GameState';

export class ResearchLab {
  static readonly RP_PER_MIN = 1.0;
  static readonly COST_CR = 1500;
  static readonly CRYSTAL_COST = 30;  // Crystal Lattices required

  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private _timer = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Visual: 52×40 purple-tinted building
    const gfx = new Graphics();
    gfx.rect(-26, -20, 52, 40).fill(0x1A1040).stroke({ width: 2, color: 0x9C27B0 });
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#9C27B0' });
    const label = new Text({ text: 'LAB', style });
    label.anchor.set(0.5);
    this.container.addChild(label);
  }

  update(delta: number): void {
    this._timer += delta;
    if (this._timer >= 60) {
      this._timer -= 60;
      gameState.addResearchPoints(ResearchLab.RP_PER_MIN);
    }
  }

  isNearby(px: number, py: number, radius = 60): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'OPEN', target: 'RESEARCH' };
  }
}
