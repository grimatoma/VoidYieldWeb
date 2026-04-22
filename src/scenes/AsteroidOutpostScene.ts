import { Application, Container, Graphics } from 'pixi.js';
import type { Scene } from './SceneManager';
import type { SaveData } from '@services/SaveManager';
import { Camera } from '@services/Camera';
import { Player } from '@entities/Player';
import { Deposit } from '@entities/Deposit';
import { StorageDepot } from '@entities/StorageDepot';
import { Furnace } from '@entities/Furnace';
import { Marketplace } from '@entities/Marketplace';
import { DroneDepot, resetDepotBuilt } from '@entities/DroneDepot';
import { PlacedBuilding, CELL_SIZE, GRID_ORIGIN, gridToWorld } from '@entities/PlacedBuilding';
import { buildGrid } from '@services/BuildGrid';
import type { GridFootprint } from '@services/BuildGrid';
import { depositMap } from '@services/DepositMap';
import { miningService } from '@services/MiningService';
import { inputManager } from '@services/InputManager';
import { gameState } from '@services/GameState';
import { outpostDispatcher } from '@services/OutpostDispatcher';
import { saveManager } from '@services/SaveManager';
import { OUTPOST_DEPOSITS } from '@data/outpost_deposits';
import { OutpostHud } from '@ui/OutpostHud';
import { FurnaceOverlay } from '@ui/FurnaceOverlay';
import { BuildMenuOverlay } from '@ui/BuildMenuOverlay';
import { DroneDepotOverlay } from '@ui/DroneDepotOverlay';
import { BuildPromptOverlay } from '@ui/BuildPromptOverlay';
import { MarketplaceOverlay } from '@ui/MarketplaceOverlay';
import { powerManager } from '@services/PowerManager';
import { handleWorldTap } from '@services/TapToMove';

// Built-in RTG provides enough power to run the furnace (3 W draw) without needing solar panels.
const OUTPOST_REACTOR_POWER = 5;

const OUTPOST_WORLD_WIDTH  = 1920;
const OUTPOST_WORLD_HEIGHT = 1080;

// Build costs per BuildMenuOverlay BUILDABLE list
const BUILD_COSTS: Record<string, { iron_bar: number; copper_bar: number }> = {
  marketplace: { iron_bar: 5,  copper_bar: 3 },
  drone_depot: { iron_bar: 10, copper_bar: 5 },
};

// Footprints matching the build menu definitions
const BUILD_FOOTPRINTS: Record<string, GridFootprint> = {
  marketplace: { rows: 1, cols: 2 },
  drone_depot: { rows: 2, cols: 2 },
};

export class AsteroidOutpostScene implements Scene {
  readonly id = 'outpost';
  private _stage: Container | null = null;
  private _player: Player | null = null;
  private _deposits: Deposit[] = [];
  private _storage: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _marketplace: Marketplace | null = null;
  private _droneDepot: DroneDepot | null = null;
  private _placedBuildings: PlacedBuilding[] = [];
  private _hud: OutpostHud | null = null;
  private _furnaceOverlay: FurnaceOverlay | null = null;
  private _buildMenuOverlay: BuildMenuOverlay | null = null;
  private _buildPromptOverlay: BuildPromptOverlay | null = null;
  private _droneDepotOverlay: DroneDepotOverlay | null = null;
  private _marketplaceOverlay: MarketplaceOverlay | null = null;
  private _app: Application | null = null;
  private _camera: Camera | null = null;

  // Ghost placement state
  private _ghostBuilding: PlacedBuilding | null = null;
  private _ghostBuildingType: string | null = null;

