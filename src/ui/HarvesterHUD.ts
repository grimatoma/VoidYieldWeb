import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { HarvesterBase } from '@entities/HarvesterBase';

export class HarvesterHUD {
  readonly container: Container;
  private bar: Graphics;
  private stateText: Text;
  private harvester: HarvesterBase;

  constructor(harvester: HarvesterBase) {
    this.harvester = harvester;
    this.container = new Container();
    // Position above harvester square: y = -28
    this.container.y = -28;

    // Hopper fill bar background (24px wide, 4px tall)
    const barBg = new Graphics();
    barBg.rect(-12, 0, 24, 4).fill(0x333333);
    this.container.addChild(barBg);

    // Fill indicator (updated each frame)
    this.bar = new Graphics();
    this.container.addChild(this.bar);

    // State text
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#FFFFFF' });
    this.stateText = new Text({ text: '', style });
    this.stateText.x = -12;
    this.stateText.y = 6;
    this.container.addChild(this.stateText);
  }

  update(): void {
    const pct = this.harvester.hopperFillPct;
    const color = pct < 0.8 ? 0x4CAF50 : pct < 0.95 ? 0xFF9800 : 0xF44336;
    this.bar.clear();
    this.bar.rect(-12, 0, Math.round(24 * pct), 4).fill(color);

    const icons: Record<string, string> = {
      RUNNING: '▶', FUEL_EMPTY: '⛽', HOPPER_FULL: '■', IDLE: '…'
    };
    this.stateText.text = icons[this.harvester.state] ?? '';
  }
}
