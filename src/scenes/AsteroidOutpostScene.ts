import { Application, Container, Graphics } from 'pixi.js';
import type { Scene } from './SceneManager';
import { Player } from '@entities/Player';
import { Deposit } from '@entities/Deposit';
import { StorageDepot } from '@entities/StorageDepot';
import { PlacedBuilding, CELL_SIZE, GRID_ORIGIN, gridToWorld } from '@entities/PlacedBuilding';
import { buildGrid } from '@services/BuildGrid';
import { depositMap } from '@services/DepositMap';
import { miningService } from '@services/MiningService';
import { inputManager } from '@services/InputManager';
import { gameState } from '@services/GameState';
import { OUTPOST_DEPOSITS } from '@data/outpost_deposits';
import { OutpostHud } from '@ui/OutpostHud';

export class AsteroidOutpostScene implements Scene {
  readonly id = 'outpost';
  private _stage: Container | null = null;
  private _player: Player | null = null;
  private _deposits: Deposit[] = [];
  private _storage: StorageDepot | null = null;
  private _placedBuildings: PlacedBuilding[] = [];
  private _hud: OutpostHud | null = null;
  private _app: Application | null = null;

  async enter(app: Application): Promise<void> {
    this._app = app;
    this._stage = new Container();
    app.stage.addChild(this._stage);

    // Dark asteroid background
    const bg = new Graphics();
    bg.rect(0, 0, app.screen.width, app.screen.height).fill(0x1A1A2E);
    this._stage.addChild(bg);

    // Draw grid overlay (faint lines)
    this._drawGrid();

    // Place Storage at [2,0] and Furnace at [2,1] pre-built
    this._initGrid();

    // Spawn deposits
    this._initDeposits();

    // Player starts in the center-right of the scene, away from the grid
    this._player = new Player(600, 300);
    this._stage.addChild(this._player.container);

    // Wire mining service to storage
    miningService.setDepot(this._storage!);

    // HUD
    this._hud = new OutpostHud();
    this._hud.mount(app);

    gameState.setCurrentPlanet('outpost');
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
    // Pre-place Storage (1×1) at [2,0] and Furnace (1×1) at [2,1]
    const storagePos = gridToWorld(2, 0);
    this._storage = new StorageDepot(storagePos.x, storagePos.y);

    buildGrid.deserialize([]); // reset
    buildGrid.place({ buildingId: 'storage_0', buildingType: 'storage', row: 2, col: 0, footprint: { rows: 1, cols: 1 } });
    buildGrid.place({ buildingId: 'furnace_0', buildingType: 'furnace', row: 2, col: 1, footprint: { rows: 1, cols: 1 } });

    const storagePlaced = new PlacedBuilding('storage_0', 'storage', 2, 0, { rows: 1, cols: 1 });
    const furnacePlaced = new PlacedBuilding('furnace_0', 'furnace', 2, 1, { rows: 1, cols: 1 });
    this._placedBuildings.push(storagePlaced, furnacePlaced);
    this._stage!.addChild(storagePlaced.container);
    this._stage!.addChild(furnacePlaced.container);
    this._stage!.addChild(this._storage.container);
  }

  private _initDeposits(): void {
    // DepositMap.loadPlanet clears existing deposits and adds them to a container.
    // We pass a temporary container and then re-add the deposit containers manually
    // to our stage so we control draw order.
    const tempContainer = new Container();
    depositMap.loadPlanet(OUTPOST_DEPOSITS, tempContainer);

    // Re-parent deposit containers to our stage
    this._deposits = [...depositMap.getAll()] as Deposit[];
    for (const deposit of this._deposits) {
      tempContainer.removeChild(deposit.container);
      this._stage!.addChild(deposit.container);
    }
    // tempContainer is now empty and can be discarded
  }

  update(delta: number): void {
    if (!this._player || !this._app) return;
    this._player.update(delta, inputManager, { width: this._app.screen.width, height: this._app.screen.height });
    miningService.update(delta, { x: this._player.x, y: this._player.y });

    // E key: interact
    if (inputManager.wasJustPressed('interact')) {
      miningService.onInteract(this._player.x, this._player.y);
    }
    if (!inputManager.isHeld('interact')) {
      miningService.onInteractReleased();
    }

    this._hud?.update();
  }

  exit(): void {
    // Clear deposits from the map by re-loading with empty array into a throwaway container
    depositMap.loadPlanet([], new Container());
    miningService.setDepot(null as unknown as import('@entities/StorageDepot').StorageDepot);
    this._hud?.unmount();
    this._stage?.destroy({ children: true });
    this._stage = null;
    this._player = null;
    this._deposits = [];
    this._placedBuildings = [];
    this._storage = null;
    this._hud = null;
    this._app = null;
  }
}