  async enter(app: Application): Promise<void> {
    this._app = app;
    this._stage = new Container();
    app.stage.addChild(this._stage);

    // Dark asteroid background — fills the whole world so there are no gaps when camera scrolls
    const bg = new Graphics();
    bg.rect(0, 0, OUTPOST_WORLD_WIDTH, OUTPOST_WORLD_HEIGHT).fill(0x1A1A2E);
    this._stage.addChild(bg);

    // Camera — scale to fill the screen like other planet scenes, capped so the
    // full 5×5 grid remains visible at the reference 960×540 size (zoom ≥ 1.2).
    this._camera = new Camera(
      this._stage,
      OUTPOST_WORLD_WIDTH,
      OUTPOST_WORLD_HEIGHT,
      app.screen.width,
      app.screen.height,
    );
    this._camera.zoom = Math.max(1.2, Math.min(2.0, app.screen.width / 960));
    this._camera.minZoom = 0.5;
    this._camera.maxZoom = 3.0;
    this._camera.mount(app.canvas);

    // Draw grid overlay (faint lines)
    this._drawGrid();

    // Register outpost RTG so the furnace has power from the start.
    powerManager.registerGenerator(OUTPOST_REACTOR_POWER);

    // Pre-place Storage at [2,0] and Furnace at [2,1]
    this._initGrid();

    // Spawn deposits
    this._initDeposits();

    // Player starts at the grid centre so the camera opens with the grid visible
    this._player = new Player(480, 270);
    this._stage.addChild(this._player.container);

    // Tap-to-move: delegate to Camera.onTap so coords are already in world space
    this._camera.onTap((wx, wy) => {
      if (this._player) handleWorldTap(this._player, wx, wy);
    });

    // Wire mining service
    miningService.setDepot(this._storage!);
    miningService.setFurnace(this._furnace!);

    // Furnace overlay
    this._furnaceOverlay = new FurnaceOverlay(this._furnace!, () => {
      // onInsert: called by the overlay's INSERT ORE button
      this._furnace!.insertFromInventory();
    });
    this._furnaceOverlay.mount();

    // Build menu overlay
    this._buildMenuOverlay = new BuildMenuOverlay({
      getStorage: () => this._storage,
      onBuildStart: (buildingType: string) => this._startGhostPlacement(buildingType),
      onMoveStart: (buildingId: string) => this._startGhostMove(buildingId),
      getPlacedBuildings: () => buildGrid.getAll().filter(e =>
        e.buildingType !== 'storage' && e.buildingType !== 'furnace'
      ),
    });
    this._buildMenuOverlay.mount();

    // HUD
    this._hud = new OutpostHud(this._storage!);
    this._hud.mount(app);

    // Build prompt overlay
    this._buildPromptOverlay = new BuildPromptOverlay();
    this._buildPromptOverlay.mount();

    // Reset module-level depot flag for scene re-entry
    resetDepotBuilt();

    gameState.setCurrentPlanet('outpost');

    // Register save getter, storage accessor, and debug hooks
    _activeSaveGetter = () => this.serializeOutpost();
    _activeStorageGetter = () => this._storage;
    _forceBuildFn = (type) => this._doForceBuild(type);
    _setFurnaceRecipeFn = (recipe) => this._furnace?.setRecipe(recipe as any);

    // Default starting resources — overridden if save data exists
    this._storage?.setStock('iron_ore', 100);
    this._storage?.setStock('iron_bar', 100);
    this._storage?.setStock('water', 100);

    // Try to load and deserialize saved outpost state
    const saved = saveManager.loadGame();
    if (saved?.outpost) {
      try {
        this.deserializeOutpost(saved.outpost);
      } catch (err) {
        console.warn('[AsteroidOutpostScene] Failed to deserialize outpost state:', err);
      }
    }
  }

  private _drawGrid(): void {
    const g = new Graphics();
    for (let r = 0; r <= 5; r++) {
      g.moveTo(GRID_ORIGIN.x, GRID_ORIGIN.y + r * CELL_SIZE);
      g.lineTo(GRID_ORIGIN.x + 5 * CELL_SIZE, GRID_ORIGIN.y + r * CELL_SIZE);
    }
    for (let c = 0; c <= 5; c++) {
      g.moveTo(GRID_ORIGIN.x + c * CELL_SIZE, GRID_ORIGIN.y);
      g.lineTo(GRID_ORIGIN.x + c * CELL_SIZE, GRID_ORIGIN.y + 5 * CELL_SIZE);
    }
    g.stroke({ width: 1, color: 0x2A3A5A, alpha: 0.8 });
    this._stage!.addChild(g);
  }

