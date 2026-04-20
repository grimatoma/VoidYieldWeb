import type { Scene } from './SceneManager';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { MinimapOverlay } from '../ui/MinimapOverlay';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_B } from '../data/deposits_b';
import { StorageDepot } from '@entities/StorageDepot';
import { HudOverlay } from '../ui/HudOverlay';
import { miningService } from '@services/MiningService';
import { harvesterManager } from '@services/HarvesterManager';
import { GasCollector } from '@entities/GasCollector';
import { fleetManager } from '@services/FleetManager';
import { strandingManager } from '@services/StrandingManager';

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 2400;

const SITE_POSITIONS_B: Array<{ id: string; x: number; y: number }> = [
  { id: 'B-S1',  x: 400,  y: 300  },
  { id: 'B-S2',  x: 900,  y: 200  },
  { id: 'B-S3',  x: 1400, y: 350  },
  { id: 'B-S4',  x: 1900, y: 250  },
  { id: 'B-S5',  x: 2400, y: 400  },
  { id: 'B-S6',  x: 2900, y: 300  },
  { id: 'B-S7',  x: 300,  y: 900  },
  { id: 'B-S8',  x: 800,  y: 1100 },
  { id: 'B-S9',  x: 1400, y: 900  },
  { id: 'B-S10', x: 2000, y: 1000 },
  { id: 'B-S11', x: 2600, y: 1100 },
  { id: 'B-S12', x: 500,  y: 1700 },
  { id: 'B-S13', x: 1300, y: 1800 },
  { id: 'B-S14', x: 2200, y: 1900 },
];

export class PlanetBScene implements Scene {
  readonly id = 'planet_b';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private minimap!: MinimapOverlay;
  private sites: IndustrialSite[] = [];
  private storageDepot!: StorageDepot;
  private hud!: HudOverlay;
  private unsubInteract?: () => void;
  private gasCollector!: GasCollector;
  private strandingBanner!: Text;

  async enter(app: Application): Promise<void> {
    this.app = app;

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: dark teal-purple 0x0B1E2A
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fill(0x0B1E2A);
    this.worldContainer.addChild(bg);

    // 3. Visual world border (4 thin rects, color 0x334466, 2px thick)
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x334466);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x334466);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x334466);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x334466);
    this.worldContainer.addChild(border);

    // 4. Industrial sites
    this.sites = SITE_POSITIONS_B.map(p => new IndustrialSite(p.id, p.x, p.y));
    for (const site of this.sites) this.worldContainer.addChild(site.container);

    // 5. Deposits
    depositMap.loadPlanet(DEPOSITS_B, this.worldContainer);

    // 6. Gas collector on gas deposit b-g1
    this.gasCollector = new GasCollector(400, 500, 80);
    harvesterManager.add(this.gasCollector, this.worldContainer);

    // 7. Storage depot (center of world)
    this.storageDepot = new StorageDepot(1600, 1200);
    this.worldContainer.addChild(this.storageDepot.container);

    // 8. Player
    this.player = new Player(800, 600);
    this.worldContainer.addChild(this.player.container);

    // 9. Camera
    this.camera = new Camera(
      this.worldContainer,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this.camera.mount(app.canvas);

    // 10. Minimap HUD (added to stage, not worldContainer)
    this.minimap = new MinimapOverlay(WORLD_WIDTH, WORLD_HEIGHT, app.screen.width, app.screen.height);
    app.stage.addChild(this.minimap.container);

    // 11. HUD overlay
    this.hud = new HudOverlay();
    app.stage.addChild(this.hud.container);

    // 12. Stranding banner (HUD text)
    this.strandingBanner = new Text({
      text: '⚠ STRANDED — Need 100 RF to launch  [0/100 RF]',
      style: new TextStyle({
        fontSize: 12,
        fill: 0xFF6B6B,
        fontWeight: 'bold',
      }),
    });
    this.strandingBanner.position.set(10, 50);
    app.stage.addChild(this.strandingBanner);

    // 13. Mining service wiring
    miningService.setDepot(this.storageDepot);
    this.unsubInteract = inputManager.onAction((action, pressed) => {
      if (action === 'interact' && pressed) {
        const harvesterResult = harvesterManager.onInteract(this.player.x, this.player.y);
        if (harvesterResult === null) {
          miningService.onInteract(this.player.x, this.player.y);
        }
      }
      if (action === 'fleet_dispatch' && pressed) {
        fleetManager.fleetDispatch();
      }
    });
  }

  update(delta: number): void {
    this.player.update(delta, inputManager, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    this.camera.follow({ x: this.player.x, y: this.player.y });
    this.minimap.update({ x: this.player.x, y: this.player.y });
    miningService.update(delta);
    harvesterManager.update(delta);
    fleetManager.update(delta);

    // Update stranding banner
    if (strandingManager.isStranded) {
      const fuel = strandingManager.rocketFuel;
      this.strandingBanner.text = `⚠ STRANDED — Need 100 RF to launch  [${fuel}/100 RF]`;
      this.strandingBanner.visible = true;
    } else {
      this.strandingBanner.visible = false;
    }
  }

  exit(): void {
    this.unsubInteract?.();
    this.hud?.destroy();
    this.camera.unmount(this.app.canvas);
    harvesterManager.clear(this.worldContainer);
    fleetManager.clear();
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
