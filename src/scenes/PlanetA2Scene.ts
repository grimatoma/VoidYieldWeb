import type { Scene } from './SceneManager';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_A2 } from '../data/deposits_a2';
import { GalaxyMap } from '@ui/GalaxyMap';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { UILayer } from '@ui/UILayer';

const WORLD_WIDTH = 600;
const WORLD_HEIGHT = 400;

interface RespawnTimer {
  depositId: string;
  timer: number;
  initialYield: number;
}

export class PlanetA2Scene implements Scene {
  readonly id = 'planet_a2';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private galaxyMap!: GalaxyMap;
  private unsubInteract?: () => void;
  private _cacheFound = false;
  private _cacheNoticeTimer = 0;
  private _cacheNoticeText?: Text;
  private _respawnTimers: RespawnTimer[] = [];

  async enter(app: Application): Promise<void> {
    this.app = app;

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: dark grey-brown
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fill(0x1A1510);
    this.worldContainer.addChild(bg);

    // 3. Visual world border
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x443322);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x443322);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x443322);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x443322);
    this.worldContainer.addChild(border);

    // 4. Deposits
    depositMap.loadPlanet(DEPOSITS_A2, this.worldContainer);

    // 5. Secret cache (golden circle at 450, 120)
    const cacheCircle = new Graphics();
    cacheCircle.circle(450, 120, 4).fill(0xFFD700);
    this.worldContainer.addChild(cacheCircle);

    // 6. Player
    this.player = new Player(100, 200);
    this.worldContainer.addChild(this.player.container);

    // 7. Camera
    this.camera = new Camera(
      this.worldContainer,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this.camera.mount(app.canvas);
    this.camera.onTap((wx, wy) => this.player.setMoveTarget(wx, wy));

    // 9. Top banner
    const bannerBg = new Graphics();
    bannerBg.rect(0, 0, app.screen.width, 36).fill({ color: 0x000000, alpha: 0.7 });
    app.stage.addChild(bannerBg);

    const bannerStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: '#D4A843',
    });
    const bannerText = new Text({
      text: 'A2 TRANSIT ASTEROID — Return to A1 via Galaxy Map [G]',
      style: bannerStyle,
    });
    bannerText.x = 10;
    bannerText.y = 10;
    app.stage.addChild(bannerText);

    // 11. Galaxy Map — HTML, owned by UILayer.
    const uiA2 = (window as unknown as { __voidyield_uiLayer?: { galaxyMap: GalaxyMap | null } }).__voidyield_uiLayer;
    this.galaxyMap = uiA2!.galaxyMap!;
    this.galaxyMap.onTravel((planetId) => {
      EventBus.emit('scene:travel', planetId);
    });
    this.galaxyMap.setPlanets([
      { id: 'planet_a1', label: 'Planet A1', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a2', label: 'A2 Asteroid', x: 0, y: 0, unlocked: true, current: true },
      { id: 'planet_b', label: 'Planet B', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_c', label: 'Planet C', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a3', label: 'A3 (Void Nexus)', x: 0, y: 0, unlocked: true, current: false },
    ]);

    // 12. Visit A2 on entry
    gameState.visitA2();
    gameState.setCurrentPlanet('planet_a2');

    // 13. Input handling
    this.unsubInteract = inputManager.onAction((action, pressed) => {
      if (action === 'pause_menu' && pressed) {
        const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        ui?.closeAllPanels();
      }
      if (action === 'interact' && pressed) {
        this._handleInteract();
      }
      if (action === 'galaxy_map' && pressed) {
        this.galaxyMap.toggle();
      }
    });
  }

  private _handleInteract(): void {
    // Check for secret cache
    const dx = this.player.x - 450;
    const dy = this.player.y - 120;
    const distToCache = Math.sqrt(dx * dx + dy * dy);

    if (distToCache <= 15 && !this._cacheFound) {
      this._cacheFound = true;
      gameState.addCredits(500);
      this._showCacheNotice();
    }
  }

  private _showCacheNotice(): void {
    // Remove old notice if exists
    if (this._cacheNoticeText && this._cacheNoticeText.parent) {
      this._cacheNoticeText.parent.removeChild(this._cacheNoticeText);
    }

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#FFD700',
    });
    this._cacheNoticeText = new Text({
      text: 'CACHE FOUND: +500 CR',
      style,
    });
    this._cacheNoticeText.anchor.set(0.5);
    this._cacheNoticeText.x = this.app.screen.width / 2;
    this._cacheNoticeText.y = this.app.screen.height / 2;
    this.app.stage.addChild(this._cacheNoticeText);
    this._cacheNoticeTimer = 3.0;
  }

  update(delta: number): void {
    this.player.update(delta, inputManager, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    this.camera.follow({ x: this.player.x, y: this.player.y });

    // Update respawn timers
    for (let i = this._respawnTimers.length - 1; i >= 0; i--) {
      const timer = this._respawnTimers[i];
      timer.timer -= delta;
      if (timer.timer <= 0) {
        const deposit = depositMap.getDeposit(timer.depositId);
        if (deposit) {
          deposit.data.yieldRemaining = timer.initialYield;
          deposit.data.isExhausted = false;
        }
        this._respawnTimers.splice(i, 1);
      }
    }

    // Update cache notice
    if (this._cacheNoticeTimer > 0) {
      this._cacheNoticeTimer -= delta;
      if (this._cacheNoticeTimer <= 0 && this._cacheNoticeText && this._cacheNoticeText.parent) {
        this._cacheNoticeText.parent.removeChild(this._cacheNoticeText);
      }
    }
  }

  exit(): void {
    this.unsubInteract?.();
    this.camera.unmount(this.app.canvas);
    this.app.stage.removeChildren();
  }
}