  private _initGrid(): void {
    buildGrid.deserialize([]); // reset

    // Storage (1×1) at [2,0]
    const storagePos = gridToWorld(2, 0);
    this._storage = new StorageDepot(storagePos.x, storagePos.y);
    buildGrid.place({ buildingId: 'storage_0', buildingType: 'storage', row: 2, col: 0, footprint: { rows: 1, cols: 1 } });
    const storagePlaced = new PlacedBuilding('storage_0', 'storage', 2, 0, { rows: 1, cols: 1 });
    this._placedBuildings.push(storagePlaced);
    this._stage!.addChild(storagePlaced.container);
    this._stage!.addChild(this._storage.container);

    // Furnace (1×1) at [2,1] — use Furnace entity, not PlacedBuilding
    const furnacePos = gridToWorld(2, 1);
    this._furnace = new Furnace(furnacePos.x, furnacePos.y, this._storage);
    buildGrid.place({ buildingId: 'furnace_0', buildingType: 'furnace', row: 2, col: 1, footprint: { rows: 1, cols: 1 } });
    this._stage!.addChild(this._furnace.container);
  }

  private _initDeposits(): void {
    const tempContainer = new Container();
    depositMap.loadPlanet(OUTPOST_DEPOSITS, tempContainer);

    this._deposits = [...depositMap.getAll()] as Deposit[];
    for (const deposit of this._deposits) {
      tempContainer.removeChild(deposit.container);
      this._stage!.addChild(deposit.container);
    }
  }

  update(delta: number): void {
    if (!this._player || !this._app) return;

    this._player.update(delta, inputManager, { width: OUTPOST_WORLD_WIDTH, height: OUTPOST_WORLD_HEIGHT });
    this._camera?.follow({ x: this._player.x, y: this._player.y });

    // Furnace update
    this._furnace?.update(delta);

    // Dispatcher update
    outpostDispatcher.update(delta);

    // Ghost placement update (before other E-key handling)
    if (this._ghostBuilding) {
      this._updateGhostPlacement();
      return; // while ghost is active, skip normal interactions
    }

    // Mining + interactions
    miningService.update(delta, { x: this._player.x, y: this._player.y });

    if (inputManager.wasJustPressed('interact')) {
      this._handleInteract();
    }
    if (!inputManager.isHeld('interact')) {
      miningService.onInteractReleased();
    }

    // Build menu toggle (N key)
    if (inputManager.wasJustPressed('build_menu')) {
      if (this._furnaceOverlay?.isOpen()) this._furnaceOverlay.close();
      if (this._droneDepotOverlay?.isOpen()) this._droneDepotOverlay.close();
      this._buildMenuOverlay?.toggle();
    }

    // Close overlays on ESC (pause_menu action)
    if (inputManager.wasJustPressed('pause_menu')) {
      if (this._furnaceOverlay?.isOpen())     { this._furnaceOverlay.close();     return; }
      if (this._marketplaceOverlay?.isOpen()) { this._marketplaceOverlay.close(); return; }
      if (this._droneDepotOverlay?.isOpen())  { this._droneDepotOverlay.close();  return; }
      if (this._buildMenuOverlay?.isOpen())   { this._buildMenuOverlay.close();   return; }
    }

    this._hud?.update();

    // Update build prompt overlay visibility
    const playerNearGrid = this._player && this._isPlayerNearGrid(this._player.x, this._player.y);
    const menuOpen = this._buildMenuOverlay?.isOpen() ?? false;
    this._buildPromptOverlay?.update(playerNearGrid ?? false, menuOpen);
  }

  // -------------------------------------------------------------------------
  // Ghost placement
  // -------------------------------------------------------------------------

  private _startGhostPlacement(buildingType: string): void {
    if (this._ghostBuilding) {
      this._cancelGhost();
    }
    const footprint = BUILD_FOOTPRINTS[buildingType] ?? { rows: 1, cols: 1 };
    this._ghostBuilding = PlacedBuilding.createGhost(buildingType, footprint);
    this._ghostBuildingType = buildingType;
    this._stage!.addChild(this._ghostBuilding.container);
  }

  private _startGhostMove(buildingId: string): void {
    const entry = buildGrid.pickup(buildingId);
    if (!entry) return;

    // Remove the visual PlacedBuilding for the picked-up building
    const idx = this._placedBuildings.findIndex(b => b.buildingId === buildingId);
    if (idx !== -1) {
      const pb = this._placedBuildings.splice(idx, 1)[0];
      pb.destroy();
    }

    // Also remove any real entity (Marketplace or DroneDepot)
    this._removeEntityBuilding(buildingId);

    const footprint = entry.footprint;
    this._ghostBuilding = PlacedBuilding.createGhost(entry.buildingType, footprint);
    this._ghostBuildingType = entry.buildingType;
    this._stage!.addChild(this._ghostBuilding.container);
  }

