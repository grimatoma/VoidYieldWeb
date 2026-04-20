import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';
import { sectorManager } from '@services/SectorManager';
import type { SectorBonus } from '@services/SectorManager';
import { SECTOR_BONUS_DESCRIPTIONS } from '@services/SectorManager';

const ALL_BONUSES: SectorBonus[] = [
  'veteran_miner', 'fleet_commander', 'survey_expert', 'trade_connections',
  'refined_tastes', 'research_heritage', 'harvester_legacy', 'fuel_surplus',
  'pioneer_spirit', 'void_walker',
];

export class PrestigePanel {
  private container: Container;
  private app: Application;
  private _visible = false;
  private _selected: SectorBonus | null = null;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.container.visible = false;
    app.stage.addChild(this.container);

    EventBus.on('prestige:initiate', () => this.show());
  }

  show(): void {
    this._visible = true;
    this._selected = null;
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

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.95 });
    this.container.addChild(bg);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 24, fill: '#D4A843' });
    const title = new Text({ text: 'SELECT SECTOR BONUS', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 40;
    this.container.addChild(title);

    const subStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#888888' });
    const subText = new Text({ text: `Sector ${gameState.sectorNumber} complete. Choose your next sector bonus.`, style: subStyle });
    subText.anchor.set(0.5, 0);
    subText.x = W / 2;
    subText.y = 80;
    this.container.addChild(subText);

    // Bonus option rows — 5 columns × 2 rows
    const startX = W / 2 - 450;
    const startY = 130;
    const colW = 180;
    const rowH = 80;

    ALL_BONUSES.forEach((bonus, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const bx = startX + col * (colW + 10);
      const by = startY + row * (rowH + 10);

      const alreadyOwned = sectorManager.hasSectorBonus(bonus);

      const card = new Graphics();
      card.rect(0, 0, colW, rowH).fill(alreadyOwned ? 0x1A2A10 : 0x0D1B3E);
      card.rect(0, 0, colW, rowH).stroke({ width: 2, color: alreadyOwned ? 0x44AA44 : 0x444466 });
      card.x = bx;
      card.y = by;
      card.interactive = true;
      card.cursor = 'pointer';
      this.container.addChild(card);

      const bonusNameStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: alreadyOwned ? '#44FF44' : '#D4A843', wordWrap: true, wordWrapWidth: colW - 10 });
      const bonusName = new Text({ text: bonus.replace(/_/g, ' ').toUpperCase(), style: bonusNameStyle });
      bonusName.x = bx + 5;
      bonusName.y = by + 5;
      this.container.addChild(bonusName);

      const descStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#AAAAAA', wordWrap: true, wordWrapWidth: colW - 10 });
      const desc = new Text({ text: SECTOR_BONUS_DESCRIPTIONS[bonus], style: descStyle });
      desc.x = bx + 5;
      desc.y = by + 30;
      this.container.addChild(desc);

      card.on('pointerdown', () => {
        this._selected = bonus;
        this._confirmSelection();
      });
    });

    // Back button
    const backBtn = new Graphics();
    backBtn.rect(W / 2 - 60, H - 80, 120, 40).fill(0x1A1A1A);
    backBtn.rect(W / 2 - 60, H - 80, 120, 40).stroke({ width: 2, color: 0x666666 });
    backBtn.interactive = true;
    backBtn.cursor = 'pointer';
    backBtn.on('pointerdown', () => {
      this.hide();
      EventBus.emit('prestige:initiate');  // re-show sector complete
    });
    this.container.addChild(backBtn);

    const backStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: '#888888' });
    const backLabel = new Text({ text: 'BACK', style: backStyle });
    backLabel.anchor.set(0.5);
    backLabel.x = W / 2;
    backLabel.y = H - 60;
    this.container.addChild(backLabel);
  }

  private _confirmSelection(): void {
    if (!this._selected) return;
    sectorManager.applyPrestigeAndReset(this._selected);
    this.hide();
    // Trigger scene travel back to A1 for new sector
    EventBus.emit('scene:travel', 'planet_a1');
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this.container.parent?.removeChild(this.container);
  }
}
