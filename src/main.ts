import { Application } from 'pixi.js';
import { SceneManager } from '@scenes/SceneManager';
import { BootScene } from '@scenes/BootScene';
import { inputManager } from '@services/InputManager';
import { EventBus } from '@services/EventBus';

async function main(): Promise<void> {
  const app = new Application();

  await app.init({
    resizeTo: window,
    backgroundColor: 0x0D1B3E,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Missing #game-container');
  container.appendChild(app.canvas);

  inputManager.mount();

  const sceneManager = new SceneManager(app);
  sceneManager.register('boot', async () => new BootScene());

  // Fullscreen toggle per spec 16
  inputManager.onAction((action) => {
    if (action === 'fullscreen_toggle') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        EventBus.emit('fullscreen:toggled', true);
      } else {
        document.exitFullscreen().catch(() => {});
        EventBus.emit('fullscreen:toggled', false);
      }
    }
  });

  app.ticker.add((ticker) => {
    const delta = ticker.deltaMS / 1000;
    sceneManager.update(delta);
    inputManager.flush();
  });

  await sceneManager.switchTo('boot');
}

main().catch(console.error);