  private _removeEntityBuilding(buildingId: string): void {
    // This handles removal if the marketplace or drone depot was picked up.
    // For now it's a visual-only concern; entity stays but can be re-placed.
    if (buildingId.startsWith('marketplace_') && this._marketplace) {
      this._stage?.removeChild(this._marketplace.container);
      this._marketplace = null;
      this._marketplaceOverlay?.unmount();
      this._marketplaceOverlay = null;
    }
    if (buildingId.startsWith('drone_depot_') && this._droneDepot) {
      this._stage?.removeChild(this._droneDepot.container);
      outpostDispatcher.stop();
      this._droneDepotOverlay?.close();
      this._droneDepot = null;
      resetDepotBuilt();
    }
  }

  private _updateGhostPlacement(): void {
    if (!this._ghostBuilding || !this._player) return;

    const footprint = this._ghostBuilding.footprint;

    // Snap player position to nearest grid cell
    const col = Math.round((this._player.x - GRID_ORIGIN.x - CELL_SIZE / 2) / CELL_SIZE);
    const row = Math.round((this._player.y - GRID_ORIGIN.y - CELL_SIZE / 2) / CELL_SIZE);
    const clampedRow = Math.max(0, Math.min(BuildGrid.ROWS - footprint.rows, row));
    const clampedCol = Math.max(0, Math.min(BuildGrid.COLS - footprint.cols, col));

    this._ghostBuilding.row = clampedRow;
    this._ghostBuilding.col = clampedCol;
    this._ghostBuilding.syncPosition();

    const valid = buildGrid.canPlace(clampedRow, clampedCol, footprint);
    this._ghostBuilding.setGhostValid(valid);

    // E to confirm placement
    if (inputManager.wasJustPressed('interact') && valid) {
      this._confirmGhostPlacement(clampedRow, clampedCol);
      return;
    }

    // ESC to cancel
    if (inputManager.wasJustPressed('pause_menu')) {
      this._cancelGhost();
    }
  }

  private _confirmGhostPlacement(row: number, col: number): void {
    if (!this._ghostBuilding || !this._ghostBuildingType || !this._storage) return;

    const buildingType = this._ghostBuildingType;
    const costs = BUILD_COSTS[buildingType] ?? { iron_bar: 0, copper_bar: 0 };

    // Check storage has enough bars
    if (
      this._storage.getBarCount('iron_bar')    < costs.iron_bar ||
      this._storage.getBarCount('copper_bar')  < costs.copper_bar
    ) {
      // Cannot afford — cancel ghost
      this._cancelGhost();
      return;
    }

    // Deduct bars
    this._storage.pull('iron_bar',   costs.iron_bar);
    this._storage.pull('copper_bar', costs.copper_bar);

    const footprint = this._ghostBuilding.footprint;
    const buildingId = `${buildingType}_${Date.now()}`;

    // Register in grid
    buildGrid.place({ buildingId, buildingType, row, col, footprint });

    // Spawn the real entity
    this._spawnBuilding(buildingType, buildingId, row, col, footprint);

    // Remove ghost
    this._ghostBuilding.destroy();
    this._stage!.removeChild(this._ghostBuilding.container);
    this._ghostBuilding = null;
    this._ghostBuildingType = null;

    // Refresh build menu
    this._buildMenuOverlay?.refresh();
  }

  private _cancelGhost(): void {
    if (!this._ghostBuilding) return;
    this._ghostBuilding.destroy();
    this._stage?.removeChild(this._ghostBuilding.container);
    this._ghostBuilding = null;
    this._ghostBuildingType = null;
  }

