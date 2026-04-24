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
import type { GridFootprint, PlacedEntry } from '@services/BuildGrid';
import { fleetManager } from '@services/FleetManager';
import { depositMap } from '@services/DepositMap';
import { miningService } from '@services/MiningService';
import { inputManager } from '@services/InputManager';
import { gameState } from '@services/GameState';
import { outpostDispatcher } from '@services/OutpostDispatcher';
import { saveManager } from '@services/SaveManager';
import { OUTPOST_DEPOSITS } from '@data/outpost_deposits';
import { planetResources, outpostId } from '@store/gameStore';
import { inventory } from '@services/Inventory';
import { ElectrolysisUnit } from '@entities/ElectrolysisUnit';
import { Launchpad } from '@entities/Launchpad';
import { FurnaceOverlay } from '@ui/FurnaceOverlay';
import { BuildMenuOverlay } from '@ui/BuildMenuOverlay';
import { DroneDepotOverlay } from '@ui/DroneDepotOverlay';
import { BuildPromptOverlay } from '@ui/BuildPromptOverlay';
import { MarketplaceOverlay } from '@ui/MarketplaceOverlay';
import { ProductionOverlay } from '@ui/ProductionOverlay';
import type { OutpostBuildingStatus } from '@ui/ProductionOverlay';
import { ElectrolysisOverlay } from '@ui/ElectrolysisOverlay';
import { DepositPanel } from '@ui/DepositPanel';
import { powerManager } from '@services/PowerManager';
import { EventBus } from '@services/EventBus';
import { handleWorldTap } from '@services/TapToMove';
import { roadNetwork } from '@services/RoadNetwork';
import { obstacleManager } from '@services/ObstacleManager';

// Built-in RTG provides enough power to run the furnace (3 W draw) without needing solar panels.
const OUTPOST_REACTOR_POWER = 5;

const OUTPOST_WORLD_WIDTH  = 1920;
const OUTPOST_WORLD_HEIGHT = 1080;

// Perimeter fence around the 5×5 build grid (grid spans x:260-700, y:50-490).
// The east wall has a gate gap so the player and drones can reach the
// deposits east of the compound. Wall rects are registered with
// `obstacleManager` so they block movement and route pathfinding through the
// gate. Keep these constants in sync with `_drawFence` and `_registerFenceObstacles`.
const FENCE_LEFT     = 232;
const FENCE_TOP      = 22;
const FENCE_RIGHT    = 712;
const FENCE_BOTTOM   = 518;
const FENCE_THICK    = 10;
const FENCE_GATE_TOP = 230;  // east-wall gate spans y:230..310 (80px wide opening)
const FENCE_GATE_BOT = 310;

// Build costs per BuildMenuOverlay BUILDABLE list (TDD §3.5)
const BUILD_COSTS: Record<string, { iron_bar: number; copper_bar: number }> = {
  marketplace:       { iron_bar: 4,  copper_bar: 2  },
  drone_depot:       { iron_bar: 6,  copper_bar: 0  },
  electrolysis_unit: { iron_bar: 6,  copper_bar: 4  },
  launchpad:         { iron_bar: 30, copper_bar: 15 },
};

