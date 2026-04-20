import { Container, Text, TextStyle } from 'pixi.js';
import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';

export class HudOverlay {
  readonly container: Container;
  private creditsText: Text;
  private rpText: Text;

  constructor() {
    this.container = new Container();
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#D4A843',
    });
    this.creditsText = new Text({ text: `Credits: ${Math.floor(gameState.credits)} CR`, style });
    this.creditsText.x = 10;
    this.creditsText.y = 10;
    this.container.addChild(this.creditsText);

    const rpStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: '#9C27B0',
    });
    this.rpText = new Text({ text: `RP: ${Math.floor(gameState.researchPoints)}`, style: rpStyle });
    this.rpText.x = 10;
    this.rpText.y = 28;
    this.container.addChild(this.rpText);

    EventBus.on('credits:changed', this._onCredits);
    EventBus.on('rp:changed', this._onRp);
  }

  destroy(): void {
    EventBus.off('credits:changed', this._onCredits);
    EventBus.off('rp:changed', this._onRp);
  }

  private _onCredits = (credits: number): void => {
    this.creditsText.text = `Credits: ${Math.floor(credits)} CR`;
  };

  private _onRp = (rp: number): void => {
    this.rpText.text = `RP: ${rp.toFixed(1)}`;
  };
}
