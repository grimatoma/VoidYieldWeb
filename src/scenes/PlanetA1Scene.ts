import type { Scene } from './SceneManager';
import { Application, Container, Graphics } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { MinimapOverlay } from '../ui/MinimapOverlay';
import { inputManager } from '@services/InputManager';

const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 2000;

const SITE_POSITIONS: Array<{ id: string; x: number; y: number }> = [
  { id: 'A1-S1', x: 400,  y: 300  },
  { id: 'A1-S2', x: 900,  y: 250  },
  { id: 'A1-S3', x: 1500, y: 400  },
  { id: 'A1-S4', x: 600,  y: 1200 },
  { id: 'A1-S5', x: 1400, y: 1500 },
  { id: 'A1-S6', x: 2200, y: 900  },
];

export class PlanetA1Scene implements Scene {
  readonly id = 'planet_a1';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private minimap!: MinimapOverlay;
  private sites: IndustrialSite[] = [];

  async enter(app: Application): Promise<void> {
    this.app = app;

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: navy #0D1B3E rect
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fill(0x0D1B3E);
    this.worldContainer.addChild(bg);

    // 3. Visual world border (4 thin rects, color 0x334477, 2px thick)
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x334477);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x334477);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x334477);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x334477);
    this.worldContainer.addChild(border);

    // 4. Industrial sites
    this.sites = SITE_POSITIONS.map(p => new IndustrialSite(p.id, p.x, p.y));
    for (const site of this.sites) this.worldContainer.addChild(site.container);

    // 5. Player
    this.player = new Player(600, 600);
    this.worldContainer.addChild(this.player.container);

    // 6. Camera
    this.camera = new Camera(
      this.worldContainer,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this.camera.mount(app.canvas);

    // 7. Minimap HUD (added to stage, not worldContainer)
    this.minimap = new MinimapOverlay(WORLD_WIDTH, WORLD_HEIGHT, app.screen.width, app.screen.height);
    app.stage.addChild(this.minimap.container);
  }

  update(delta: number): void {
    this.player.update(delta, inputManager, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    this.camera.follow({ x: this.player.x, y: this.player.y });
    this.minimap.update({ x: this.player.x, y: this.player.y });
  }

  exit(): void {
    this.camera.unmount(this.app.canvas);
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
