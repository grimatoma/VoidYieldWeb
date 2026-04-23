import type { Scene } from './SceneManager';
import { Application, Container, Graphics, Text, TextStyle, TilingSprite, Sprite } from 'pixi.js';
import { Player } from '@entities/Player';
import { simulateOffline } from '@services/OfflineSimulator';
import { assetManager } from '@services/AssetManager';
import { Camera } from '@services/Camera';
import { IndustrialSite } from '@entities/IndustrialSite';
import { inputManager } from '@services/InputManager';
import { depositMap } from '@services/DepositMap';
import { DEPOSITS_A1 } from '../data/deposits_a1';
import { StorageDepot } from '@entities/StorageDepot';
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
import { SCHEMATICS, FABRICATOR_SCHEMATICS } from '@data/schematics';
import { TradeHub } from '@entities/TradeHub';
import { ResearchLab } from '@entities/ResearchLab';
import { HabitationModule } from '@entities/HabitationModule';
import { WaterCondenser } from '@entities/WaterCondenser';
import { consumptionManager } from '@services/ConsumptionManager';
import { zoneManager } from '@services/ZoneManager';
import { miningCircuitManager } from '@services/MiningCircuitManager';
import { FleetPanel } from '../ui/FleetPanel';
import { CoverageOverlay } from '../ui/CoverageOverlay';
import { Fabricator } from '@entities/Fabricator';
import { GalaxyMap } from '@ui/GalaxyMap';
import { EventBus } from '@services/EventBus';
import { LogisticsOverlay } from '@ui/LogisticsOverlay';
import { logisticsManager } from '@services/LogisticsManager';
import { gameState } from '@services/GameState';
import { interactionManager } from '@services/InteractionManager';
import type { UILayer } from '@ui/UILayer';
import { inventory } from '@services/Inventory';
import { planetResources, outpostId } from '@store/gameStore';
import { Launchpad } from '@entities/Launchpad';
import { surveyService } from '@services/SurveyService';
import { obstacleManager } from '@services/ObstacleManager';
import { handleWorldTap } from '@services/TapToMove';

const WORLD_WIDTH = 4800;
const WORLD_HEIGHT = 3600;

// Outpost compound — a walled square in the middle of the planet surface.
// Buildings live inside; deposits and harvesters live outside the walls.
const OUTPOST_CX = 2400;
const OUTPOST_CY = 1800;
const OUTPOST_HALF_W = 320;
const OUTPOST_HALF_H = 270;
const OUTPOST_WALL_THICK = 14;
const OUTPOST_GATE_HALF = 70; // gate gap = 140px on south wall

// Grid coords for the 3x2 inner building slots.
const SLOT = {
  DRONE_BAY:      { x: OUTPOST_CX + 180, y: OUTPOST_CY - 130 },
  RESEARCH_LAB:   { x: OUTPOST_CX,       y: OUTPOST_CY - 130 },
  TRADE_HUB:      { x: OUTPOST_CX - 180, y: OUTPOST_CY - 130 },
  STORAGE_DEPOT:  { x: OUTPOST_CX - 180, y: OUTPOST_CY + 90  },
  PROCESSING:     { x: OUTPOST_CX,       y: OUTPOST_CY + 90  },
  HABITATION:     { x: OUTPOST_CX + 180, y: OUTPOST_CY + 90  },
  WATER_COND:     { x: OUTPOST_CX - 200, y: OUTPOST_CY + 200 },
  FABRICATOR:     { x: OUTPOST_CX - 60,  y: OUTPOST_CY + 200 },
  PLATE_PRESS:    { x: OUTPOST_CX + 60,  y: OUTPOST_CY + 200 },
  SOLAR_A:        { x: OUTPOST_CX + 140, y: OUTPOST_CY + 200 },
  SOLAR_B:        { x: OUTPOST_CX + 200, y: OUTPOST_CY + 200 },
};

