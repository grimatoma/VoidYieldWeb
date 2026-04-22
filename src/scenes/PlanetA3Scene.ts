import type { Scene } from './SceneManager';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_A3 } from '../data/deposits_a3';
import { StorageDepot } from '@entities/StorageDepot';
import { miningService } from '@services/MiningService';
import { harvesterManager } from '@services/HarvesterManager';
import { GasCollector } from '@entities/GasCollector';
import { fleetManager } from '@services/FleetManager';
import { GalaxyMap } from '@ui/GalaxyMap';
import { EventBus } from '@services/EventBus';
import { logisticsManager } from '@services/LogisticsManager';
import { gameState } from '@services/GameState';
import { WarpGate } from '@entities/WarpGate';
import { GalacticHub } from '@entities/GalacticHub';
import type { UILayer } from '@ui/UILayer';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 3000;

const SITE_POSITIONS_A3: Array<{ id: string; x: number; y: number }> = [
  { id: 'A3-S1',  x: 400,  y: 300  }, { id: 'A3-S2',  x: 900,  y: 200  },
  { id: 'A3-S3',  x: 1400, y: 350  }, { id: 'A3-S4',  x: 1900, y: 250  },
  { id: 'A3-S5',  x: 2500, y: 400  }, { id: 'A3-S6',  x: 3200, y: 300  },
  { id: 'A3-S7',  x: 300,  y: 900  }, { id: 'A3-S8',  x: 800,  y: 1000 },
  { id: 'A3-S9',  x: 1400, y: 800  }, { id: 'A3-S10', x: 2000, y: 900  },
  { id: 'A3-S11', x: 2700, y: 1000 }, { id: 'A3-S12', x: 3500, y: 900  },
  { id: 'A3-S13', x: 500,  y: 1700 }, { id: 'A3-S14', x: 1200, y: 1800 },
];

export class PlanetA3Scene implements Scene {
  readonly id = 'planet_a3';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private sites: IndustrialSite[] = [];
  private storageDepot!: StorageDepot;
  private unsubInteract?: () => void;
  private gasCollector!: GasCollector;
  private warpGate!: WarpGate;
  private galacticHub!: GalacticHub;
  private voidNexusLabel!: Text;
  private galaxyMap!: GalaxyMap;

  async enter(app: Application): Promise<void> {
    this.app = app;

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: deep void purple-black 0x080514
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fill(0x080514);
    this.worldContainer.addChild(bg);

    // 3. Visual world border (4 thin rects, color 0x1A0A2E, 2px thick)
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x1A0A2E);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x1A0A2E);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x1A0A2E);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x1A0A2E);
    this.worldContainer.addChild(border);

    // 4. Industrial sites (14 positions)
    this.sites = SITE_POSITIONS_A3.map(p => new IndustrialSite(p.id, p.x, p.y));
    for (const site of this.sites) this.worldContainer.addChild(site.container);

    // 5. Deposits
    depositMap.loadPlanet(DEPOSITS_A3, this.worldContainer);

    // 6. Gas collector on deposit a3-d13 (2600, 1200)
    this.gasCollector = new GasCollector(2600, 1200, 80);
    harvesterManager.add(this.gasCollector, this.worldContainer);

    // 7. Storage depot (center of world)
    this.storageDepot = new StorageDepot(2000, 1500);
    this.worldContainer.addChild(this.storageDepot.container);

    // 8. Warp Gate at (3600, 2600)
    this.warpGate = new WarpGate(3600, 2600);
    this.worldContainer.addChild(this.warpGate.container);

    // 9. Galactic Hub at (3200, 2800)
    this.galacticHub = new GalacticHub(3200, 2800);
    this.worldContainer.addChild(this.galacticHub.container);

    // 10. Player (start at 500, 500)
    this.player = new Player(500, 500);
    this.worldContainer.addChild(this.player.container);

    // 11. Camera
    this.camera = new Camera(
      this.worldContainer,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this.camera.mount(app.canvas);
    this.camera.onTap((wx, wy) => this.player.setMoveTarget(wx, wy));

    // 13. VOID NEXUS label at top
    this.voidNexusLabel = new Text({
      text: 'VOID NEXUS — The richest planet in the sector',
      style: new TextStyle({
        fontSize: 12,
        fill: 0x00B8D4,
        fontWeight: 'bold',
      }),
    });
    this.voidNexusLabel.position.set(10, 50);
    app.stage.addChild(this.voidNexusLabel);

    // 15. Galaxy Map — HTML, owned by UILayer.
    const uiA3 = (window as unknown as { __voidyield_uiLayer?: { galaxyMap: GalaxyMap | null } }).__voidyield_uiLayer;
    this.galaxyMap = uiA3!.galaxyMap!;
    this.galaxyMap.onTravel((planetId) => {
      EventBus.emit('scene:travel', planetId);
    });
    this.galaxyMap.setPlanets([
      { id: 'planet_a1', label: 'Planet A1', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a2', label: 'A2 Asteroid', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_b',  label: 'Planet B',  x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_c',  label: 'Planet C',  x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a3', label: 'A3 (Void Nexus)', x: 0, y: 0, unlocked: true, current: true },
    ]);

    // 16. Mining service wiring
    miningService.setDepot(this.storageDepot);
    logisticsManager.registerPlanet('planet_a3', this.storageDepot);
    gameState.setCurrentPlanet('planet_a3');
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
    miningService.update(delta, { x: this.player.x, y: this.player.y });
    harvesterManager.update(delta);
    fleetManager.update(delta);
  }

  exit(): void {
    this.unsubInteract?.();
    this.camera.unmount(this.app.canvas);
    harvesterManager.clear(this.worldContainer);
    fleetManager.clear();
    logisticsManager.unregisterPlanet('planet_a3');
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
