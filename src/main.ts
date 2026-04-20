import { Application } from 'pixi.js';
import { SceneManager } from '@scenes/SceneManager';
import { BootScene } from '@scenes/BootScene';
import { PlanetA1Scene } from '@scenes/PlanetA1Scene';
import { PlanetA2Scene } from '@scenes/PlanetA2Scene';
import { PlanetBScene } from '@scenes/PlanetBScene';
import { PlanetCScene } from '@scenes/PlanetCScene';
import { PlanetA3Scene } from '@scenes/PlanetA3Scene';
import { inputManager } from '@services/InputManager';
import { EventBus } from '@services/EventBus';
import { voidyieldDebugAPI, injectSceneUpdater } from './debug/VoidYieldDebugAPI';
import { UILayer } from '@ui/UILayer';
import '@ui/styles.css';

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

  // Mount HTML UI layer above the PixiJS canvas
  const uiLayer = new UILayer();
  uiLayer.init();

  inputManager.mount();

  const sceneManager = new SceneManager(app);
  sceneManager.register('boot', async () => new BootScene());
  sceneManager.register('planet_a1', async () => new PlanetA1Scene());
  sceneManager.register('planet_a2', async () => new PlanetA2Scene());
  sceneManager.register('planet_b', async () => new PlanetBScene());
  sceneManager.register('planet_c', async () => new PlanetCScene());
  sceneManager.register('planet_a3', async () => new PlanetA3Scene());

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

  // Scene travel via galaxy map
  EventBus.on('scene:travel', async (planetId: string) => {
    await sceneManager.switchTo(planetId);
  });

  app.ticker.add((ticker) => {
    const delta = ticker.deltaMS / 1000;
    sceneManager.update(delta);
    inputManager.flush();
  });

  await sceneManager.switchTo('boot');

  // Mount debug API in dev/test builds for E2E testing
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    injectSceneUpdater((dt) => sceneManager.update(dt));
    window.__voidyield__ = voidyieldDebugAPI;
    console.info('[VoidYield] Debug API mounted at window.__voidyield__');
  }
}

main().catch(console.error);
