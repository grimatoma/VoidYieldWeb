import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';
import { sectorManager } from '@services/SectorManager';

export class SectorCompleteOverlay {
  private container: Container;
  private app: Application;
  private _visible = false;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.container.visible = false;
    app.stage.addChild(this.container);

    // Listen for sector complete
    EventBus.on('sector:complete', () => this.show());
  }

  show(): void {
    this._visible = true;
    this.container.visible = true;
    this.container.removeChildren();
    this._build();
  }

  hide(): void {
    this._visible = false;
    this.container.visible = false;
  }

  private _build(): void {
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Dark overlay
    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.92 });
    this.container.addChild(bg);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 28, fill: '#D4A843', align: 'center' });
    const title = new Text({ text: 'SURVEY COMPLETE', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 60;
    this.container.addChild(title);

    const subStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: '#00B8D4', align: 'center' });
    const sub = new Text({ text: 'ALL DEPOSITS CATALOGUED\nSECTOR EXTRACTION AT MAXIMUM EFFICIENCY', style: subStyle });
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = 110;
    this.container.addChild(sub);

    // Stats panel
    const statsY = 180;
    const statsData = [
      ['SECTOR', `#${gameState.sectorNumber}`],
      ['CREDITS REMAINING', `${gameState.credits.toLocaleString()} CR`],
      ['RESEARCH POINTS', `${gameState.researchPoints} RP`],
      ['VOID CORES PRODUCED', `${gameState.voidCoresProduced}`],
      ['TECH NODES UNLOCKED', `${gameState.techTreeUnlocks.length} / 47`],
    ];

    statsData.forEach(([label, value], i) => {
      const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: '#CCCCCC' });
      const valStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: '#D4A843' });
      const rowText = new Text({ text: label + ':', style: rowStyle });
      const valText = new Text({ text: value, style: valStyle });
      rowText.x = W / 2 - 200;
      rowText.y = statsY + i * 28;
      valText.x = W / 2 + 20;
      valText.y = statsY + i * 28;
      this.container.addChild(rowText, valText);
    });

    // "INITIATE PRESTIGE" button
    const btnY = H - 100;
    const btn = new Graphics();
    btn.rect(W / 2 - 120, btnY, 240, 50).fill(0x1A3050);
    btn.rect(W / 2 - 120, btnY, 240, 50).stroke({ width: 2, color: 0xD4A843 });
    btn.interactive = true;
    btn.cursor = 'pointer';
    this.container.addChild(btn);

    const btnStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: '#D4A843' });
    const btnLabel = new Text({ text: 'INITIATE PRESTIGE', style: btnStyle });
    btnLabel.anchor.set(0.5);
    btnLabel.x = W / 2;
    btnLabel.y = btnY + 25;
    this.container.addChild(btnLabel);

    btn.on('pointerdown', () => {
      this.hide();
      EventBus.emit('prestige:initiate');
    });

    // Previous sector bonuses (if any)
    const existing = sectorManager.sectorBonuses;
    if (existing.length > 0) {
      const bonusStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#888888' });
      const bonusText = new Text({ text: 'ACTIVE BONUSES: ' + existing.join(', '), style: bonusStyle });
      bonusText.anchor.set(0.5, 0);
      bonusText.x = W / 2;
      bonusText.y = H - 140;
      this.container.addChild(bonusText);
    }
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this.container.parent?.removeChild(this.container);
  }
}