  /** Debug/test: place a building in the first available grid cell, no cost deducted. */
  private _doForceBuild(buildingType: 'marketplace' | 'drone_depot'): void {
    const footprint = BUILD_FOOTPRINTS[buildingType] ?? { rows: 1, cols: 1 };
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c <= 5 - footprint.cols; c++) {
        if (buildGrid.canPlace(r, c, footprint)) {
          const buildingId = `${buildingType}_${Date.now()}`;
          buildGrid.place({ buildingId, buildingType, row: r, col: c, footprint });
          this._spawnBuilding(buildingType, buildingId, r, c, footprint);
          this._buildMenuOverlay?.refresh();
          return;
        }
      }
    }
    console.warn(`[_doForceBuild] No available grid space for ${buildingType}`);
  }

  private _spawnBuilding(
    buildingType: string,
    buildingId: string,
    row: number,
    col: number,
    footprint: GridFootprint,
  ): void {
    // World center of the footprint
    const wx = GRID_ORIGIN.x + col * CELL_SIZE + (footprint.cols * CELL_SIZE) / 2;
    const wy = GRID_ORIGIN.y + row * CELL_SIZE + (footprint.rows * CELL_SIZE) / 2;

    if (buildingType === 'marketplace') {
      const market = new Marketplace(wx, wy);
      this._marketplace = market;
      this._stage!.addChild(market.container);

      this._marketplaceOverlay?.unmount();
      this._marketplaceOverlay = new MarketplaceOverlay(market, this._storage!);
      this._marketplaceOverlay.mount();
    } else if (buildingType === 'drone_depot') {
      const depot = new DroneDepot(wx, wy);
      this._droneDepot = depot;
      this._stage!.addChild(depot.container);

      // Wire up depot
      try {
        depot.onBuild(this._storage!, this._furnace!, outpostDispatcher);
      } catch (err) {
        console.warn('DroneDepot.onBuild failed:', err);
      }

      // Create overlay for this depot
      this._droneDepotOverlay?.unmount();
      this._droneDepotOverlay = new DroneDepotOverlay(depot);
      this._droneDepotOverlay.mount();
    } else {
      // Generic PlacedBuilding fallback
      const pb = new PlacedBuilding(buildingId, buildingType, row, col, footprint);
      this._placedBuildings.push(pb);
      this._stage!.addChild(pb.container);
    }
  }

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  private _handleInteract(): void {
    const px = this._player!.x;
    const py = this._player!.y;

    // Close whichever overlay is open and bail
    if (this._furnaceOverlay?.isOpen())     { this._furnaceOverlay.close();     return; }
    if (this._marketplaceOverlay?.isOpen()) { this._marketplaceOverlay.close(); return; }
    if (this._droneDepotOverlay?.isOpen())  { this._droneDepotOverlay.close();  return; }
    if (this._buildMenuOverlay?.isOpen())   { this._buildMenuOverlay.close();   return; }

    // Building interactions — nearest entity takes priority
    if (this._furnace?.isNearby(px, py))    { this._furnaceOverlay?.open();     return; }
    if (this._marketplace?.isNearby(px, py)){ this._marketplaceOverlay?.open(); return; }
    if (this._droneDepot?.isNearby(px, py)) { this._droneDepotOverlay?.open();  return; }

    // Storage: deposit carried ore
    if (this._storage?.isNearby(px, py)) { miningService.onInteract(px, py); return; }

    // Empty grid tile → open build menu
    const col = Math.floor((px - GRID_ORIGIN.x) / CELL_SIZE);
    const row = Math.floor((py - GRID_ORIGIN.y) / CELL_SIZE);
    if (col >= 0 && col < 5 && row >= 0 && row < 5 && buildGrid.getBuildingAt(row, col) === null) {
      this._buildMenuOverlay?.open();
      return;
    }

    // Default: mine deposit
    miningService.onInteract(px, py);
  }

  private _isPlayerNearGrid(px: number, py: number, radius = 120): boolean {
    // Grid is roughly centered at GRID_ORIGIN, spans 5×5 cells
    const gridCenterX = GRID_ORIGIN.x + 2.5 * CELL_SIZE;
    const gridCenterY = GRID_ORIGIN.y + 2.5 * CELL_SIZE;
    const dx = px - gridCenterX;
    const dy = py - gridCenterY;
    return dx * dx + dy * dy <= radius * radius;
  }

  private serializeOutpost(): NonNullable<SaveData['outpost']> {
    return {
      grid: buildGrid.serialize(),
      furnaceRecipe: this._furnace?.recipe ?? 'off',
      stockpile: Object.fromEntries(this._storage?.getStockpile() ?? []),
      droneSlots: this._droneDepot?.getSlotConfigs() ?? [],
      playerX: this._player?.x ?? 480,
      playerY: this._player?.y ?? 270,
    };
  }

  private deserializeOutpost(data: NonNullable<SaveData['outpost']>): void {
    // Restore grid (re-place buildings)
    buildGrid.deserialize(data.grid);

    // Restore furnace recipe
    if (this._furnace) {
      this._furnace.setRecipe(data.furnaceRecipe);
    }

    // Restore stockpile
    if (this._storage) {
      this._storage.clearStock();
      for (const [oreType, qty] of Object.entries(data.stockpile)) {
        if (qty > 0) {
          this._storage.setStock(oreType as any, qty);
        }
      }
    }

    // Restore drone slot configs
    if (this._droneDepot) {
      for (const slotConfig of data.droneSlots) {
        this._droneDepot.setSlotConfig(slotConfig.slotId, slotConfig);
      }
    }

    // Restore player position
    if (this._player) {
      this._player.x = data.playerX;
      this._player.y = data.playerY;
      this._player.container.x = data.playerX;
      this._player.container.y = data.playerY;
    }
  }

  exit(): void {
    // Clear save getter, storage accessor, and debug hooks
    _activeSaveGetter = null;
    _activeStorageGetter = null;
    _forceBuildFn = null;
    _setFurnaceRecipeFn = null;

    // Unregister outpost RTG and destroy furnace to release power consumers.
    powerManager.unregisterGenerator(OUTPOST_REACTOR_POWER);
    this._furnace?.destroy();

    // Stop dispatcher
    outpostDispatcher.stop();

    // Unmount camera and clear tap callback
    if (this._camera && this._app) {
      this._camera.onTap(null);
      this._camera.unmount(this._app.canvas);
    }
    this._camera = null;
    resetDepotBuilt();

    // Clear deposits
    depositMap.loadPlanet([], new Container());
    miningService.setDepot(null as unknown as StorageDepot);
    miningService.setFurnace(null);

    // Unmount overlays
    this._hud?.unmount();
    this._furnaceOverlay?.unmount();
    this._marketplaceOverlay?.unmount();
    this._buildMenuOverlay?.unmount();
    this._buildPromptOverlay?.unmount();
    this._droneDepotOverlay?.unmount();

    // Cancel any active ghost
    this._cancelGhost();

    // Destroy stage (all children)
    this._stage?.destroy({ children: true });
    this._stage = null;
    this._player = null;
    this._deposits = [];
    this._placedBuildings = [];
    this._storage = null;
    this._furnace = null;
    this._marketplace = null;
    this._droneDepot = null;
    this._hud = null;
    this._furnaceOverlay = null;
    this._marketplaceOverlay = null;
    this._buildMenuOverlay = null;
    this._buildPromptOverlay = null;
    this._droneDepotOverlay = null;
    this._app = null;
  }
}