// Footprints matching the build menu definitions (TDD §2)
const BUILD_FOOTPRINTS: Record<string, GridFootprint> = {
  marketplace:       { rows: 1, cols: 2 },
  drone_depot:       { rows: 2, cols: 2 },
  electrolysis_unit: { rows: 3, cols: 2 },
  launchpad:         { rows: 3, cols: 3 },
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
  private _furnaceOverlay: FurnaceOverlay | null = null;
  private _buildMenuOverlay: BuildMenuOverlay | null = null;
  private _buildPromptOverlay: BuildPromptOverlay | null = null;
  private _droneDepotOverlay: DroneDepotOverlay | null = null;
  private _marketplaceOverlay: MarketplaceOverlay | null = null;
  private _productionOverlay: ProductionOverlay | null = null;
  private _productionOverlayActive = false;
  private _electrolysisUnit: ElectrolysisUnit | null = null;
  private _electrolysisOverlay: ElectrolysisOverlay | null = null;
  private _launchpad: Launchpad | null = null;
  private _launchpadPanel: HTMLDivElement | null = null;
  private _phase1LaunchHandler: (() => void) | null = null;
  private _depositPanel: DepositPanel | null = null;
  private _app: Application | null = null;
  private _camera: Camera | null = null;

  // Building layer — sits below the player so all buildings render behind them
  private _buildingLayer: Container | null = null;

  // Road rendering layer — sits below the building layer
  private _roadLayer: Graphics | null = null;

  // Ghost placement state
  private _ghostBuilding: PlacedBuilding | null = null;
  private _ghostBuildingType: string | null = null;
  // Stored when moving an existing building; restored if the move is canceled
  private _ghostMoveEntry: PlacedEntry | null = null;
  // Touch action panel shown during ghost placement
  private _ghostActionPanel: HTMLDivElement | null = null;
  private _ghostCurrentlyValid = false;

  // Road placement mode state
  private _roadMode = false;
  private _roadPreview = new Set<string>(); // pending cells (key = "row,col")
  private _roadModeBanner: HTMLDivElement | null = null;
  private _roadBudgetPanel: HTMLDivElement | null = null;

  // Production overlay legend banner (DOM element shown while overlay is active)
  private _productionLegend: HTMLDivElement | null = null;

  // ── Autonomy win beat (TDD §4.7) ──────────────────────────────────────────
  private _autonomyTimer = 0;           // seconds since player last moved
  private _autonomyCreditsStart = 0;    // credits when timer started
  private _autonomyWinShown = false;    // don't show banner twice per visit
  private _autonomyBanner: HTMLDivElement | null = null;

  // Tap highlight for empty grid cells (BUG-3)
  private _tapHighlight: Graphics | null = null;

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

    // Perimeter fence + east-wall gate. Registers wall colliders with the
    // ObstacleManager so the player and drones must route through the gate
    // gap to enter or leave the compound.
    this._registerFenceObstacles();
    this._drawFence();

    // Road layer — sits below the building layer
    this._roadLayer = new Graphics();
    this._stage.addChild(this._roadLayer);

    // Building layer — added before the player so buildings always render behind them
    this._buildingLayer = new Container();
    this._stage.addChild(this._buildingLayer);

    // Production overlay — sits above buildings; starts hidden
    this._productionOverlay = new ProductionOverlay(OUTPOST_WORLD_WIDTH, OUTPOST_WORLD_HEIGHT);
    this._stage.addChild(this._productionOverlay.container);

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
      if (!this._player) return;

      const col = Math.floor((wx - GRID_ORIGIN.x) / CELL_SIZE);
      const row = Math.floor((wy - GRID_ORIGIN.y) / CELL_SIZE);
      const inGrid = col >= 0 && col < BuildGrid.COLS && row >= 0 && row < BuildGrid.ROWS;

      // Road mode: tap a grid cell to toggle it in the road preview
      if (this._roadMode) {
        if (inGrid) {
          const k = this._roadKey(row, col);
          if (!roadNetwork.hasRoad(row, col)) {
            if (this._roadPreview.has(k)) {
              this._roadPreview.delete(k);
            } else {
              this._roadPreview.add(k);
            }
            this._updateBudgetPanel();
          }
          // Move player to tapped cell so they're visually at the painted location
          const tx = GRID_ORIGIN.x + col * CELL_SIZE + CELL_SIZE / 2;
          const ty = GRID_ORIGIN.y + row * CELL_SIZE + CELL_SIZE / 2;
          this._player.setMoveTarget(tx, ty);
        } else {
          handleWorldTap(this._player, wx, wy);
        }
        return;
      }

      // Ghost mode: tap navigates player to that cell (repositions ghost); PLACE button confirms
      if (this._ghostBuilding) {
        if (inGrid) {
          const tx = GRID_ORIGIN.x + col * CELL_SIZE + CELL_SIZE / 2;
          const ty = GRID_ORIGIN.y + row * CELL_SIZE + CELL_SIZE / 2;
          this._player.setMoveTarget(tx, ty);
        } else {
          handleWorldTap(this._player, wx, wy);
        }
        return;
      }

      // Normal tap: close any open overlay, then handle interaction/movement
      if (this._furnaceOverlay?.isOpen())       { this._furnaceOverlay.close();       }
      if (this._marketplaceOverlay?.isOpen())   { this._marketplaceOverlay.close();   }
      if (this._droneDepotOverlay?.isOpen())    { this._droneDepotOverlay.close();    }
      if (this._buildMenuOverlay?.isOpen())     { this._buildMenuOverlay.close();     }
      if (this._depositPanel?.isOpen())         { this._depositPanel.close();         }
      if (this._electrolysisOverlay?.isOpen())  { this._electrolysisOverlay.close();  }
      if (this._launchpadPanel)                 { this._closeLaunchpadPanel();        }

      if (inGrid) {
        const entry = buildGrid.getBuildingAt(row, col);
        if (entry) {
          const targetX = GRID_ORIGIN.x + col * CELL_SIZE + CELL_SIZE / 2;
          const targetY = GRID_ORIGIN.y + row * CELL_SIZE + CELL_SIZE / 2;
          this._player.setMoveTarget(targetX, targetY, () => {
            this._handleInteract();
          });
          return;
        }
        // Empty grid cell — flash a highlight so the player gets visual feedback
        this._flashEmptyCell(row, col);
      }

      handleWorldTap(this._player, wx, wy);
    });

    // Wire mining service
    miningService.setDepot(this._storage!);
    miningService.setFurnace(this._furnace!);

    // Furnace overlay
    this._furnaceOverlay = new FurnaceOverlay(
      this._furnace!,
      () => {
        // Try player inventory first, then pull from storage as fallback.
        if (this._furnace!.insertFromInventory() === 0 && this._storage) {
          this._furnace!.insertFromStorage(this._storage);
        }
      },
      (oreType) => this._storage?.getStockpile().get(oreType) ?? 0,
    );
    this._furnaceOverlay.mount();

    // Build menu overlay
    this._buildMenuOverlay = new BuildMenuOverlay({
      getStorage: () => this._storage,
      onBuildStart: (buildingType: string) => this._startGhostPlacement(buildingType),
      onMoveStart: (buildingId: string) => this._startGhostMove(buildingId),
      getPlacedBuildings: () => buildGrid.getAll().filter(e =>
        e.buildingType !== 'storage' && e.buildingType !== 'furnace' && e.buildingType !== 'fabricator'
      ),
      onEnterRoadMode: () => this._enterRoadMode(),
    });
    this._buildMenuOverlay.mount();

    // HUD is managed by UILayer; we just need to ensure outpostId is correct
    outpostId.value = 'OUTPOST';

    // Build prompt overlay
    this._buildPromptOverlay = new BuildPromptOverlay();
    this._buildPromptOverlay.mount();

    // Deposit interaction panel
    this._depositPanel = new DepositPanel();
    this._depositPanel.mount();

    // Reset module-level depot flag for scene re-entry
    resetDepotBuilt();

    gameState.setCurrentPlanet('outpost');

    // Phase 1 launch event
    this._phase1LaunchHandler = () => this._showPhase1CompleteOverlay();
    EventBus.on('phase1:launch', this._phase1LaunchHandler);

    // Register save getter, storage accessor, and debug hooks
    _activeSaveGetter = () => this.serializeOutpost();
    _activeStorageGetter = () => this._storage;
    _forceBuildFn = (type) => this._doForceBuild(type);
    _setFurnaceRecipeFn = (recipe) => this._furnace?.setRecipe(recipe as any);

    // Try to load and deserialize saved outpost state
    const saved = saveManager.loadGame();
    if (saved?.outpost) {
      try {
        this.deserializeOutpost(saved.outpost);
      } catch (err) {
        console.warn('[AsteroidOutpostScene] Failed to deserialize outpost state:', err);
      }
    } else {
      // Default starting resources
      this._storage?.setStock('iron_ore', 100);
      this._storage?.setStock('copper_ore', 100);
      this._storage?.setStock('water', 100);
      this._storage?.setStock('iron_bar', 100);
      this._storage?.setStock('copper_bar', 100);

      // Default starting drones
      if (this._droneDepot) {
        this._droneDepot.restoreBaySlot({ slotId: 'slot_0', droneType: 'scout', oreType: 'iron_ore' }, this._stage!);
        this._droneDepot.restoreBaySlot({ slotId: 'slot_1', droneType: 'scout', oreType: 'copper_ore' }, this._stage!);
      }
    }

    // Autonomy beat: snapshot starting credits and allow the win to fire again
    this._autonomyCreditsStart = gameState.credits;
    this._autonomyTimer = 0;
    this._autonomyWinShown = false;
  }

  // -------------------------------------------------------------------------
  // Empty-cell tap highlight (BUG-3)
  // -------------------------------------------------------------------------

  private _flashEmptyCell(row: number, col: number): void {
    this._tapHighlight?.destroy();
    this._tapHighlight = null;

    const g = new Graphics();
    const wx = GRID_ORIGIN.x + col * CELL_SIZE + 2;
    const wy = GRID_ORIGIN.y + row * CELL_SIZE + 2;
    const sz = CELL_SIZE - 4;
    g.rect(wx, wy, sz, sz).stroke({ width: 2, color: 0x00B8D4, alpha: 0.7 });
    g.alpha = 0.7;
    this._stage!.addChild(g);
    this._tapHighlight = g;

    window.setTimeout(() => {
      if (this._tapHighlight === g) {
        g.destroy();
        this._tapHighlight = null;
      }
    }, 400);
  }

  // -------------------------------------------------------------------------
  // Road layer rendering
  // -------------------------------------------------------------------------

  private _roadKey(row: number, col: number): string { return `${row},${col}`; }

  private _drawRoadLayer(): void {
    if (!this._roadLayer) return;
    this._roadLayer.clear();

    const margin = 4;
    const tileW = CELL_SIZE - margin * 2;
    const tileH = CELL_SIZE - margin * 2;

    // Draw placed roads (dark green)
    for (const { row, col } of roadNetwork.getAll()) {
      const wx = GRID_ORIGIN.x + col * CELL_SIZE + margin;
      const wy = GRID_ORIGIN.y + row * CELL_SIZE + margin;
      this._roadLayer.rect(wx, wy, tileW, tileH).fill({ color: 0x1E3A1E });
      this._roadLayer.rect(wx, wy, tileW, tileH).stroke({ width: 2, color: 0x3A6A3A });
    }

    // Draw preview roads (teal, 40% alpha)
    if (this._roadMode) {
      for (const key of this._roadPreview) {
        const [r, c] = key.split(',').map(Number);
        // Skip cells that are already placed roads
        if (roadNetwork.hasRoad(r, c)) continue;
        const wx = GRID_ORIGIN.x + c * CELL_SIZE + margin;
        const wy = GRID_ORIGIN.y + r * CELL_SIZE + margin;
        this._roadLayer.rect(wx, wy, tileW, tileH).fill({ color: 0x00B8D4, alpha: 0.4 });
        this._roadLayer.rect(wx, wy, tileW, tileH).stroke({ width: 1, color: 0x00B8D4 });
      }

      // Highlight the current cell under the player
      if (this._player) {
        const col = Math.floor((this._player.x - GRID_ORIGIN.x) / CELL_SIZE);
        const row = Math.floor((this._player.y - GRID_ORIGIN.y) / CELL_SIZE);
        if (col >= 0 && col < BuildGrid.COLS && row >= 0 && row < BuildGrid.ROWS) {
          const wx = GRID_ORIGIN.x + col * CELL_SIZE + margin;
          const wy = GRID_ORIGIN.y + row * CELL_SIZE + margin;
          this._roadLayer.rect(wx, wy, tileW, tileH).stroke({ width: 2, color: 0x00FFFF, alpha: 0.8 });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Road mode enter/exit/update
  // -------------------------------------------------------------------------

  private _enterRoadMode(): void {
    this._roadMode = true;
    this._roadPreview.clear();

    // Show mode banner
    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const banner = document.createElement('div');
    banner.id = 'road-mode-banner';
    banner.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'right:0',
      'height:28px',
      'display:flex',
      'align-items:center',
      'padding:0 12px',
      'gap:10px',
      'font-size:11px',
      'font-family:monospace',
      'background:rgba(0,184,212,0.12)',
      'border-bottom:1px solid #00B8D4',
      'color:#00B8D4',
      'z-index:100',
      'pointer-events:none',
    ].join(';');
    banner.innerHTML = [
      '<span style="background:#0a2030;border:1px solid #00B8D4;padding:1px 5px;border-radius:2px;color:#00B8D4;">R</span>',
      '<strong>ROAD MODE</strong>',
      '<span style="color:#888;font-size:10px;">Tap grid cell to paint · tap again to remove · then CONFIRM</span>',
      '<span style="margin-left:auto;color:#666;font-size:10px;">[R] confirm · [ESC] cancel</span>',
    ].join('');
    uiLayer.appendChild(banner);
    this._roadModeBanner = banner;

    // Show budget panel
    const panel = document.createElement('div');
    panel.id = 'road-budget-panel';
    panel.style.cssText = [
      'position:absolute',
      'bottom:10px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#07122a',
      'border:1px solid #00B8D4',
      'padding:8px 14px',
      'display:flex',
      'gap:12px',
      'align-items:center',
      'font-size:11px',
      'font-family:monospace',
      'color:#E8E4D0',
      'white-space:nowrap',
      'z-index:100',
      'pointer-events:auto',
    ].join(';');
    // Stop all touch/pointer events from propagating to the PixiJS canvas.
    // Bubble phase (no capture) so child buttons still receive the events first.
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach(evt => {
      panel.addEventListener(evt, (e) => e.stopPropagation());
    });
    uiLayer.appendChild(panel);
    this._roadBudgetPanel = panel;
    this._updateBudgetPanel();
  }

  private _exitRoadMode(): void {
    this._roadMode = false;
    this._roadPreview.clear();
    this._roadModeBanner?.remove();
    this._roadModeBanner = null;
    this._roadBudgetPanel?.remove();
    this._roadBudgetPanel = null;
    this._drawRoadLayer();
  }

  private _updateBudgetPanel(): void {
    if (!this._roadBudgetPanel || !this._storage) return;
    const available = this._storage.getBarCount('iron_bar');
    const queued = this._roadPreview.size;
    const canAfford = available >= queued;
    const confirmColor = canAfford ? '#D4A843' : '#3a5a8a';
    const confirmBg = canAfford ? '#1a3060' : '#0f1e38';
    const costColor = canAfford ? '#E8E4D0' : '#f87171';

    this._roadBudgetPanel.innerHTML = [
      `<span style="color:#888;">Iron Bars:</span>`,
      `<span style="color:#D4A843;font-weight:bold;">${available} available</span>`,
      `<span style="color:#444;">│</span>`,
      `<span style="color:#888;">Rate:</span>`,
      `<span style="color:#E8E4D0;">1 iron bar/tile</span>`,
      `<span style="color:#444;">│</span>`,
      `<span style="color:#888;">Preview:</span>`,
      `<span style="color:#00B8D4;">${queued} tiles</span>`,
      `<span style="color:#444;">│</span>`,
      `<span style="color:#888;">Cost:</span>`,
      `<span style="color:${costColor};font-weight:bold;">1 iron bar/tile · ${queued} tiles = ${queued} bars${!canAfford && queued > 0 ? ` (need ${queued - available} more)` : ''}</span>`,
      `<span style="color:#444;">│</span>`,
      `<button id="road-confirm-btn" style="background:${confirmBg};color:${confirmColor};border:1px solid #3a5a8a;font-family:monospace;font-size:10px;padding:3px 8px;cursor:${canAfford && queued > 0 ? 'pointer' : 'default'};">CONFIRM</button>`,
      `<button id="road-cancel-btn" style="background:#1a3060;color:#E8E4D0;border:1px solid #3a5a8a;font-family:monospace;font-size:10px;padding:3px 8px;cursor:pointer;">CANCEL</button>`,
    ].join('');

    const confirmBtn = this._roadBudgetPanel.querySelector('#road-confirm-btn') as HTMLButtonElement | null;
    const cancelBtn = this._roadBudgetPanel.querySelector('#road-cancel-btn') as HTMLButtonElement | null;
    confirmBtn?.addEventListener('click', (e) => { e.stopPropagation(); this._confirmRoadPlacement(); });
    cancelBtn?.addEventListener('click', (e) => { e.stopPropagation(); this._exitRoadMode(); });
  }

  private _confirmRoadPlacement(): void {
    if (!this._storage) { this._exitRoadMode(); return; }
    const available = this._storage.getBarCount('iron_bar');
    const queued = this._roadPreview.size;
    if (queued === 0) { this._exitRoadMode(); return; }
    if (available < queued) {
      // Cannot afford — don't place
      this._updateBudgetPanel();
      return;
    }
    // Deduct iron bars and place all preview roads
    this._storage.pull('iron_bar', queued);
    for (const key of this._roadPreview) {
      const [r, c] = key.split(',').map(Number);
      roadNetwork.add(r, c);
    }
    this._exitRoadMode();
  }

  private _updateRoadMode(): void {
    if (!this._player) return;

    // Draw road layer each frame while in road mode (preview changes with player movement)
    this._drawRoadLayer();

    // R key again = confirm
    if (inputManager.wasJustPressed('retool_factory')) {
      this._confirmRoadPlacement();
      return;
    }

    // ESC = cancel
    if (inputManager.wasJustPressed('pause_menu')) {
      this._exitRoadMode();
      return;
    }

    // Determine current cell under player
    const col = Math.floor((this._player.x - GRID_ORIGIN.x) / CELL_SIZE);
    const row = Math.floor((this._player.y - GRID_ORIGIN.y) / CELL_SIZE);
    const inBounds = col >= 0 && col < BuildGrid.COLS && row >= 0 && row < BuildGrid.ROWS;

    if (inBounds && inputManager.wasJustPressed('interact')) {
      const k = this._roadKey(row, col);
      if (inputManager.isHeld('zone_paint') /* Shift analogue */ || false) {
        // Shift+E: remove placed road and refund bar
        if (roadNetwork.hasRoad(row, col)) {
          roadNetwork.remove(row, col);
          if (this._storage) {
            this._storage.setStock('iron_bar', this._storage.getBarCount('iron_bar') + 1);
          }
        } else {
          this._roadPreview.delete(k);
        }
      } else {
        // E: toggle current cell in preview
        if (roadNetwork.hasRoad(row, col)) {
          // Already a placed road — treat Shift+E as remove; plain E does nothing
        } else if (this._roadPreview.has(k)) {
          this._roadPreview.delete(k);
        } else {
          this._roadPreview.add(k);
        }
      }
      this._updateBudgetPanel();
    }

    // Hold E + player moving = continuously add cells (paint)
    if (inBounds && inputManager.isHeld('interact') && !inputManager.wasJustPressed('interact')) {
      const k = this._roadKey(row, col);
      if (!roadNetwork.hasRoad(row, col) && !this._roadPreview.has(k)) {
        this._roadPreview.add(k);
        this._updateBudgetPanel();
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

  // -------------------------------------------------------------------------
  // Perimeter fence — collision + visuals
  // -------------------------------------------------------------------------

  private _registerFenceObstacles(): void {
    obstacleManager.clear();

    // Top wall
    obstacleManager.addWall({
      x: FENCE_LEFT, y: FENCE_TOP,
      w: FENCE_RIGHT - FENCE_LEFT, h: FENCE_THICK,
    });
    // Bottom wall
    obstacleManager.addWall({
      x: FENCE_LEFT, y: FENCE_BOTTOM - FENCE_THICK,
      w: FENCE_RIGHT - FENCE_LEFT, h: FENCE_THICK,
    });
    // Left wall
    obstacleManager.addWall({
      x: FENCE_LEFT, y: FENCE_TOP,
      w: FENCE_THICK, h: FENCE_BOTTOM - FENCE_TOP,
    });
    // East wall — split into two segments around the gate gap
    obstacleManager.addWall({
      x: FENCE_RIGHT - FENCE_THICK, y: FENCE_TOP,
      w: FENCE_THICK, h: FENCE_GATE_TOP - FENCE_TOP,
    });
    obstacleManager.addWall({
      x: FENCE_RIGHT - FENCE_THICK, y: FENCE_GATE_BOT,
      w: FENCE_THICK, h: FENCE_BOTTOM - FENCE_GATE_BOT,
    });

    // Navigation waypoints so drones can route around the compound to reach
    // the gate. The visibility-graph pathfinder uses these as intermediate
    // hops when the direct line is wall-blocked.
    const navOffset = 30;
    const gateMidY = (FENCE_GATE_TOP + FENCE_GATE_BOT) / 2;
    obstacleManager.addWaypoint({ x: FENCE_RIGHT + navOffset,  y: gateMidY });                       // gate approach (outside)
    obstacleManager.addWaypoint({ x: FENCE_RIGHT - FENCE_THICK - navOffset, y: gateMidY });          // gate approach (inside)
    obstacleManager.addWaypoint({ x: FENCE_RIGHT + navOffset,  y: FENCE_TOP - navOffset });          // NE outer corner
    obstacleManager.addWaypoint({ x: FENCE_RIGHT + navOffset,  y: FENCE_BOTTOM + navOffset });       // SE outer corner
    obstacleManager.addWaypoint({ x: FENCE_LEFT  - navOffset,  y: FENCE_TOP - navOffset });          // NW outer corner
    obstacleManager.addWaypoint({ x: FENCE_LEFT  - navOffset,  y: FENCE_BOTTOM + navOffset });       // SW outer corner
  }

  private _drawFence(): void {
    if (!this._stage) return;

    const NAVY      = 0x142540;
    const NAVY_DK   = 0x081229;
    const AMBER     = 0xD4A843;
    const AMBER_LT  = 0xFFE4A0;
    const AMBER_DK  = 0x8C6B22;
    const TEAL      = 0x00B8D4;
    const BOLT      = 0x2A1A05;

    const fence = new Graphics();

    // Helper: draw an industrial wall segment as a dark navy band with an
    // amber inner stripe, evenly spaced metal posts, and faint teal mesh.
    const drawWallBand = (
      x: number, y: number, w: number, h: number, horizontal: boolean,
    ): void => {
      // Outer shadow strip (one px outside the band for grounded look)
      fence.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: NAVY_DK });
      // Base panel
      fence.rect(x, y, w, h).fill({ color: NAVY });
      // Amber inner highlight (top/left edge of the band)
      if (horizontal) {
        fence.rect(x, y + 1, w, 1).fill({ color: AMBER_DK });
      } else {
        fence.rect(x + 1, y, 1, h).fill({ color: AMBER_DK });
      }

      // Diagonal mesh weave between posts (subtle teal)
      const meshStep = 6;
      if (horizontal) {
        for (let i = 0; i < w; i += meshStep) {
          fence.moveTo(x + i, y + 1);
          fence.lineTo(x + i + meshStep, y + h - 1);
          fence.moveTo(x + i + meshStep, y + 1);
          fence.lineTo(x + i, y + h - 1);
        }
      } else {
        for (let i = 0; i < h; i += meshStep) {
          fence.moveTo(x + 1, y + i);
          fence.lineTo(x + w - 1, y + i + meshStep);
          fence.moveTo(x + 1, y + i + meshStep);
          fence.lineTo(x + w - 1, y + i);
        }
      }
      fence.stroke({ color: TEAL, width: 0.6, alpha: 0.35 });

      // Metal posts every 28px — slightly taller than the wall thickness so
      // they read as posts when viewed from above.
      const POST_SPACING = 28;
      const POST_OVERHANG = 3;
      const POST_SIZE = 5;
      if (horizontal) {
        for (let px = x + POST_SPACING / 2; px < x + w; px += POST_SPACING) {
          fence.rect(px - POST_SIZE / 2, y - POST_OVERHANG, POST_SIZE, h + POST_OVERHANG * 2)
               .fill({ color: AMBER });
          fence.rect(px - POST_SIZE / 2, y - POST_OVERHANG, POST_SIZE, 1)
               .fill({ color: AMBER_LT });
          // Bolt heads top + bottom
          fence.circle(px, y - POST_OVERHANG + 1, 0.9).fill({ color: BOLT });
          fence.circle(px, y + h + POST_OVERHANG - 1, 0.9).fill({ color: BOLT });
        }
      } else {
        for (let py = y + POST_SPACING / 2; py < y + h; py += POST_SPACING) {
          fence.rect(x - POST_OVERHANG, py - POST_SIZE / 2, w + POST_OVERHANG * 2, POST_SIZE)
               .fill({ color: AMBER });
          fence.rect(x - POST_OVERHANG, py - POST_SIZE / 2, 1, POST_SIZE)
               .fill({ color: AMBER_LT });
          fence.circle(x - POST_OVERHANG + 1, py, 0.9).fill({ color: BOLT });
          fence.circle(x + w + POST_OVERHANG - 1, py, 0.9).fill({ color: BOLT });
        }
      }
    };

    // Four wall bands (east wall split around gate)
    drawWallBand(FENCE_LEFT,  FENCE_TOP,                    FENCE_RIGHT - FENCE_LEFT, FENCE_THICK,                  true);  // top
    drawWallBand(FENCE_LEFT,  FENCE_BOTTOM - FENCE_THICK,   FENCE_RIGHT - FENCE_LEFT, FENCE_THICK,                  true);  // bottom
    drawWallBand(FENCE_LEFT,  FENCE_TOP,                    FENCE_THICK,              FENCE_BOTTOM - FENCE_TOP,     false); // left
    drawWallBand(FENCE_RIGHT - FENCE_THICK, FENCE_TOP,      FENCE_THICK,              FENCE_GATE_TOP - FENCE_TOP,   false); // east upper
    drawWallBand(FENCE_RIGHT - FENCE_THICK, FENCE_GATE_BOT, FENCE_THICK,              FENCE_BOTTOM - FENCE_GATE_BOT, false); // east lower

    // ── Gate ────────────────────────────────────────────────────────────────
    // Two beefy gate posts flanking the gap, an amber arch beam between them
    // a teal energy threshold across the opening, and two open door panels
    // swung outward (drawn as rotated containers).
    const gx = FENCE_RIGHT;
    const gyTop = FENCE_GATE_TOP;
    const gyBot = FENCE_GATE_BOT;
    const gMid = (gyTop + gyBot) / 2;
    const postW = FENCE_THICK + 6;
    const postH = 14;

    // Gate posts (anchors for the doors)
    const drawGatePost = (px: number, py: number) => {
      fence.rect(px, py - postH / 2, postW, postH).fill({ color: NAVY_DK });
      fence.rect(px + 1, py - postH / 2 + 1, postW - 2, postH - 2).fill({ color: AMBER });
      fence.rect(px + 1, py - postH / 2 + 1, postW - 2, 1).fill({ color: AMBER_LT });
      // Bolt corners
      fence.circle(px + 2,         py - postH / 2 + 2,         1.1).fill({ color: BOLT });
      fence.circle(px + postW - 2, py - postH / 2 + 2,         1.1).fill({ color: BOLT });
      fence.circle(px + 2,         py + postH / 2 - 2,         1.1).fill({ color: BOLT });
      fence.circle(px + postW - 2, py + postH / 2 - 2,         1.1).fill({ color: BOLT });
    };
    drawGatePost(gx - postW / 2, gyTop);
    drawGatePost(gx - postW / 2, gyBot);

    // Arch beam connecting the two gate posts on the OUTSIDE (east) side.
    // Drawn as a thin amber arc using line segments.
    const archX0 = gx + postW / 2 - 1;
    const archSegments = 14;
    const archDepth = 10;
    fence.moveTo(archX0, gyTop);
    for (let i = 1; i <= archSegments; i++) {
      const t = i / archSegments;
      const py = gyTop + (gyBot - gyTop) * t;
      // Symmetric bulge outward (east) peaking at the midpoint
      const bulge = Math.sin(t * Math.PI) * archDepth;
      fence.lineTo(archX0 + bulge, py);
    }
    fence.stroke({ color: AMBER, width: 2 });
    // Inner highlight arc
    fence.moveTo(archX0, gyTop);
    for (let i = 1; i <= archSegments; i++) {
      const t = i / archSegments;
      const py = gyTop + (gyBot - gyTop) * t;
      const bulge = Math.sin(t * Math.PI) * (archDepth - 2);
      fence.lineTo(archX0 + bulge, py);
    }
    fence.stroke({ color: AMBER_LT, width: 0.6, alpha: 0.7 });

    // Energy threshold — vertical teal line across the gate opening with a
    // few horizontal scan strokes for sci-fi flavor.
    fence.rect(gx - FENCE_THICK + 1, gyTop + 2, FENCE_THICK - 2, gyBot - gyTop - 4)
         .fill({ color: TEAL, alpha: 0.18 });
    fence.rect(gx - FENCE_THICK / 2, gyTop + 2, 1, gyBot - gyTop - 4)
         .fill({ color: TEAL, alpha: 0.55 });
    for (let py = gyTop + 6; py < gyBot - 4; py += 5) {
      fence.rect(gx - FENCE_THICK + 2, py, FENCE_THICK - 4, 0.8)
           .fill({ color: TEAL, alpha: 0.45 });
    }

    fence.zIndex = 1;
    this._stage.addChild(fence);

    // Open gate doors — separate Containers so we can rotate each about its
    // hinge. Each door is a horizontal beam with three vertical bars and two
    // diagonal cross-braces, swung outward (east) ~70° from the closed
    // position so the gap reads as "open".
    const doorLen = (gyBot - gyTop) * 0.55;
    const doorThick = 5;

    const buildDoor = (hingeX: number, hingeY: number, swingRad: number): Container => {
      const door = new Container();
      const dg = new Graphics();
      // Beam
      dg.rect(0, -doorThick / 2, doorLen, doorThick).fill({ color: AMBER_DK });
      dg.rect(0, -doorThick / 2, doorLen, 1).fill({ color: AMBER_LT });
      dg.rect(0, doorThick / 2 - 1, doorLen, 1).fill({ color: NAVY_DK });
      // Vertical bars
      for (let i = 0; i < 3; i++) {
        const bx = (doorLen / 3) * (i + 0.5);
        dg.rect(bx - 1.5, -doorThick / 2 - 4, 3, doorThick + 8).fill({ color: AMBER });
      }
      // Diagonal cross-brace
      dg.moveTo(2, -doorThick / 2);
      dg.lineTo(doorLen - 2, doorThick / 2);
      dg.moveTo(2, doorThick / 2);
      dg.lineTo(doorLen - 2, -doorThick / 2);
      dg.stroke({ color: AMBER_DK, width: 1 });
      // Hinge knob
      dg.circle(0, 0, 2.5).fill({ color: NAVY_DK });
      dg.circle(0, 0, 1.5).fill({ color: AMBER_LT });
      // End handle
      dg.circle(doorLen, 0, 2).fill({ color: BOLT });

      door.addChild(dg);
      door.x = hingeX;
      door.y = hingeY;
      door.rotation = swingRad;
      return door;
    };

    // Top door hinges at top gate post, swings outward & up (negative y → angle)
    const topDoor = buildDoor(gx, gyTop, -Math.PI * 0.42);
    // Bottom door hinges at bottom gate post, swings outward & down
    const botDoor = buildDoor(gx, gyBot, Math.PI * 0.42);
    this._stage.addChild(topDoor);
    this._stage.addChild(botDoor);

    // GATE label above the arch — small amber text plate
    const labelG = new Graphics();
    const labelW = 28;
    const labelH = 8;
    const labelX = gx + archDepth + 4;
    const labelY = gMid - labelH / 2;
    labelG.rect(labelX - 1, labelY - 1, labelW + 2, labelH + 2).fill({ color: NAVY_DK });
    labelG.rect(labelX, labelY, labelW, labelH).fill({ color: NAVY });
    labelG.rect(labelX, labelY, labelW, 1).fill({ color: AMBER_LT });
    labelG.rect(labelX, labelY + labelH - 1, labelW, 1).fill({ color: AMBER_DK });
    // Tiny pixel-art "GATE" marks (5 amber dots + spacers)
    const dot = (cx: number, cy: number) => labelG.rect(cx, cy, 1, 1).fill({ color: AMBER_LT });
    const baseY = labelY + 3;
    // G
    dot(labelX + 3, baseY); dot(labelX + 4, baseY); dot(labelX + 3, baseY + 1); dot(labelX + 3, baseY + 2); dot(labelX + 4, baseY + 2); dot(labelX + 4, baseY + 1);
    // A
    dot(labelX + 7, baseY); dot(labelX + 8, baseY); dot(labelX + 6, baseY + 1); dot(labelX + 9, baseY + 1); dot(labelX + 6, baseY + 2); dot(labelX + 9, baseY + 2); dot(labelX + 7, baseY + 1); dot(labelX + 8, baseY + 1);
    // T
    dot(labelX + 11, baseY); dot(labelX + 12, baseY); dot(labelX + 13, baseY); dot(labelX + 12, baseY + 1); dot(labelX + 12, baseY + 2);
    // E
    dot(labelX + 15, baseY); dot(labelX + 16, baseY); dot(labelX + 17, baseY); dot(labelX + 15, baseY + 1); dot(labelX + 15, baseY + 2); dot(labelX + 16, baseY + 2); dot(labelX + 17, baseY + 2); dot(labelX + 16, baseY + 1);
    // Direction chevron pointing east (out)
    labelG.moveTo(labelX + 21, labelY + 1);
    labelG.lineTo(labelX + 25, labelY + labelH / 2);
    labelG.lineTo(labelX + 21, labelY + labelH - 1);
    labelG.stroke({ color: AMBER_LT, width: 1 });
    this._stage.addChild(labelG);
  }

  private _initGrid(): void {
    buildGrid.deserialize([]); // reset

    // Storage (1×1) at [2,0]
    const storagePos = gridToWorld(2, 0);
    this._storage = new StorageDepot(storagePos.x, storagePos.y);
    buildGrid.place({ buildingId: 'storage_0', buildingType: 'storage', row: 2, col: 0, footprint: { rows: 1, cols: 1 } });
    const storagePlaced = new PlacedBuilding('storage_0', 'storage', 2, 0, { rows: 1, cols: 1 });
    this._placedBuildings.push(storagePlaced);
    this._buildingLayer!.addChild(storagePlaced.container);
    this._buildingLayer!.addChild(this._storage.container);

    // Furnace (1×1) at [2,1] — use Furnace entity, not PlacedBuilding
    const furnacePos = gridToWorld(2, 1);
    this._furnace = new Furnace(furnacePos.x, furnacePos.y, this._storage);
    buildGrid.place({ buildingId: 'furnace_0', buildingType: 'furnace', row: 2, col: 1, footprint: { rows: 1, cols: 1 } });
    this._buildingLayer!.addChild(this._furnace.container);

    // Fabricator placeholder (2×2) at [0,0] — always pre-placed; [E] opens Build Menu
    buildGrid.place({ buildingId: 'fabricator_0', buildingType: 'fabricator', row: 0, col: 0, footprint: { rows: 2, cols: 2 } });
    const fabPb = new PlacedBuilding('fabricator_0', 'fabricator', 0, 0, { rows: 2, cols: 2 });
    this._placedBuildings.push(fabPb);
    this._buildingLayer!.addChild(fabPb.container);

    // Drone Depot (2x2) at [0,3] (top right)
    const depotFootprint = BUILD_FOOTPRINTS['drone_depot'];
    buildGrid.place({ buildingId: 'drone_depot_0', buildingType: 'drone_depot', row: 0, col: 3, footprint: depotFootprint });
    this._spawnBuilding('drone_depot', 'drone_depot_0', 0, 3, depotFootprint);
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

    // Electrolysis unit update
    this._electrolysisUnit?.update(delta);

    // Drone entity movement update
    fleetManager.update(delta);

    // Dispatcher update
    outpostDispatcher.update(delta);

    // Ghost placement update (before other E-key handling)
    if (this._ghostBuilding) {
      this._updateGhostPlacement();
      return; // while ghost is active, skip normal interactions
    }

    // Road mode update
    if (this._roadMode) {
      this._updateRoadMode();
      return; // while road mode is active, skip normal interactions
    }

    // Enter road mode on R key (retool_factory) when no ghost and no overlay is open
    if (inputManager.wasJustPressed('retool_factory')) {
      const anyOverlayOpen =
        (this._furnaceOverlay?.isOpen() ?? false) ||
        (this._marketplaceOverlay?.isOpen() ?? false) ||
        (this._droneDepotOverlay?.isOpen() ?? false) ||
        (this._buildMenuOverlay?.isOpen() ?? false) ||
        (this._depositPanel?.isOpen() ?? false) ||
        (this._electrolysisOverlay?.isOpen() ?? false) ||
        (this._launchpadPanel !== null);
      if (!anyOverlayOpen) {
        this._enterRoadMode();
      }
    }

    // Production overlay toggle [O]
    if (inputManager.wasJustPressed('production_overlay')) {
      this._productionOverlayActive = !this._productionOverlayActive;
      this._productionOverlay?.setVisible(this._productionOverlayActive);
      if (this._productionOverlayActive) {
        this._showProductionLegend();
      } else {
        this._hideProductionLegend();
      }
    }

    // Update production overlay each frame when active
    if (this._productionOverlayActive && this._productionOverlay) {
      this._productionOverlay.renderOutpost(this._gatherBuildingStatuses());
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
      if (this._depositPanel?.isOpen()) this._depositPanel.close();
      if (this._roadMode) this._exitRoadMode();
      this._buildMenuOverlay?.toggle();
    }

    // Close overlays on ESC (pause_menu action)
    if (inputManager.wasJustPressed('pause_menu')) {
      if (this._depositPanel?.isOpen())        { this._depositPanel.close();        return; }
      if (this._furnaceOverlay?.isOpen())      { this._furnaceOverlay.close();      return; }
      if (this._marketplaceOverlay?.isOpen())  { this._marketplaceOverlay.close();  return; }
      if (this._droneDepotOverlay?.isOpen())   { this._droneDepotOverlay.close();   return; }
      if (this._buildMenuOverlay?.isOpen())    { this._buildMenuOverlay.close();    return; }
      if (this._electrolysisOverlay?.isOpen()) { this._electrolysisOverlay.close(); return; }
      if (this._launchpadPanel)                { this._closeLaunchpadPanel();       return; }
    }

    // ── Autonomy beat (TDD §4.7) ─────────────────────────────────────────────
    // Timer ticks while the player is not pressing any movement key.
    // At 120 s, if credits increased since the timer started, show win banner.
    const playerMoving =
      inputManager.isHeld('player_move_up')    ||
      inputManager.isHeld('player_move_down')  ||
      inputManager.isHeld('player_move_left')  ||
      inputManager.isHeld('player_move_right');

    if (playerMoving) {
      if (this._autonomyTimer > 0) {
        // Player just started moving again — re-snapshot credits
        this._autonomyCreditsStart = gameState.credits;
      }
      this._autonomyTimer = 0;
    } else {
      this._autonomyTimer += delta; // delta is in seconds

      if (!this._autonomyWinShown && this._autonomyTimer >= 120) {
        const creditsEarned = gameState.credits - this._autonomyCreditsStart;
        if (creditsEarned > 0) {
          this._showAutonomyWinBanner();
          this._autonomyWinShown = true;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    this._updateResourceRail();

    // Redraw road layer to show placed roads
    this._drawRoadLayer();

    // Update build prompt overlay visibility
    const playerNearGrid = this._player && this._isPlayerNearGrid(this._player.x, this._player.y);
    const menuOpen = this._buildMenuOverlay?.isOpen() ?? false;
    this._buildPromptOverlay?.update(playerNearGrid ?? false, menuOpen);
  }

  private _railUpdateTimer = 0;
  private _updateResourceRail(): void {
    this._railUpdateTimer += 1/60;
    if (this._railUpdateTimer < 0.25) return;
    this._railUpdateTimer = 0;

    const pool = this._storage?.getStockpile() ?? new Map();
    const cap = 1000;
    planetResources.value = [
      { key: 'iron_ore',      label: 'IRON',   subLabel: 'ORE', swatchColor: '#B45F06', carried: inventory.getByType('iron_ore'),      pool: pool.get('iron_ore')      ?? 0, cap },
      { key: 'copper_ore',    label: 'COPPER', subLabel: 'ORE', swatchColor: '#E69138', carried: inventory.getByType('copper_ore'),    pool: pool.get('copper_ore')    ?? 0, cap },
      { key: 'water',         label: 'WATER',  subLabel: 'ICE', swatchColor: '#3D85C6', carried: inventory.getByType('water'),         pool: pool.get('water')         ?? 0, cap },
      { key: 'iron_bar',      label: 'IRON',   subLabel: 'BAR', swatchColor: '#999999', carried: inventory.getByType('iron_bar'),      pool: pool.get('iron_bar')      ?? 0, cap },
      { key: 'copper_bar',    label: 'COPPER', subLabel: 'BAR', swatchColor: '#F6B26B', carried: inventory.getByType('copper_bar'),    pool: pool.get('copper_bar')    ?? 0, cap },
      { key: 'hydrolox_fuel', label: 'FUEL',   subLabel: 'HYD', swatchColor: '#00E5FF', carried: inventory.getByType('hydrolox_fuel'), pool: pool.get('hydrolox_fuel') ?? 0, cap },
    ];
  }

  // -------------------------------------------------------------------------
  // Ghost placement
  // -------------------------------------------------------------------------

  private _startGhostPlacement(buildingType: string): void {
    if (this._roadMode) {
      this._exitRoadMode();
    }
    if (this._ghostBuilding) {
      this._cancelGhost();
    }
    const footprint = BUILD_FOOTPRINTS[buildingType] ?? { rows: 1, cols: 1 };
    this._ghostBuilding = PlacedBuilding.createGhost(buildingType, footprint);
    this._ghostBuildingType = buildingType;
    this._ghostCurrentlyValid = false;
    this._stage!.addChild(this._ghostBuilding.container);
    this._showGhostActionPanel(buildingType);
  }

  private _startGhostMove(buildingId: string): void {
    if (this._roadMode) {
      this._exitRoadMode();
    }
    const entry = buildGrid.pickup(buildingId);
    if (!entry) return;

    // Store so we can restore the building if the move is canceled via Esc
    this._ghostMoveEntry = entry;

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
    this._ghostCurrentlyValid = false;
    this._stage!.addChild(this._ghostBuilding.container);
    this._showGhostActionPanel(entry.buildingType);
  }

  private _removeEntityBuilding(buildingId: string): void {
    // This handles removal if the marketplace or drone depot was picked up.
    // For now it's a visual-only concern; entity stays but can be re-placed.
    if (buildingId.startsWith('marketplace_') && this._marketplace) {
      this._buildingLayer?.removeChild(this._marketplace.container);
      this._marketplace = null;
      this._marketplaceOverlay?.unmount();
      this._marketplaceOverlay = null;
    }
    if (buildingId.startsWith('drone_depot_') && this._droneDepot) {
      this._buildingLayer?.removeChild(this._droneDepot.container);
      outpostDispatcher.stop();
      this._droneDepotOverlay?.close();
      this._droneDepot = null;
      resetDepotBuilt();
    }
  }

  private _showGhostActionPanel(buildingType: string): void {
    this._hideGhostActionPanel();
    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const panel = document.createElement('div');
    panel.id = 'ghost-action-panel';
    panel.style.cssText = [
      'position:absolute',
      'bottom:60px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(7,18,42,0.96)',
      'border:1px solid #D4A843',
      'padding:8px 14px',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'font-family:monospace',
      'font-size:12px',
      'color:#E8E4D0',
      'z-index:100',
      'pointer-events:auto',
      'white-space:nowrap',
    ].join(';');
    const label = buildingType.replace(/_/g, ' ').toUpperCase();
    panel.innerHTML = `
      <span style="color:#D4A843;">Placing: ${label}</span>
      <span style="color:#444;">│</span>
      <span style="color:#888;font-size:10px;">Walk to position</span>
      <span style="color:#444;">│</span>
      <button id="ghost-place-btn" disabled style="font-family:monospace;font-size:12px;padding:6px 16px;border:1px solid #3A5A8A;background:transparent;color:#3A5A8A;cursor:default;min-width:72px;">PLACE</button>
      <button id="ghost-cancel-btn" style="font-family:monospace;font-size:12px;padding:6px 14px;border:1px solid #8A3A3A;background:transparent;color:#E8E4D0;cursor:pointer;">CANCEL</button>
    `;
    // Stop all pointer/touch events from propagating to the PixiJS canvas below.
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach(evt => {
      panel.addEventListener(evt, (e) => e.stopPropagation(), { capture: true });
    });
    panel.querySelector('#ghost-cancel-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._cancelGhost();
    });
    panel.querySelector('#ghost-place-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._ghostBuilding && this._ghostCurrentlyValid) {
        this._confirmGhostPlacement(this._ghostBuilding.row, this._ghostBuilding.col);
      }
    });
    uiLayer.appendChild(panel);
    this._ghostActionPanel = panel;
  }

  private _hideGhostActionPanel(): void {
    this._ghostActionPanel?.remove();
    this._ghostActionPanel = null;
  }

  private _updateGhostActionPanel(valid: boolean): void {
    if (!this._ghostActionPanel) return;
    const btn = this._ghostActionPanel.querySelector('#ghost-place-btn') as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled = !valid;
    if (valid) {
      btn.style.borderColor = '#4ADE80';
      btn.style.color = '#4ADE80';
      btn.style.cursor = 'pointer';
      btn.style.background = 'rgba(0,60,20,0.4)';
    } else {
      btn.style.borderColor = '#3A5A8A';
      btn.style.color = '#3A5A8A';
      btn.style.cursor = 'default';
      btn.style.background = 'transparent';
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
    if (valid !== this._ghostCurrentlyValid) {
      this._ghostCurrentlyValid = valid;
      this._updateGhostActionPanel(valid);
    }

    // E to confirm placement (keyboard)
    if (inputManager.wasJustPressed('interact') && valid) {
      this._confirmGhostPlacement(clampedRow, clampedCol);
      return;
    }

    // ESC to cancel (keyboard)
    if (inputManager.wasJustPressed('pause_menu')) {
      this._cancelGhost();
    }
  }

  private _confirmGhostPlacement(row: number, col: number): void {
    if (!this._ghostBuilding || !this._ghostBuildingType || !this._storage) return;

    const buildingType = this._ghostBuildingType;
    const isMove = this._ghostMoveEntry !== null;

    if (!isMove) {
      // New placement — check and deduct resource costs
      const costs = BUILD_COSTS[buildingType] ?? { iron_bar: 0, copper_bar: 0 };
      if (
        this._storage.getBarCount('iron_bar')    < costs.iron_bar ||
        this._storage.getBarCount('copper_bar')  < costs.copper_bar
      ) {
        this._cancelGhost();
        return;
      }
      this._storage.pull('iron_bar',   costs.iron_bar);
      this._storage.pull('copper_bar', costs.copper_bar);
    }

    const footprint = this._ghostBuilding.footprint;
    // Preserve the original buildingId when re-placing a moved building
    const buildingId = isMove ? this._ghostMoveEntry!.buildingId : `${buildingType}_${Date.now()}`;

    // Register in grid
    buildGrid.place({ buildingId, buildingType, row, col, footprint });

    // Spawn the real entity
    this._spawnBuilding(buildingType, buildingId, row, col, footprint);

    // Remove ghost
    this._ghostBuilding.destroy();
    this._stage!.removeChild(this._ghostBuilding.container);
    this._ghostBuilding = null;
    this._ghostBuildingType = null;
    this._ghostMoveEntry = null;
    this._hideGhostActionPanel();

    // Refresh build menu
    this._buildMenuOverlay?.refresh();
  }

  private _cancelGhost(): void {
    if (!this._ghostBuilding) return;
    this._ghostBuilding.destroy();
    this._stage?.removeChild(this._ghostBuilding.container);
    this._ghostBuilding = null;
    this._ghostBuildingType = null;
    this._hideGhostActionPanel();

    // If we were moving an existing building, restore it to its original position
    if (this._ghostMoveEntry) {
      const entry = this._ghostMoveEntry;
      this._ghostMoveEntry = null;
      buildGrid.place({ ...entry });
      this._spawnBuilding(entry.buildingType, entry.buildingId, entry.row, entry.col, entry.footprint);
      this._buildMenuOverlay?.refresh();
    }
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
      this._buildingLayer!.addChild(market.container);

      this._marketplaceOverlay?.unmount();
      this._marketplaceOverlay = new MarketplaceOverlay(market, this._storage!);
      this._marketplaceOverlay.mount();
    } else if (buildingType === 'drone_depot') {
      const depot = new DroneDepot(wx, wy);
      this._droneDepot = depot;
      this._buildingLayer!.addChild(depot.container);

      // Wire up depot
      try {
        depot.onBuild(this._storage!, this._furnace!, outpostDispatcher);
      } catch (err) {
        console.warn('DroneDepot.onBuild failed:', err);
      }

      // Create overlay for this depot; pass stage as drone spawn container
      this._droneDepotOverlay?.unmount();
      this._droneDepotOverlay = new DroneDepotOverlay(depot, () => this._stage!);
      this._droneDepotOverlay.mount();
    } else if (buildingType === 'electrolysis_unit') {
      const eu = new ElectrolysisUnit(wx, wy);
      this._electrolysisUnit = eu;
      this._buildingLayer!.addChild(eu.container);
      this._electrolysisOverlay?.unmount();
      this._electrolysisOverlay = new ElectrolysisOverlay(eu);
      this._electrolysisOverlay.mount();
      outpostDispatcher.setElectrolysisUnit(eu);
    } else if (buildingType === 'launchpad') {
      const lp = new Launchpad(wx, wy);
      this._launchpad = lp;
      this._buildingLayer!.addChild(lp.container);
      outpostDispatcher.setLaunchpad(lp);
    } else {
      // Generic PlacedBuilding fallback
      const pb = new PlacedBuilding(buildingId, buildingType, row, col, footprint);
      this._placedBuildings.push(pb);
      this._buildingLayer!.addChild(pb.container);
    }
  }

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  private _handleInteract(): void {
    const px = this._player!.x;
    const py = this._player!.y;

    // If deposit panel is open, pressing E starts hand-mining on the active deposit
    if (this._depositPanel?.isOpen()) {
      // E triggers mine action (panel's onHandMine already wired; pressing E while
      // panel is open starts hold-mining directly too)
      miningService.onInteract(px, py);
      return;
    }

    // Close whichever overlay is open and bail
    if (this._furnaceOverlay?.isOpen())       { this._furnaceOverlay.close();       return; }
    if (this._marketplaceOverlay?.isOpen())   { this._marketplaceOverlay.close();   return; }
    if (this._droneDepotOverlay?.isOpen())    { this._droneDepotOverlay.close();    return; }
    if (this._buildMenuOverlay?.isOpen())     { this._buildMenuOverlay.close();     return; }
    if (this._electrolysisOverlay?.isOpen())  { this._electrolysisOverlay.close();  return; }

    // Grid-tile-based interaction: every cell of a building's footprint triggers
    // the correct action menu, eliminating the circle-radius gap bugs.
    const col = Math.floor((px - GRID_ORIGIN.x) / CELL_SIZE);
    const row = Math.floor((py - GRID_ORIGIN.y) / CELL_SIZE);
    if (col >= 0 && col < BuildGrid.COLS && row >= 0 && row < BuildGrid.ROWS) {
      const entry = buildGrid.getBuildingAt(row, col);
      if (entry) {
        if (entry.buildingType === 'furnace')           { this._furnaceOverlay?.open();      return; }
        if (entry.buildingType === 'marketplace')       { this._marketplaceOverlay?.open();  return; }
        if (entry.buildingType === 'drone_depot')       { this._droneDepotOverlay?.open();   return; }
        if (entry.buildingType === 'storage')           { miningService.onInteract(px, py);  return; }
        if (entry.buildingType === 'fabricator')        { this._buildMenuOverlay?.open();    return; }
        if (entry.buildingType === 'electrolysis_unit') { this._electrolysisOverlay?.open(); return; }
        if (entry.buildingType === 'launchpad')         { this._openLaunchpadPanel();        return; }
        return; // occupied tile, type not interactable
      }
      // Empty grid tile → build menu
      this._buildMenuOverlay?.open();
      return;
    }

    // Outside grid → check for nearby deposit first; show panel, don't mine immediately
    const nearDeposit = depositMap.getNearestDeposit(px, py, 60);
    if (nearDeposit) {
      this._openDepositPanel(nearDeposit);
      return;
    }

    // No deposit nearby → fall back (e.g., plain walk area)
    miningService.onInteract(px, py);
  }

  /** Build and open the deposit interaction panel for a specific deposit. */
  private _openDepositPanel(deposit: Deposit): void {
    if (!this._depositPanel) return;

    const oreType = deposit.data.oreType;
    const oreLabel = _ORE_LABELS[oreType] ?? `${oreType.toUpperCase().replace(/_/g, ' ')} DEPOSIT`;
    const stockRemaining = deposit.data.yieldRemaining;
    const stockMax = deposit.initialYield || 820;
    const roadConnected = roadNetwork.getAll().length > 0;
    const assignedDroneName = outpostDispatcher.getAssignedDroneForOre(oreType as any);

    // Close other overlays when panel opens
    this._furnaceOverlay?.close();
    this._marketplaceOverlay?.close();
    this._droneDepotOverlay?.close();
    this._buildMenuOverlay?.close();

    this._depositPanel.open(deposit, {
      oreLabel,
      stockRemaining,
      stockMax,
      roadConnected,
      assignedDroneName,
      onHandMine: () => {
        // Trigger hold-mining at the deposit location
        miningService.onInteract(deposit.data.x, deposit.data.y);
      },
      onRecall: () => {
        // Recall all drones and re-render (simplest implementation)
        this._depositPanel?.close();
      },
      onClose: () => {
        this._depositPanel?.close();
        miningService.onInteractReleased();
      },
    });
  }

  private _openLaunchpadPanel(): void {
    if (this._launchpadPanel) return;
    const lp = this._launchpad;
    if (!lp) return;

    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const panel = document.createElement('div');
    panel.id = 'launchpad-panel';
    panel.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:rgba(7,18,42,0.98)',
      'border:1px solid #D4A843',
      'color:#E8E4D0',
      'font-family:monospace',
      'font-size:13px',
      'padding:0',
      'min-width:360px',
      'max-width:440px',
      'z-index:20',
      'pointer-events:auto',
    ].join(';');

    const render = () => {
      if (!panel.isConnected) return;
      const fuel = lp.fuelUnits;
      const needed = Launchpad.FUEL_REQUIRED;
      const pct = Math.min(100, Math.round((fuel / needed) * 100));
      const ready = fuel >= needed;
      const fuelColor = ready ? '#4ADE80' : '#00E5FF';
      panel.innerHTML = `
        <div style="background:#041229;color:#D4A843;padding:8px 14px;font-size:12px;font-weight:bold;border-bottom:1px solid #D4A843;display:flex;justify-content:space-between;align-items:center;">
          <span>🚀 LAUNCHPAD</span>
          <span style="font-size:10px;color:${ready ? '#4ADE80' : '#888'};">${ready ? '▶ READY TO LAUNCH' : '— FUELING'}</span>
        </div>
        <div style="padding:12px 14px;">
          <div style="font-size:11px;color:#D4A843;letter-spacing:1px;margin-bottom:8px;">HYDROLOX FUEL</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <div style="flex:1;height:10px;background:#0A1A2A;border:1px solid #1A3A5A;">
              <div style="display:inline-block;width:${pct}%;height:10px;background:${fuelColor};vertical-align:middle;"></div>
            </div>
            <span style="color:#E8E4D0;width:70px;text-align:right;">${fuel} / ${needed}</span>
          </div>
          <div style="font-size:10px;color:#444;margin-bottom:14px;">→ Logistics drones haul hydrolox_fuel from Storage</div>
          <div style="font-size:11px;color:#888;margin-bottom:14px;">Fuel ${needed - fuel > 0 ? `needed: ${needed - fuel} more units` : 'tank full — ready!'}</div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button id="lp-launch" style="font-family:monospace;font-size:11px;padding:4px 14px;border:1px solid ${ready ? '#4ADE80' : '#3A5A8A'};background:${ready ? '#0A3A0A' : 'transparent'};color:${ready ? '#4ADE80' : '#3A5A8A'};cursor:${ready ? 'pointer' : 'default'};" ${ready ? '' : 'disabled'}>LAUNCH ROCKET</button>
            <button id="lp-close" style="font-family:monospace;font-size:11px;padding:4px 12px;border:1px solid #3A5A8A;background:transparent;color:#E8E4D0;cursor:pointer;">CLOSE</button>
          </div>
        </div>
      `;
      panel.querySelector('#lp-close')?.addEventListener('click', () => this._closeLaunchpadPanel());
      panel.querySelector('#lp-launch')?.addEventListener('click', () => {
        if (lp.fuelUnits >= Launchpad.FUEL_REQUIRED) {
          lp.launchPhase1();
          this._closeLaunchpadPanel();
        }
      });
    };

    render();
    uiLayer.appendChild(panel);
    this._launchpadPanel = panel;

    // Refresh the panel every 500ms to show fuel progress
    const intervalId = window.setInterval(() => {
      if (!panel.isConnected) { window.clearInterval(intervalId); return; }
      render();
    }, 500);
    (panel as any).__intervalId = intervalId;

    // ESC key closes panel
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this._closeLaunchpadPanel();
        window.removeEventListener('keydown', onKey, true);
      }
    };
    window.addEventListener('keydown', onKey, true);
    (panel as any).__keyHandler = onKey;
  }

  private _closeLaunchpadPanel(): void {
    if (!this._launchpadPanel) return;
    const panel = this._launchpadPanel;
    const intervalId = (panel as any).__intervalId;
    if (intervalId !== undefined) window.clearInterval(intervalId);
    const keyHandler = (panel as any).__keyHandler;
    if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
    panel.remove();
    this._launchpadPanel = null;
  }

  private _showPhase1CompleteOverlay(): void {
    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const overlay = document.createElement('div');
    overlay.id = 'phase1-complete-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.85)',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'z-index:9999',
      'font-family:monospace',
      'color:#E8E4D0',
    ].join(';');
    overlay.innerHTML = `
      <div style="background:#07122a;border:2px solid #D4A843;padding:32px 40px;min-width:380px;max-width:480px;text-align:center;box-shadow:0 0 60px rgba(212,168,67,0.3);">
        <div style="font-size:22px;font-weight:bold;color:#D4A843;margin-bottom:12px;">★ PHASE 1 COMPLETE ★</div>
        <div style="font-size:13px;color:#B8B4A0;margin-bottom:20px;">Rocket launched — asteroid outpost established!</div>
        <div style="font-size:11px;color:#666;margin-bottom:24px;">The hydrolox rocket burns bright against the void.<br>Phase 2 awaits beyond the belt…</div>
        <button id="phase1-continue" style="font-family:monospace;font-size:12px;padding:8px 20px;border:1px solid #D4A843;background:#1a3060;color:#D4A843;cursor:pointer;">CONTINUE</button>
      </div>
    `;
    uiLayer.appendChild(overlay);
    overlay.querySelector('#phase1-continue')?.addEventListener('click', () => overlay.remove());
  }

  private _isPlayerNearGrid(px: number, py: number, radius = 120): boolean {
    // Grid is roughly centered at GRID_ORIGIN, spans 5×5 cells
    const gridCenterX = GRID_ORIGIN.x + 2.5 * CELL_SIZE;
    const gridCenterY = GRID_ORIGIN.y + 2.5 * CELL_SIZE;
    const dx = px - gridCenterX;
    const dy = py - gridCenterY;
    return dx * dx + dy * dy <= radius * radius;
  }

  // -------------------------------------------------------------------------
  // Production overlay helpers
  // -------------------------------------------------------------------------

  private _gatherBuildingStatuses(): OutpostBuildingStatus[] {
    const statuses: OutpostBuildingStatus[] = [];

    // Storage Depot — always operational
    if (this._storage) {
      statuses.push({
        x: this._storage.x,
        y: this._storage.y,
        label: 'Storage',
        status: 'RUNNING',
      });
    }

    // Furnace
    if (this._furnace) {
      let furnaceStatus: OutpostBuildingStatus['status'];
      const recipe = this._furnace.recipe;
      if (recipe === 'off') {
        furnaceStatus = 'IDLE';
      } else {
        const plantState = this._furnace.plant.state;
        if (plantState === 'RUNNING') {
          furnaceStatus = 'RUNNING';
        } else {
          // STALLED (no input ore or output full) or NO_POWER
          furnaceStatus = 'STALLED';
        }
      }
      statuses.push({
        x: this._furnace.x,
        y: this._furnace.y,
        label: 'Furnace',
        status: furnaceStatus,
      });
    }

    // Drone Depot — RUNNING if any drone is active, IDLE otherwise
    if (this._droneDepot) {
      const hasActiveDrone = this._droneDepot.getAllDrones().length > 0;
      statuses.push({
        x: this._droneDepot.x,
        y: this._droneDepot.y,
        label: 'Drone Depot',
        status: hasActiveDrone ? 'RUNNING' : 'IDLE',
      });
    }

    // Marketplace — always RUNNING when placed
    if (this._marketplace) {
      statuses.push({
        x: this._marketplace.x,
        y: this._marketplace.y,
        label: 'Marketplace',
        status: 'RUNNING',
      });
    }

    return statuses;
  }

  private _showProductionLegend(): void {
    if (this._productionLegend) return;
    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const banner = document.createElement('div');
    banner.id = 'production-overlay-legend';
    banner.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'right:0',
      'height:22px',
      'display:flex',
      'align-items:center',
      'padding:0 10px',
      'gap:12px',
      'font-size:10px',
      'font-family:monospace',
      'background:rgba(5,14,30,0.90)',
      'border-bottom:1px solid #1a3060',
      'color:#D4A843',
      'z-index:100',
      'pointer-events:none',
    ].join(';');
    banner.innerHTML = [
      '<span style="font-weight:bold;">[O] OVERLAY</span>',
      '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#4CAF50;display:inline-block;border:1px solid rgba(0,0,0,0.3);"></span><span style="color:#4CAF50;">RUNNING</span></span>',
      '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#FFC107;display:inline-block;border:1px solid rgba(0,0,0,0.3);"></span><span style="color:#FFC107;">STALLED</span></span>',
      '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#555555;display:inline-block;border:1px solid rgba(0,0,0,0.3);"></span><span style="color:#666666;">IDLE</span></span>',
      '<span style="color:#666;margin-left:auto;">Hover building for details</span>',
      '<span style="background:#1a2a4a;border:1px solid #3a5a8a;padding:1px 5px;color:#D4A843;border-radius:2px;">O</span><span style="color:#666;">toggle off</span>',
    ].join('');
    uiLayer.appendChild(banner);
    this._productionLegend = banner;
  }

  private _hideProductionLegend(): void {
    this._productionLegend?.remove();
    this._productionLegend = null;
  }

  // ── Autonomy win banner (TDD §4.7) ────────────────────────────────────────

  private _showAutonomyWinBanner(): void {
    if (this._autonomyBanner) return; // already visible

    const uiLayer = document.getElementById('ui-layer') ?? document.body;
    const banner = document.createElement('div');
    banner.id = 'autonomy-win-banner';
    banner.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:#07122a',
      'border:2px solid #D4A843',
      'padding:20px 28px',
      'font-family:monospace',
      'color:#E8E4D0',
      'z-index:200',
      'min-width:340px',
      'max-width:420px',
      'box-shadow:0 0 32px rgba(212,168,67,0.25)',
      'pointer-events:all',
    ].join(';');

    banner.innerHTML = [
      '<div style="color:#D4A843;font-size:14px;font-weight:bold;margin-bottom:8px;">',
      '  \u2713 OUTPOST SELF-SUSTAINING!',
      '</div>',
      '<div style="font-size:11px;color:#B8B4A0;margin-bottom:6px;">',
      '  The base ran 120s without you.',
      '</div>',
      '<div style="font-size:11px;color:#B8B4A0;margin-bottom:16px;">',
      '  Next: build a rocket to Phase 2.',
      '</div>',
      '<div style="text-align:right;">',
      '  <button id="autonomy-dismiss-btn" style="',
      '    background:#1a3060;',
      '    color:#D4A843;',
      '    border:1px solid #D4A843;',
      '    font-family:monospace;',
      '    font-size:11px;',
      '    padding:4px 12px;',
      '    cursor:pointer;',
      '  ">[DISMISS]</button>',
      '</div>',
    ].join('');

    uiLayer.appendChild(banner);
    this._autonomyBanner = banner;

    // Wire dismiss button
    const btn = banner.querySelector('#autonomy-dismiss-btn') as HTMLButtonElement | null;
    btn?.addEventListener('click', () => this._hideAutonomyWinBanner());

    // Auto-dismiss after 10 seconds
    const autoTimer = window.setTimeout(() => this._hideAutonomyWinBanner(), 10_000);
    // Store timer id on the element so it can be cancelled early if dismissed
    (banner as any).__autoTimer = autoTimer;
  }

  private _hideAutonomyWinBanner(): void {
    if (!this._autonomyBanner) return;
    const autoTimer = (this._autonomyBanner as any).__autoTimer;
    if (autoTimer !== undefined) {
      window.clearTimeout(autoTimer);
    }
    this._autonomyBanner.remove();
    this._autonomyBanner = null;
  }

  private serializeOutpost(): NonNullable<SaveData['outpost']> {
    return {
      grid: buildGrid.serialize(),
      furnaceRecipe: this._furnace?.recipe ?? 'off',
      stockpile: Object.fromEntries(this._storage?.getStockpile() ?? []),
      droneSlots: this._droneDepot?.getBaySlotData() ?? [],
      playerX: this._player?.x ?? 480,
      playerY: this._player?.y ?? 270,
      roads: roadNetwork.serialize(),
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

    // Restore drone bay slots (re-spawns drones into world without charging credits)
    if (this._droneDepot && data.droneSlots) {
      for (const slotData of data.droneSlots) {
        this._droneDepot.restoreBaySlot(slotData, this._stage!);
      }
    }

    // Restore player position
    if (this._player) {
      this._player.x = data.playerX;
      this._player.y = data.playerY;
      this._player.container.x = data.playerX;
      this._player.container.y = data.playerY;
    }

    // Restore road network
    roadNetwork.deserialize(data.roads ?? []);
  }

  exit(): void {
    // Unregister Phase 1 launch event handler
    if (this._phase1LaunchHandler) {
      EventBus.off('phase1:launch', this._phase1LaunchHandler);
      this._phase1LaunchHandler = null;
    }

    // Clean up launchpad panel
    this._closeLaunchpadPanel();

    // Unmount electrolysis overlay
    this._electrolysisOverlay?.unmount();
    this._electrolysisOverlay = null;
    this._electrolysisUnit = null;
    this._launchpad = null;

    // Hide autonomy win banner if still visible
    this._hideAutonomyWinBanner();

    // Hide production overlay and remove legend banner
    this._hideProductionLegend();
    this._productionOverlay = null;
    this._productionOverlayActive = false;

    // Exit road mode and clean up DOM elements
    if (this._roadMode) {
      this._exitRoadMode();
    }

    // Clear save getter, storage accessor, and debug hooks
    _activeSaveGetter = null;
    _activeStorageGetter = null;
    _forceBuildFn = null;
    _setFurnaceRecipeFn = null;

    // Unregister outpost RTG and destroy furnace to release power consumers.
    powerManager.unregisterGenerator(OUTPOST_REACTOR_POWER);
    this._furnace?.destroy();

    // Remove drones created in this outpost scene from the global fleet
    if (this._droneDepot) {
      for (const drone of this._droneDepot.getAllDrones()) {
        fleetManager.remove(drone.id);
      }
    }

    // Stop dispatcher
    outpostDispatcher.stop();

    // Clear perimeter fence colliders so other scenes don't inherit them
    obstacleManager.clear();

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
    this._furnaceOverlay?.unmount();
    this._marketplaceOverlay?.unmount();
    this._buildMenuOverlay?.unmount();
    this._buildPromptOverlay?.unmount();
    this._droneDepotOverlay?.unmount();
    this._depositPanel?.unmount();
    this._depositPanel = null;

    // Cancel any active ghost (also hides ghost action panel)
    this._cancelGhost();
    this._hideGhostActionPanel();

    // Destroy tap highlight if pending
    if (this._tapHighlight) {
      this._tapHighlight.destroy();
      this._tapHighlight = null;
    }

    // Destroy stage (all children, including _buildingLayer and _roadLayer)
    this._stage?.destroy({ children: true });
    this._stage = null;
    this._buildingLayer = null;
    this._roadLayer = null;
    this._player = null;
    this._deposits = [];
    this._placedBuildings = [];
    this._storage = null;
    this._furnace = null;
    this._marketplace = null;
    this._droneDepot = null;
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

/** Map ore type → user-facing deposit label. */
const _ORE_LABELS: Record<string, string> = {
  iron_ore:   'IRON ORE DEPOSIT',
  copper_ore: 'COPPER ORE DEPOSIT',
  water:      'WATER DEPOSIT',
};

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
