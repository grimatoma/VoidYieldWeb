import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from './SceneManager';
import { saveManager, defaultSaveData } from '@services/SaveManager';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { sectorManager } from '@services/SectorManager';
import { strandingManager } from '@services/StrandingManager';
import { logisticsManager } from '@services/LogisticsManager';
import { tutorialManager } from '@services/TutorialManager';

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
      tutorialManager.deserialize(saved.tutorial_state);
      // Restore entity/service state from save
      if (saved.sector_manager) {
        sectorManager.deserialize(saved.sector_manager as any);
      }
      if (saved.stranding_manager) {
        strandingManager.deserialize(saved.stranding_manager);
      }
      if (saved.active_trade_routes?.length) {
        logisticsManager.loadRoutes(saved.active_trade_routes);
      }
    } else {
      gameState.applyFromSave(defaultSaveData());
    }

    sub.text = saved ? 'Save loaded.' : 'New game.';

    // Build the state snapshot for autosave
    const getState = () => ({
      ...defaultSaveData(),
      ...gameState.serialize(),
      sector_manager: sectorManager.serialize(),
      stranding_manager: strandingManager.serialize(),
      active_trade_routes: [...logisticsManager.getRoutes()],
      tutorial_state: tutorialManager.serialize(),
    });

    // Start autosave on the interval
    saveManager.startAutosave(getState);

    // Also save immediately whenever a service requests it (e.g. after a tech unlock)
    EventBus.on('game:save-requested', () => {
      saveManager.saveGame(getState());
    });

    EventBus.emit('game:loaded');

    if (tutorialManager.shouldShow()) {
      tutorialManager.start();
    }

    // Brief splash pause then navigate to saved planet
    await new Promise<void>(resolve => setTimeout(resolve, 800));
    EventBus.emit('scene:travel', `planet_${gameState.currentPlanet}`);
  }

  update(_delta: number): void {}

  exit(): void {
    saveManager.stopAutosave();
  }
}
