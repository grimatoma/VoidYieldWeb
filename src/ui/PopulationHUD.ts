import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { consumptionManager } from '@services/ConsumptionManager';
import { EventBus } from '@services/EventBus';

export class PopulationHUD {
  readonly container: Container;
  private _countText!: Text;
  private _gasBar!: Graphics;
  private _waterBar!: Graphics;
  private _multText!: Text;

  constructor() {
    this.container = new Container();
    // Position bottom-left, above HUD credits area
    this.container.x = 10;
    this.container.y = 60;

    const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#4CAF50' });
    this._countText = new Text({ text: 'Pioneers: 4/0', style: labelStyle });
    this.container.addChild(this._countText);

    // Gas bar label
    const barStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#AAAAAA' });
    const gasLabel = new Text({ text: 'Gas:', style: barStyle });
    gasLabel.x = 0;
    gasLabel.y = 18;
    this.container.addChild(gasLabel);

    // Gas bar background
    const gasBg = new Graphics();
    gasBg.rect(32, 18, 80, 8).fill(0x333333);
    this.container.addChild(gasBg);

    // Gas bar fill
    this._gasBar = new Graphics();
    this.container.addChild(this._gasBar);

    // Water bar label
    const waterLabel = new Text({ text: 'H2O:', style: barStyle });
    waterLabel.x = 0;
    waterLabel.y = 30;
    this.container.addChild(waterLabel);

    // Water bar background
    const waterBg = new Graphics();
    waterBg.rect(32, 30, 80, 8).fill(0x333333);
    this.container.addChild(waterBg);

    // Water bar fill
    this._waterBar = new Graphics();
    this.container.addChild(this._waterBar);

    // Productivity multiplier text
    const multStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#D4A843' });
    this._multText = new Text({ text: 'Prod: 100%', style: multStyle });
    this._multText.y = 42;
    this.container.addChild(this._multText);

    // Listen for events
    EventBus.on('population:changed', this._onPopulation);
    EventBus.on('needs:changed', this._onNeeds);
  }

  private _onPopulation = (count: number, capacity: number): void => {
    this._countText.text = `Pioneers: ${count}/${capacity}`;
  };

  private _onNeeds = (gasPct: number, waterPct: number): void => {
    this._redrawBars(gasPct, waterPct);
    const mult = consumptionManager.productivityMultiplier;
    this._multText.text = `Prod: ${Math.round(mult * 100)}%`;
  };

  private _redrawBars(gasPct: number, waterPct: number): void {
    const gasColor = gasPct >= 1 ? 0x4CAF50 : gasPct >= 0.5 ? 0xFFC107 : 0xF44336;
    this._gasBar.clear().rect(32, 18, Math.round(gasPct * 80), 8).fill(gasColor);

    const waterColor = waterPct >= 1 ? 0x29B6F6 : waterPct >= 0.5 ? 0xFFC107 : 0xF44336;
    this._waterBar.clear().rect(32, 30, Math.round(waterPct * 80), 8).fill(waterColor);
  }

  destroy(): void {
    EventBus.off('population:changed', this._onPopulation);
    EventBus.off('needs:changed', this._onNeeds);
  }
}