const SITE_POSITIONS: Array<{ id: string; x: number; y: number }> = [
  { id: 'A1-S1', x: SLOT.DRONE_BAY.x,     y: SLOT.DRONE_BAY.y },
  { id: 'A1-S2', x: SLOT.RESEARCH_LAB.x,  y: SLOT.RESEARCH_LAB.y },
  { id: 'A1-S3', x: SLOT.TRADE_HUB.x,     y: SLOT.TRADE_HUB.y },
  { id: 'A1-S4', x: SLOT.STORAGE_DEPOT.x, y: SLOT.STORAGE_DEPOT.y },
  { id: 'A1-S5', x: SLOT.PROCESSING.x,    y: SLOT.PROCESSING.y },
  { id: 'A1-S6', x: SLOT.HABITATION.x,    y: SLOT.HABITATION.y },
];

export class PlanetA1Scene implements Scene {
  readonly id = 'planet_a1';
  private app!: Application;
  private worldContainer!: Container;
  private player!: Player;
  private camera!: Camera;
  private sites: IndustrialSite[] = [];
  private storageDepot!: StorageDepot;
  private unsubInteract?: () => void;
  private droneBay!: DroneBay;
  private trafficOverlay!: TrafficOverlay;
  private processingPlant!: ProcessingPlant;
  private platePressPlant!: ProcessingPlant;
  private solarPanels: SolarPanel[] = [];
  private productionDashboard!: ProductionDashboard;
  private tradeHub!: TradeHub;
  private researchLab!: ResearchLab;
  private habitationModule!: HabitationModule;
  private waterCondenser!: WaterCondenser;
  private _dashRefreshTimer = 0;
  private fleetPanel!: FleetPanel;
  private coverageOverlay!: CoverageOverlay;
  private productionOverlay!: ProductionOverlay;
  private fabricators: Fabricator[] = [];
  private galaxyMap!: GalaxyMap;
  private logisticsOverlay!: LogisticsOverlay;
  private launchpad!: Launchpad;
  private _surveyKeyM: (e: KeyboardEvent) => void = () => { /* filled in enter() */ };

