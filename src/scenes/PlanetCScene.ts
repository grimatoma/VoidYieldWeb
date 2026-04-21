import type { Scene } from './SceneManager';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { MinimapOverlay } from '../ui/MinimapOverlay';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_C } from '../data/deposits_c';
import { StorageDepot } from '@entities/StorageDepot';
import { miningService } from '@services/MiningService';
import { harvesterManager } from '@services/HarvesterManager';
import { GasCollector } from '@entities/GasCollector';
import { fleetManager } from '@services/FleetManager';
import { GalaxyMap } from '@ui/GalaxyMap';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { logisticsManager } from '@services/LogisticsManager';
import type { UILayer } from '@ui/UILayer';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 3000;

const SITE_POSITIONS_C: Array<{ id: string; x: number; y: number }> = [
  { id: 'C-S1',  x: 400,  y: 300  }, { id: 'C-S2',  x: 900,  y: 200  },
  { id: 'C-S3',  x: 1400, y: 350  }, { id: 'C-S4',  x: 1900, y: 250  },
  { id: 'C-S5',  x: 2500, y: 400  }, { id: 'C-S6',  x: 3200, y: 300  },
  { id: 'C-S7',  x: 300,  y: 900  }, { id: 'C-S8',  x: 800,  y: 1000 },
  { id: 'C-S9',  x: 1400, y: 800  }, { id: 'C-S10', x: 2000, y: 900  },
  { id: 'C-S11', x: 2700, y: 1000 }, { id: 'C-S12', x: 3500, y: 900  },
  { id: 'C-S13', x: 500,  y: 1700 }, { id: 'C-S14', x: 1200, y: 1800 },
  { id: 'C-S15', x: 2000, y: 2000 }, { id: 'C-S16', x: 2800, y: 1900 },
  { id: 'C-S17', x: 1000, y: 2500 }, { id: 'C-S18', x: 3000, y: 2600 },
];

export class PlanetCScene implements Scene {
  readonly id = 'planet_c';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private minimap!: MinimapOverlay;
  private sites: IndustrialSite[] = [];
  private storageDepot!: StorageDepot;
  private unsubInteract?: () => void;
  private gasCollector!: GasCollector;
  private banner!: Text;
  private galaxyMap!: GalaxyMap;

  async enter(app: Application): Promise<void> {
    this.app = app;

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: very dark red-black 0x150810 (void-touched, alien)
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fill(0x150810);
    this.worldContainer.addChild(bg);

    // 3. Visual world border (4 thin rects, color 0x3A1A2A, 2px thick)
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x3A1A2A);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x3A1A2A);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x3A1A2A);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x3A1A2A);
    this.worldContainer.addChild(border);

    // 4. Industrial sites (18 positions for larger world)
    this.sites = SITE_POSITIONS_C.map(p => new IndustrialSite(p.id, p.x, p.y));
    for (const site of this.sites) this.worldContainer.addChild(site.container);

    // 5. Deposits
    depositMap.loadPlanet(DEPOSITS_C, this.worldContainer);

    // 6. Gas collector on deposit c-g1 (700, 300)
    this.gasCollector = new GasCollector(700, 300, 80);
    harvesterManager.add(this.gasCollector, this.worldContainer);

    // 7. Storage depot (center of world)
    this.storageDepot = new StorageDepot(2000, 1500);
    this.worldContainer.addChild(this.storageDepot.container);

    // 8. Player (start at 500, 500)
    this.player = new Player(500, 500);
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

    // 11. Banner: "SHATTERED RING — Void-Touched Ore quality is unpredictable"
    this.banner = new Text({
      text: 'SHATTERED RING — Void-Touched Ore quality is unpredictable',
      style: new TextStyle({
        fontSize: 12,
        fill: 0xE91E63,
        fontWeight: 'bold',
      }),
    });
    this.banner.position.set(10, 50);
    app.stage.addChild(this.banner);

    // 13. Galaxy Map — HTML, owned by UILayer.
    const uiC = (window as unknown as { __voidyield_uiLayer?: { galaxyMap: GalaxyMap | null } }).__voidyield_uiLayer;
    this.galaxyMap = uiC!.galaxyMap!;
    this.galaxyMap.onTravel((planetId) => {
      EventBus.emit('scene:travel', planetId);
    });
    this.galaxyMap.setPlanets([
      { id: 'planet_a1', label: 'Planet A1', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a2', label: 'A2 Asteroid', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_b',  label: 'Planet B',  x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_c',  label: 'Planet C',  x: 0, y: 0, unlocked: true, current: true },
      { id: 'planet_a3', label: 'A3 (Void Nexus)', x: 0, y: 0, unlocked: true, current: false },
    ]);

    // 14. Mark Planet C as visited
    gameState.visitPlanetC();

    // 15. Mining service wiring
    miningService.setDepot(this.storageDepot);
    logisticsManager.registerPlanet('planet_c', this.storageDepot);
    this.unsubInteract = inputManager.onAction((action, pressed) => {
      if (action === 'pause_menu' && pressed) {
        const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        ui?.closeAllPanels();
      }
      if (action === 'interact' && pressed) {
        const harvesterResult = harvesterManager.onInteract(this.player.x, this.player.y);
        if (harvesterResult === null) {
          miningService.onInteract(this.player.x, this.player.y);
        }
      }
      if (action === 'fleet_dispatch' && pressed) {
        fleetManager.fleetDispatch();
      }
      if (action === 'galaxy_map' && pressed) {
        this.galaxyMap.toggle();
      }
      if (action === 'inventory' && pressed) {
        const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        if (ui?.inventoryPanel?.visible) {
          ui.closeAllPanels();
        } else {
          ui?.inventoryPanel?.setDepot(this.storageDepot);
          ui?.inventoryPanel?.open();
        }
      }
    });
  }

  update(delta: number): void {
    this.player.update(delta, inputManager, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    this.camera.follow({ x: this.player.x, y: this.player.y });
    this.minimap.update({ x: this.player.x, y: this.player.y });
    miningService.update(delta, { x: this.player.x, y: this.player.y });
    harvesterManager.update(delta);
    fleetManager.update(delta);
  }

  exit(): void {
    this.unsubInteract?.();
    this.camera.unmount(this.app.canvas);
    harvesterManager.clear(this.worldContainer);
    fleetManager.clear();
    logisticsManager.unregisterPlanet('planet_c');
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
