import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from './SceneManager';
import { saveManager, defaultSaveData } from '@services/SaveManager';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';

export class BootScene implements Scene {
  readonly id = 'boot';

  async enter(app: Application): Promise<void> {
    // Navy background per spec 13 (#0D1B3E)
    const bg = new Graphics();
    bg.rect(0, 0, app.screen.width, app.screen.height);
    bg.fill(0x0D1B3E);
    app.stage.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 24,
      fill: '#D4A843',
      align: 'center',
    });

    const title = new Text({ text: 'VOIDYIELD', style });
    title.anchor.set(0.5);
    title.x = app.screen.width / 2;
    title.y = app.screen.height / 2 - 40;
    app.stage.addChild(title);

    const subStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: '#4A90D9' });
    const sub = new Text({ text: 'Loading…', style: subStyle });
    sub.anchor.set(0.5);
    sub.x = app.screen.width / 2;
    sub.y = app.screen.height / 2 + 10;
    app.stage.addChild(sub);

    // Restore or init save state
    const saved = saveManager.loadGame();
    if (saved) {
      gameState.applyFromSave(saved);
    } else {
      gameState.applyFromSave(defaultSaveData());
    }

    sub.text = saved ? 'Save loaded.' : 'New game.';

    // Start autosave
    saveManager.startAutosave(() => ({
      ...defaultSaveData(),
      ...gameState.serialize(),
    }));

    EventBus.emit('game:loaded');

    // Brief splash pause then navigate to saved planet
    await new Promise<void>(resolve => setTimeout(resolve, 800));
    EventBus.emit('scene:travel', `planet_${gameState.currentPlanet}`);
  }

  update(_delta: number): void {}

  exit(): void {
    saveManager.stopAutosave();
  }
}