// Helper reference for clamping (mirrors BuildGrid statics)
const BuildGrid = { ROWS: 5, COLS: 5 };

// ─────────────────────────────────────────────────────────────────────────────
// Module-level save state getter and storage accessor
// ─────────────────────────────────────────────────────────────────────────────

let _activeSaveGetter: (() => NonNullable<SaveData['outpost']>) | null = null;
let _activeStorageGetter: (() => StorageDepot | null) | null = null;
let _forceBuildFn: ((buildingType: 'marketplace' | 'drone_depot') => void) | null = null;
let _setFurnaceRecipeFn: ((recipe: string) => void) | null = null;

export function getOutpostSaveData(): SaveData['outpost'] {
  return _activeSaveGetter?.();
}

export function getActiveStorage(): StorageDepot | null {
  return _activeStorageGetter?.() ?? null;
}

/** Debug helper: force-place a building in the outpost without cost deduction. */
export function forceBuildInOutpost(buildingType: 'marketplace' | 'drone_depot'): void {
  if (!_forceBuildFn) {
    console.warn('[forceBuildInOutpost] No active outpost scene');
    return;
  }
  _forceBuildFn(buildingType);
}

/** Debug helper: set the furnace recipe by name ('off' | 'iron' | 'copper'). */
export function setOutpostFurnaceRecipe(recipe: string): void {
  if (!_setFurnaceRecipeFn) {
    console.warn('[setOutpostFurnaceRecipe] No active outpost scene');
    return;
  }
  _setFurnaceRecipeFn(recipe);
}