  /**
   * Draws the outpost compound — a tiled floor enclosed by four walls with a
   * south-facing gate. The player starts inside and exits through the gate to
   * mine deposits in the surrounding asteroid field.
   */
  private _buildOutpostCompound(): void {
    const left   = OUTPOST_CX - OUTPOST_HALF_W;
    const right  = OUTPOST_CX + OUTPOST_HALF_W;
    const top    = OUTPOST_CY - OUTPOST_HALF_H;
    const bottom = OUTPOST_CY + OUTPOST_HALF_H;
    const gateL  = OUTPOST_CX - OUTPOST_GATE_HALF;
    const gateR  = OUTPOST_CX + OUTPOST_GATE_HALF;

    // Tiled outpost floor under the compound — fallback to a solid fill if
    // the tile texture isn't loaded (tests).
    if (assetManager.has('tile_outpost_floor')) {
      const floor = new TilingSprite({
        texture: assetManager.texture('tile_outpost_floor'),
        width: right - left,
        height: bottom - top,
      });
      floor.x = left;
      floor.y = top;
      floor.alpha = 0.85;
      this.worldContainer.addChild(floor);
    } else {
      const floor = new Graphics();
      floor.rect(left, top, right - left, bottom - top).fill(0x18233d);
      this.worldContainer.addChild(floor);
    }

    // Walls — dark navy fill with amber inner trim.
    const walls = new Graphics();
    const wallColor = 0x141c2f;
    const trimColor = 0xD4A843;
    // Top wall
    walls.rect(left, top, right - left, OUTPOST_WALL_THICK).fill(wallColor);
    walls.rect(left, top + OUTPOST_WALL_THICK - 2, right - left, 2).fill(trimColor);
    // Left wall
    walls.rect(left, top, OUTPOST_WALL_THICK, bottom - top).fill(wallColor);
    walls.rect(left + OUTPOST_WALL_THICK - 2, top, 2, bottom - top).fill(trimColor);
    // Right wall
    walls.rect(right - OUTPOST_WALL_THICK, top, OUTPOST_WALL_THICK, bottom - top).fill(wallColor);
    walls.rect(right - OUTPOST_WALL_THICK, top, 2, bottom - top).fill(trimColor);
    // Bottom wall — split into two pieces around the south-facing gate.
    walls.rect(left, bottom - OUTPOST_WALL_THICK, gateL - left, OUTPOST_WALL_THICK).fill(wallColor);
    walls.rect(gateR, bottom - OUTPOST_WALL_THICK, right - gateR, OUTPOST_WALL_THICK).fill(wallColor);
    walls.rect(left, bottom - 2, gateL - left, 2).fill(trimColor);
    walls.rect(gateR, bottom - 2, right - gateR, 2).fill(trimColor);

    // Gate posts (accent markers on either side of the gate)
    walls.rect(gateL - 4, bottom - OUTPOST_WALL_THICK - 8, 8, OUTPOST_WALL_THICK + 8).fill(trimColor);
    walls.rect(gateR - 4, bottom - OUTPOST_WALL_THICK - 8, 8, OUTPOST_WALL_THICK + 8).fill(trimColor);

    this.worldContainer.addChild(walls);

    // Register wall colliders — five rectangles matching the drawn walls (the
    // south wall is split around the gate gap, which stays passable). Plus a
    // small set of navigation waypoints so drones can path around the outside
    // of the compound to reach the gate.
    obstacleManager.clear();
    obstacleManager.addWall({ x: left,                         y: top,                              w: right - left,              h: OUTPOST_WALL_THICK });
    obstacleManager.addWall({ x: left,                         y: top,                              w: OUTPOST_WALL_THICK,        h: bottom - top });
    obstacleManager.addWall({ x: right - OUTPOST_WALL_THICK,   y: top,                              w: OUTPOST_WALL_THICK,        h: bottom - top });
    obstacleManager.addWall({ x: left,                         y: bottom - OUTPOST_WALL_THICK,      w: gateL - left,              h: OUTPOST_WALL_THICK });
    obstacleManager.addWall({ x: gateR,                        y: bottom - OUTPOST_WALL_THICK,      w: right - gateR,             h: OUTPOST_WALL_THICK });
    const navOffset = 30;
    obstacleManager.addWaypoint({ x: OUTPOST_CX,         y: bottom + navOffset });       // gate approach (outside)
    obstacleManager.addWaypoint({ x: left  - navOffset,  y: bottom + navOffset });       // SW outer corner
    obstacleManager.addWaypoint({ x: right + navOffset,  y: bottom + navOffset });       // SE outer corner
    obstacleManager.addWaypoint({ x: left  - navOffset,  y: top    - navOffset });       // NW outer corner
    obstacleManager.addWaypoint({ x: right + navOffset,  y: top    - navOffset });       // NE outer corner

    // Outpost sign above the top wall — Pixi Text, amber, centered.
    const signStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 22,
      fill: '#D4A843',
      fontWeight: 'bold',
      letterSpacing: 2,
    });
    const sign = new Text({ text: 'OUTPOST A1', style: signStyle });
    sign.anchor.set(0.5, 1);
    sign.x = OUTPOST_CX;
    sign.y = top - 6;
    this.worldContainer.addChild(sign);
  }

  async enter(app: Application): Promise<void> {
    this.app = app;

    // Safety: scrub any orphan children left on stage by a previous scene.
    const stale = [...app.stage.children];
    for (const c of stale) {
      try { c.destroy({ children: true }); } catch {}
    }
    app.stage.removeChildren();

    // 1. World container
    this.worldContainer = new Container();
    app.stage.addChild(this.worldContainer);

    // 2. Background: tiled space field if the texture loaded, else flat navy.
    if (assetManager.has('tile_space_bg')) {
      const tile = new TilingSprite({
        texture: assetManager.texture('tile_space_bg'),
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
      });
      this.worldContainer.addChild(tile);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      bg.fill(0x0D1B3E);
      this.worldContainer.addChild(bg);
    }

    // 2b. Scatter a few ambient rocks so the world doesn't look empty.
    if (assetManager.has('rock_small')) {
      const rockPositions: Array<[number, number, 'rock_small' | 'rock_medium' | 'rock_large']> = [
        [250, 800, 'rock_medium'], [1800, 600, 'rock_small'], [2400, 1500, 'rock_large'],
        [300, 1700, 'rock_small'], [1900, 1800, 'rock_medium'], [2600, 300, 'rock_small'],
        [1100, 1700, 'rock_small'], [2100, 1100, 'rock_medium'], [150, 400, 'rock_small'],
      ];
      for (const [rx, ry, key] of rockPositions) {
        const r = new Sprite(assetManager.texture(key));
        r.anchor.set(0.5);
        r.x = rx;
        r.y = ry;
        r.alpha = 0.85;
        this.worldContainer.addChild(r);
      }
    }

    // 3. Visual world border (4 thin rects, color 0x334477, 2px thick)
    const border = new Graphics();
    border.rect(0, 0, WORLD_WIDTH, 2).fill(0x334477);
    border.rect(0, WORLD_HEIGHT - 2, WORLD_WIDTH, 2).fill(0x334477);
    border.rect(0, 0, 2, WORLD_HEIGHT).fill(0x334477);
    border.rect(WORLD_WIDTH - 2, 0, 2, WORLD_HEIGHT).fill(0x334477);
    this.worldContainer.addChild(border);

    // 3b. Outpost compound — tiled floor and walls with a south-facing gate.
    this._buildOutpostCompound();

    // 4. Industrial sites (inside the compound)
    this.sites = SITE_POSITIONS.map(p => new IndustrialSite(p.id, p.x, p.y));
    for (const site of this.sites) this.worldContainer.addChild(site.container);

    // 5. Deposits
    depositMap.loadPlanet(DEPOSITS_A1, this.worldContainer);

    // 6. Gas collector on gas deposit
    const gasCollector = new GasCollector(300, 900, 80);
    harvesterManager.add(gasCollector, this.worldContainer);

    // 7. Storage depot (inside compound, bottom-left slot)
    this.storageDepot = new StorageDepot(SLOT.STORAGE_DEPOT.x, SLOT.STORAGE_DEPOT.y);
    this.worldContainer.addChild(this.storageDepot.container);

    // Drone Bay — top-left slot inside compound
    this.droneBay = new DroneBay(SLOT.DRONE_BAY.x, SLOT.DRONE_BAY.y);
    this.worldContainer.addChild(this.droneBay.container);

    // Starter Mining Drone so a fresh save has a visible, working drone.
    // No credits charged — gifted to the player. MiningCircuitManager will
    // pick it up and drive it through the SEEK → MINE → HAUL loop.
    const starter = new (await import('@entities/ScoutDrone')).ScoutDrone(this.droneBay.x, this.droneBay.y);
    this.worldContainer.addChild(starter.container);
    this.droneBay['_drones'].push(starter); // direct push avoids the price charge
    fleetManager.add(starter);

    // Traffic overlay (T key)
    this.trafficOverlay = new TrafficOverlay();
    this.worldContainer.addChild(this.trafficOverlay.container);

    // Fleet panel / Logistics overlay are HTML, owned by UILayer. Grab refs.
    const uiInit = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
    this.fleetPanel = uiInit!.fleetPanel!;
    this.logisticsOverlay = uiInit!.logisticsOverlay!;
    this.logisticsOverlay.onDispatch((routeId) => {
      logisticsManager.dispatch(routeId);
    });

    // Register this planet's depot with logistics manager
    logisticsManager.registerPlanet('planet_a1', this.storageDepot);
    gameState.setCurrentPlanet('planet_a1');

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

    // Drone auto-mining dispatcher — makes Mining Drones / Heavy Miners
    // actually mine deposits and deliver to the pool.
    miningCircuitManager.setDepot(this.storageDepot);

    // Solar panels (power supply) — inside compound, east side
    const sp1 = new SolarPanel(SLOT.SOLAR_A.x, SLOT.SOLAR_A.y);
    const sp2 = new SolarPanel(SLOT.SOLAR_B.x, SLOT.SOLAR_B.y);
    this.solarPanels = [sp1, sp2];
    for (const sp of this.solarPanels) this.worldContainer.addChild(sp.container);

    // Ore Smelter — bottom-center slot (Vorax → Steel Bars)
    this.processingPlant = new ProcessingPlant(SLOT.PROCESSING.x, SLOT.PROCESSING.y, SCHEMATICS.ore_smelter);
    this.processingPlant.link(this.storageDepot, this.storageDepot);
    this.worldContainer.addChild(this.processingPlant.container);

    // Plate Press — row-3 center slot (Steel Bars → Steel Plates)
    this.platePressPlant = new ProcessingPlant(SLOT.PLATE_PRESS.x, SLOT.PLATE_PRESS.y, SCHEMATICS.plate_press);
    this.platePressPlant.link(this.storageDepot, this.storageDepot);
    this.worldContainer.addChild(this.platePressPlant.container);

    // Production dashboard — HTML, owned by UILayer.
    this.productionDashboard = uiInit!.productionDashboard!;

    // Trade Hub (SHOP) — top-right slot
    this.tradeHub = new TradeHub(SLOT.TRADE_HUB.x, SLOT.TRADE_HUB.y);
    this.worldContainer.addChild(this.tradeHub.container);

    // Research Lab — top-center slot
    this.researchLab = new ResearchLab(SLOT.RESEARCH_LAB.x, SLOT.RESEARCH_LAB.y);
    this.worldContainer.addChild(this.researchLab.container);

    // Habitation Module — bottom-right slot
    this.habitationModule = new HabitationModule(SLOT.HABITATION.x, SLOT.HABITATION.y);
    this.worldContainer.addChild(this.habitationModule.container);

    // Launchpad / shipyard — compound center. Mirrors the Godot shipyard tile:
    // visible rocket silhouette over an amber pad, interactable for the ship
    // bay panel (mock 19).
    this.launchpad = new Launchpad(OUTPOST_CX, OUTPOST_CY + 10);
    this.worldContainer.addChild(this.launchpad.container);

    // Water Condenser — below bottom-left slot
    this.waterCondenser = new WaterCondenser(SLOT.WATER_COND.x, SLOT.WATER_COND.y);
    this.waterCondenser.link(this.storageDepot);
    this.worldContainer.addChild(this.waterCondenser.container);

    // Fabricator — advanced two-input factory; wired to depot for I/O. Stalls
    // until both inputs are present, but renders so players can see where
    // ship-part crafting will live.
    const fab = new Fabricator(SLOT.FABRICATOR.x, SLOT.FABRICATOR.y, FABRICATOR_SCHEMATICS.drill_head);
    fab.link(this.storageDepot, this.storageDepot);
    this.fabricators.push(fab);
    this.worldContainer.addChild(fab.container);

    // Galaxy Map — HTML, owned by UILayer.
    this.galaxyMap = uiInit!.galaxyMap!;
    this.galaxyMap.onTravel((planetId) => {
      EventBus.emit('scene:travel', planetId);
    });
    this.galaxyMap.setPlanets([
      { id: 'planet_a1', label: 'Planet A1', x: 0, y: 0, unlocked: true, current: true },
      { id: 'planet_a2', label: 'A2 Asteroid', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_b', label: 'Planet B', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_c', label: 'Planet C', x: 0, y: 0, unlocked: true, current: false },
      { id: 'planet_a3', label: 'A3 (Void Nexus)', x: 0, y: 0, unlocked: true, current: false },
    ]);

    // 7. Player — spawn inside compound near the gate (south side)
    this.player = new Player(OUTPOST_CX, OUTPOST_CY + OUTPOST_HALF_H - 60);
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
    // Touch: single-finger tap on the canvas walks the player to that spot,
    // pathfinding around walls. Tapping an ore deposit auto-starts mining
    // once the player arrives (see TapToMove).
    this.camera.onTap((wx, wy) => {
      const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
      ui?.closeAllPanels();

      const buildings = [
        this.droneBay, this.tradeHub, this.launchpad, this.storageDepot,
        this.habitationModule, this.processingPlant, this.platePressPlant,
        this.researchLab, ...this.fabricators
      ];
      const tapped = buildings.find(b => b.isNearby(wx, wy, 80));
      if (tapped) {
        this.player.setMoveTarget(tapped.x, tapped.y, () => {
          this._handleInteract();
        });
        return;
      }
      handleWorldTap(this.player, wx, wy);
    });

    // Wire offline simulation events to the UILayer-owned panel
    EventBus.on('offline:simulation_needed', (seconds: number) => {
      const uiOff = (window as unknown as { __voidyield_uiLayer?: { offlineDispatch?: { show: (r: ReturnType<typeof simulateOffline>) => void } } }).__voidyield_uiLayer;
      const result = simulateOffline(seconds, this.storageDepot.getStockpile(), [], []);
      uiOff?.offlineDispatch?.show(result);
    });

    // HUD outpost identifier for this planet (mock 11 header chip).
    outpostId.value = 'A1';

    // 10. Mining service wiring
    miningService.setDepot(this.storageDepot);

    // Register interactables for the E-prompt overlay (spec 16 / spec 26 P2).
    interactionManager.clear();
    for (const dep of depositMap.getAll()) interactionManager.register(dep);
    interactionManager.register(this.storageDepot);
    interactionManager.register(this.droneBay);
    interactionManager.register(this.tradeHub);
    interactionManager.register(this.researchLab);
    interactionManager.register(this.habitationModule);
    interactionManager.register(this.processingPlant);
    interactionManager.register(this.platePressPlant);
    interactionManager.register(this.launchpad);
    for (const fab of this.fabricators) interactionManager.register(fab);

    const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
    ui?.interactionPrompt?.setCamera(this.camera);

    // Expose the scene so the debug panel and console can reach entities
    // (e.g. Fill Ship / Launch Ship). No longer DEV-gated since the debug
    // panel is now a menu feature available in every build.
    (window as unknown as { __voidyield_scene?: unknown }).__voidyield_scene = {
      player: this.player,
      droneBay: this.droneBay,
      storageDepot: this.storageDepot,
      tradeHub: this.tradeHub,
      researchLab: this.researchLab,
      habitationModule: this.habitationModule,
      processingPlant: this.processingPlant,
      platePressPlant: this.platePressPlant,
      fabricators: this.fabricators,
      launchpad: this.launchpad,
      worldContainer: this.worldContainer,
    };

    // [M] key — place survey waypoint at nearest deposit (raw keydown, not in InputManager).
    this._surveyKeyM = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || !surveyService.isActive) return;
      const nearest = surveyService.nearestDeposits[0];
      if (nearest) {
        surveyService.placeWaypoint(nearest.deposit);
      }
    };
    window.addEventListener('keydown', this._surveyKeyM);

    this.unsubInteract = inputManager.onAction((action, pressed) => {
      if (action === 'pause_menu' && pressed) {
        const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        ui?.closeAllPanels();
      }
      if (action === 'interact') {
        if (pressed) {
          this._handleInteract();
        } else {
          miningService.onInteractReleased();
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
      if (action === 'survey_tool_toggle' && pressed) {
        surveyService.toggle();
        const uiSurvey = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        if (surveyService.isActive) uiSurvey?.surveyOverlay?.show();
        else uiSurvey?.surveyOverlay?.hide();
      }
      if (action === 'journal' && pressed) {
        const uiJ = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
        if (uiJ?.surveyJournal?.visible) {
          uiJ.surveyJournal.close();
        } else {
          uiJ?.surveyJournal?.refresh(surveyService.getWaypoints());
          uiJ?.surveyJournal?.open();
        }
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

  private _handleInteract(): void {
    const ui2 = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
    if (ui2?.shopPanel?.visible
        || ui2?.storagePanel?.visible
        || ui2?.droneBayPanel?.visible
        || ui2?.habitationPanel?.visible
        || ui2?.shipBayPanel?.visible
        || ui2?.techTreePanel?.visible
        || ui2?.fabricatorPanel?.visible) {
      ui2.closeAllPanels();
      return;
    }
    const px = this.player.x, py = this.player.y;
    if (this.droneBay.isNearby(px, py, 80)) {
      ui2?.droneBayPanel?.setBay(this.droneBay, this.worldContainer);
      ui2?.droneBayPanel?.open();
      return;
    }
    if (this.tradeHub.isNearby(px, py, 80)) {
      ui2?.shopPanel?.setTradeHub(this.tradeHub);
      ui2?.shopPanel?.setDepot(this.storageDepot);
      ui2?.shopPanel?.open();
      return;
    }
    if (this.launchpad.isNearby(px, py, 80)) {
      ui2?.shipBayPanel?.setPad(this.launchpad);
      ui2?.shipBayPanel?.setDepot(this.storageDepot);
      ui2?.shipBayPanel?.open();
      return;
    }
    if (this.storageDepot.isNearby(px, py, 80)) {
      ui2?.storagePanel?.setDepot(this.storageDepot);
      ui2?.storagePanel?.open();
      return;
    }
    if (this.habitationModule.isNearby(px, py, 80)) {
      ui2?.habitationPanel?.open();
      return;
    }
    if (this.processingPlant.isNearby(px, py, 80) || this.platePressPlant.isNearby(px, py, 80)) {
      this.productionDashboard.toggle();
      return;
    }
    const nearestFab = this.fabricators.find((f) => f.isNearby(px, py, 80));
    if (nearestFab) {
      ui2?.fabricatorPanel?.setFabricator(nearestFab);
      ui2?.fabricatorPanel?.open();
      return;
    }
    if (this.researchLab.isNearby(px, py, 80)) {
      ui2?.techTreePanel?.toggle();
      return;
    }
    const harvesterResult = harvesterManager.onInteract(px, py);
    if (harvesterResult === null) {
      miningService.onInteract(px, py);
    }
  }

  update(delta: number): void {
    this.player.update(delta, inputManager, { width: WORLD_WIDTH, height: WORLD_HEIGHT });
    this.camera.follow({ x: this.player.x, y: this.player.y });
    // Survey mode — update scan state machine; suppress interaction prompt when active.
    const playerMoving = inputManager.isHeld('player_move_up')
      || inputManager.isHeld('player_move_down')
      || inputManager.isHeld('player_move_left')
      || inputManager.isHeld('player_move_right');
    surveyService.update(delta, this.player.x, this.player.y, playerMoving);
    if (surveyService.isActive) {
      const uiSurvey = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
      uiSurvey?.surveyOverlay?.updateReadout(
        surveyService.nearestDeposits,
        surveyService.scanProgress,
        surveyService.scanStage,
      );
    }
    interactionManager.update(this.player.x, this.player.y);
    const ui = (window as unknown as { __voidyield_uiLayer?: UILayer }).__voidyield_uiLayer;
    ui?.interactionPrompt?.tick();
    miningService.update(delta, { x: this.player.x, y: this.player.y });
    this._updateResourceRail();
    harvesterManager.update(delta);
    fleetManager.update(delta);
    zoneManager.update(delta);
    miningCircuitManager.update(delta);
    if (this.fleetPanel.visible) this.fleetPanel.update();
    ui?.droneBayPanel?.update(delta);
    this.trafficOverlay.update(fleetManager.getDrones());
    this.processingPlant.update(delta);
    this.platePressPlant.update(delta);
    for (const fab of this.fabricators) fab.update(delta);
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
        this.productionDashboard.refresh(this.storageDepot, [this.processingPlant, this.platePressPlant], this.fabricators);
      }
    }
    if (this.productionOverlay.visible) {
      this.productionOverlay.render([this.processingPlant, this.platePressPlant], this.fabricators);
    }
  }

  private _railUpdateTimer = 0;
  private _updateResourceRail(): void {
    // Throttle: 4Hz is plenty for a HUD.
    this._railUpdateTimer += 1/60; // approx; called every frame
    if (this._railUpdateTimer < 0.25) return;
    this._railUpdateTimer = 0;
    const pool = this.storageDepot.getStockpile();
    planetResources.value = [
      { key: 'vorax',   label: 'ORE',     subLabel: 'POOL', swatchColor: '#8b5a2a', carried: inventory.getByType('vorax'),   pool: pool.get('vorax')   ?? 0, cap: 50 },
      { key: 'krysite', label: 'CRYSTAL', subLabel: 'POOL', swatchColor: '#5a8fa8', carried: inventory.getByType('krysite'), pool: pool.get('krysite') ?? 0, cap: 50 },
      { key: 'aethite', label: 'FUEL',    subLabel: 'RARE', swatchColor: '#7cb87c', carried: inventory.getByType('aethite'), pool: pool.get('aethite') ?? 0, cap: 50 },
    ];
  }

  exit(): void {
    this.unsubInteract?.();
    window.removeEventListener('keydown', this._surveyKeyM);
    if (surveyService.isActive) surveyService.toggle();
    interactionManager.clear();
    this.camera.unmount(this.app.canvas);
    harvesterManager.clear(this.worldContainer);
    fleetManager.clear();
    zoneManager.reset();
    miningCircuitManager.reset();
    this.processingPlant.destroy();
    this.platePressPlant.destroy();
    for (const fab of this.fabricators) fab.destroy();
    this.fabricators = [];
    for (const sp of this.solarPanels) sp.destroy();
    this.solarPanels = [];
    consumptionManager.reset();
    logisticsManager.unregisterPlanet('planet_a1');
    obstacleManager.clear();
    this.app.stage.removeChildren();
    this.sites = [];
  }
}
