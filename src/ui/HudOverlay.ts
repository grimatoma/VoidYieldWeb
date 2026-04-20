import { Container, Text, TextStyle } from 'pixi.js';
import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';

export class HudOverlay {
  readonly container: Container;
  private creditsText: Text;

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

    EventBus.on('credits:changed', this._onCredits);
  }

  destroy(): void {
    EventBus.off('credits:changed', this._onCredits);
  }

  private _onCredits = (credits: number): void => {
    this.creditsText.text = `Credits: ${Math.floor(credits)} CR`;
  };
}
