import type { Scene } from './SceneManager';
import { Application, Container, Graphics } from 'pixi.js';
import { Player } from '@entities/Player';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { MinimapOverlay } from '../ui/MinimapOverlay';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_A1 } from '../data/deposits_a1';
import { StorageDepot } from '@entities/StorageDepot';
import { HudOverlay } from '../ui/HudOverlay';
import { miningService } from '@services/MiningService';
import { harvesterManager } from '@services/HarvesterManager';
import { GasCollector } from '@entities/GasCollector';
import { DroneBay } from '@entities/DroneBay';
import { fleetManager } from '@services/FleetManager';
import { TrafficOverlay } from '../ui/TrafficOverlay';
import { ProcessingPlant } from '@entities/ProcessingPlant';
import { SolarPanel } from '@entities/SolarPanel';
import { ProductionDashboard } from '../ui/ProductionDashboard';
import { ProductionOverlay } from '../ui/ProductionOverlay';
import { SCHEMATICS } from '@data/schematics';
import { TradeHub } from '@entities/TradeHub';
import { ResearchLab } from '@entities/ResearchLab';
import { TechTreePanel } from '../ui/TechTreePanel';
import { HabitationModule } from '@entities/HabitationModule';
import { WaterCondenser } from '@entities/WaterCondenser';
import { PopulationHUD } from '../ui/PopulationHUD';
import { consumptionManager } from '@services/ConsumptionManager';
import { zoneManager } from '@services/ZoneManager';
import { FleetPanel } from '../ui/FleetPanel';
import { CoverageOverlay } from '../ui/CoverageOverlay';
import type { Fabricator } from '@entities/Fabricator';
import { GalaxyMap } from '@ui/GalaxyMap';
import { EventBus } from '@services/EventBus';
import { LogisticsOverlay } from '@ui/LogisticsOverlay';
import { logisticsManager } from '@services/LogisticsManager';

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
  private storageDepot!: StorageDepot;
  private hud!: HudOverlay;
  private unsubInteract?: () => void;
  private droneBay!: DroneBay;
  private trafficOverlay!: TrafficOverlay;
  private processingPlant!: ProcessingPlant;
  private solarPanels: SolarPanel[] = [];
  private productionDashboard!: ProductionDashboard;
  private tradeHub!: TradeHub;
  private researchLab!: ResearchLab;
  private techTreePanel!: TechTreePanel;
  private habitationModule!: HabitationModule;
  private waterCondenser!: WaterCondenser;
  private populationHUD!: PopulationHUD;
  private _dashRefreshTimer = 0;
  private fleetPanel!: FleetPanel;
  private coverageOverlay!: CoverageOverlay;
  private productionOverlay!: ProductionOverlay;
  private fabricators: Fabricator[] = [];
  private galaxyMap!: GalaxyMap;
  private logisticsOverlay!: LogisticsOverlay;

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

    // 5. Deposits
    depositMap.loadPlanet(DEPOSITS_A1, this.worldContainer);

    // 6. Gas collector on gas deposit
    const gasCollector = new GasCollector(300, 900, 80);
    harvesterManager.add(gasCollector, this.worldContainer);

    // 7. Storage depot
    this.storageDepot = new StorageDepot(1400, 1000);
    this.worldContainer.addChild(this.storageDepot.container);

    // Drone Bay at industrial site A1-S2
    this.droneBay = new DroneBay(900, 250);
    this.worldContainer.addChild(this.droneBay.container);

    // Traffic overlay (T key)
    this.trafficOverlay = new TrafficOverlay();
    this.worldContainer.addChild(this.trafficOverlay.container);

    // Fleet panel ([T] key replaces traffic overlay toggle)
    this.fleetPanel = new FleetPanel();
    app.stage.addChild(this.fleetPanel.container);

    // Logistics Overlay ([L] key)
    this.logisticsOverlay = new LogisticsOverlay();
    this.logisticsOverlay.onDispatch((routeId) => {
      logisticsManager.dispatch(routeId);
    });
    app.stage.addChild(this.logisticsOverlay.container);

    // Register this planet's depot with logistics manager
    logisticsManager.registerPlanet('planet_a1', this.storageDepot);

    // Example route for demo (A1→B, steel_bars)
    logisticsManager.addRoute({
      sourcePlanet: 'planet_a1',
      destPlanet: 'planet_b',
      cargoType: 'steel_bars',
      cargoQty: 200,
      cargoClass: 'bulk',
      tripTimeSec: 180,
    });

    // Coverage overlay ([B] key)
    this.coverageOverlay = new CoverageOverlay();
    this.worldContainer.addChild(this.coverageOverlay.container);
    this.coverageOverlay.render([this.droneBay]);

    // Production Overlay ([O] key)
    this.productionOverlay = new ProductionOverlay(WORLD_WIDTH, WORLD_HEIGHT);
    this.worldContainer.addChild(this.productionOverlay.container);

    // Auto-harvest-support zone (GasCollector is at 300,900; depot at 1400,1000)
    zoneManager.enable(300, 900, this.storageDepot);

    // Solar panels (power supply)
    const sp1 = new SolarPanel(450, 340);
    const sp2 = new SolarPanel(500, 340);
    this.solarPanels = [sp1, sp2];
    for (const sp of this.solarPanels) this.worldContainer.addChild(sp.container);

    // Ore Smelter at A1-S1
    this.processingPlant = new ProcessingPlant(400, 300, SCHEMATICS.ore_smelter);
    this.processingPlant.link(this.storageDepot, this.storageDepot);
    this.worldContainer.addChild(this.processingPlant.container);

    // Production dashboard
    this.productionDashboard = new ProductionDashboard();
    app.stage.addChild(this.productionDashboard.container);

    // Trade Hub (no slot required)
    this.tradeHub = new TradeHub(700, 500);
    this.worldContainer.addChild(this.tradeHub.container);

    // Research Lab at A1-S3 (occupies 2 slots)
    this.researchLab = new ResearchLab(1500, 400);
    this.worldContainer.addChild(this.researchLab.container);

    // Tech Tree panel (J key)
    this.techTreePanel = new TechTreePanel();
    app.stage.addChild(this.techTreePanel.container);

    // Habitation Module at A1-S4
    this.habitationModule = new HabitationModule(600, 1200);
    this.worldContainer.addChild(this.habitationModule.container);

    // Water Condenser (no slot required — placeholder, see FIXME in WaterCondenser.ts)
    this.waterCondenser = new WaterCondenser(500, 1200);
    this.waterCondenser.link(this.storageDepot);
    this.worldContainer.addChild(this.waterCondenser.container);

    // Population HUD
    this.populationHUD = new PopulationHUD();
    app.stage.addChild(this.populationHUD.container);

    // Galaxy Map
    this.galaxyMap = new GalaxyMap();
    this.galaxyMap.onTravel((planetId) => {
      EventBus.emit('scene:travel', planetId);
    });
    this.galaxyMap.setPlanets([
      { id: 'planet_a1', label: 'Planet A1', x: 0, y: 0, unlocked: true, current: true },
      { id: 'planet_a2', label: 'A2 Asteroid', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_b', label: 'Planet B', x: 0, y: 0, unlocked: true, current: false },
    ]);
    app.stage.addChild(this.galaxyMap.container);

    // 7. Player
    this.player = new Player(600, 600);
    this.worldContainer.addChild(this.player.container);

    // 8. Camera
    this.camera = new Camera(
      this.worldContainer,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this.camera.mount(app.canvas);

    // 9. Minimap HUD (added to stage, not worldContainer)
    this.minimap = new MinimapOverlay(WORLD_WIDTH, WORLD_HEIGHT, app.screen.width, app.screen.height);
    app.stage.addChild(this.minimap.container);

    // 10. HUD overlay
    this.hud = new HudOverlay();
    app.stage.addChild(this.hud.container);

    // 11. Mining service wiring
    miningService.setDepot(this.storageDepot);
    this.unsubInteract = inputManager.onAction((action, pressed) => {
      if (action === 'interact' && pressed) {
        const harvesterResult = harvesterManager.onInteract(this.player.x, this.player.y);
        if (harvesterResult === null) {
          miningService.onInteract(this.player.x, this.player.y);
        }
      }
      if (action === 'fleet_panel' && pressed) {
        this.fleetPanel.toggle();
      }
      if (action === 'coverage_overlay' && pressed) {
        this.coverageOverlay.setVisible(!this.coverageOverlay.visible);
      }
      if (action === 'fleet_dispatch' && pressed) {
        fleetManager.fleetDispatch();
      }
      if (action === 'production_dashboard' && pressed) {
        this.productionDashboard.toggle();
      }
      if (action === 'production_overlay' && pressed) {
        this.productionOverlay.setVisible(!this.productionOverlay.visible);
      }
      if (action === 'journal' && pressed) {
        this.techTreePanel.toggle();
      }
      if (action === 'galaxy_map' && pressed) {
        this.galaxyMap.toggle();
      }
      if (action === 'logistics_overlay' && pressed) {
        this.logisticsOverlay.toggle();
        if (this.logisticsOverlay.visible) {
          this.logisticsOverlay.refresh(logisticsManager.getRoutes());
        }
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
    zoneManager.update(delta);
    if (this.fleetPanel.visible) this.fleetPanel.update();
    this.trafficOverlay.update(fleetManager.getDrones());
    this.processingPlant.update(delta);
    this.researchLab.update(delta);
    consumptionManager.update(delta, this.storageDepot);
    this.waterCondenser.update(delta);
    logisticsManager.update(delta);
    // Refresh logistics overlay at same cadence as dashboard
    if (this.logisticsOverlay.visible) {
      this.logisticsOverlay.refresh(logisticsManager.getRoutes());
    }
    this._dashRefreshTimer += delta;
    if (this._dashRefreshTimer >= 1.0) {
      this._dashRefreshTimer = 0;
      if (this.productionDashboard.visible) {
        this.productionDashboard.refresh(this.storageDepot, [this.processingPlant], this.fabricators);
      }
    }
    if (this.productionOverlay.visible) {
      this.productionOverlay.render([this.processingPlant], this.fabricators);
    }
  }

  exit(): void {
    this.unsubInteract?.();
    this.hud?.destroy();
    this.populationHUD.destroy();
    this.camera.unmount(this.app.canvas);
    harvesterManager.clear(this.worldContainer);
    fleetManager.clear();
    zoneManager.reset();
    this.processingPlant.destroy();
    for (const sp of this.solarPanels) sp.destroy();
    this.solarPanels = [];
    consumptionManager.reset();
    logisticsManager.unregisterPlanet('planet_a1');
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
