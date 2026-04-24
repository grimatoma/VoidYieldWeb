# VoidYield Web — Codebase Status

> Last audited: 2026-04-24  
> Purpose: ground truth for agents and developers on what is active, what is intentionally deferred, and what has been deleted.  
> When in doubt, check `git log -- <file>` to see when something was removed and why.

---

## Active Scenes

Only two scenes are registered in `src/main.ts` and reachable at runtime:

| Scene | File | Notes |
|---|---|---|
| `boot` | `src/scenes/BootScene.ts` | Splash / loading screen |
| `outpost` | `src/scenes/AsteroidOutpostScene.ts` | Primary gameplay scene |

### Deferred Scenes (exist in src/ but NOT registered — unreachable)

These scenes contain real gameplay code but are not wired into `SceneManager`. They were written for planned multi-planet gameplay. Do **not** delete without team discussion — they represent future milestone work.

| Scene ID | File | Status |
|---|---|---|
| `planet_a1` | `src/scenes/PlanetA1Scene.ts` | Deferred — not registered |
| `planet_a2` | `src/scenes/PlanetA2Scene.ts` | Deferred — not registered |
| `planet_a3` | `src/scenes/PlanetA3Scene.ts` | Deferred — not registered |
| `planet_b` | `src/scenes/PlanetBScene.ts` | Deferred — not registered |
| `planet_c` | `src/scenes/PlanetCScene.ts` | Deferred — not registered |

**Known runtime risk:** `PrestigePanel` emits `scene:travel` → `planet_a1` after prestige; `GalaxyMap` tries to travel to planet nodes. Both will throw "unknown scene" errors until these scenes are registered.

Files that exist solely because of deferred planet scenes (also deferred, not dead):
- `src/data/deposits_a1.ts`
- `src/data/deposits_a2.ts`
- `src/data/deposits_a3.ts`
- `src/data/deposits_b.ts`
- `src/data/deposits_c.ts`
- `src/ui/CoverageOverlay.ts` (only PlanetA1Scene)
- `src/ui/TrafficOverlay.ts` (only PlanetA1Scene)
- `src/ui/StoragePanel.ts` (only PlanetA1Scene)
- `src/services/ZoneManager.ts` (only PlanetA1Scene + FleetManager comment)
- `src/services/MiningCircuitManager.ts` (PlanetA1Scene + DebugAPI)
- `src/services/InteractionManager.ts` (active — used by InteractionPrompt and TouchInteractButton)

---

## Active UI Panels

All mounted in `src/ui/UILayer.ts` and opened by scene interaction handlers.

| File | Opened By | Notes |
|---|---|---|
| `HUD.ts` | UILayer always-on | Credits, RP, planet label |
| `InteractionPrompt.ts` | InteractionManager events | "Press E" floating hint |
| `ShopPanel.ts` | AsteroidOutpostScene (marketplace building), PlanetA1Scene (trade hub) | Unified shop: DRONES / UPGRADES / MARKET / BUILD tabs. **The active marketplace UI.** |
| `DroneBayPanel.ts` | AsteroidOutpostScene, PlanetA1Scene | Drone purchase & fleet |
| `HabitationPanel.ts` | PlanetA1Scene | Colony population |
| `ShipBayPanel.ts` | PlanetA1Scene, AsteroidOutpostScene | Launchpad / rocket |
| `TechTreePanel.ts` | UILayer (T key) | Research tree |
| `FleetPanel.ts` | UILayer (F key) | Drone fleet status |
| `FabricatorPanel.ts` | AsteroidOutpostScene | Fabricator building |
| `ProductionDashboard.ts` | UILayer | Factory output overview |
| `LogisticsOverlay.ts` | UILayer | Trade route editor |
| `GalaxyMap.ts` | UILayer (M key) | Planet navigation |
| `SurveyOverlay.ts` | AsteroidOutpostScene | Deposit survey result |
| `SurveyJournalPanel.ts` | UILayer | Survey history |
| `PopulationHUD.ts` | UILayer | Colony tier display |
| `SectorCompleteOverlay.ts` | EventBus `sector:complete` | End-of-sector summary |
| `PrestigePanel.ts` | SectorCompleteOverlay | Prestige / sector restart |
| `OfflineDispatchPanel.ts` | UILayer | Offline progress summary |
| `TouchMenuOverlay.ts` | Mobile touch | Radial action menu |
| `TouchInteractButton.ts` | Mobile touch | "E" button for touch |
| `DebugOverlay.ts` | DEV only | FPS / debug info |
| `BuildMenuOverlay.ts` | AsteroidOutpostScene | Build placement menu |
| `BuildPromptOverlay.ts` | AsteroidOutpostScene | Build confirmation |
| `DroneDepotOverlay.ts` | AsteroidOutpostScene | Drone depot interaction |
| `FurnaceOverlay.ts` | AsteroidOutpostScene | Furnace smelting |
| `ElectrolysisOverlay.ts` | AsteroidOutpostScene | Electrolysis unit |
| `DepositPanel.ts` | AsteroidOutpostScene | Deposit interaction |
| `ProductionOverlay.ts` | AsteroidOutpostScene | Building status summary |

---

## Active Entities

| File | Used By |
|---|---|
| `Player.ts` | AsteroidOutpostScene, all planet scenes |
| `Deposit.ts` | All scenes |
| `StorageDepot.ts` | All scenes |
| `Furnace.ts` | AsteroidOutpostScene |
| `Marketplace.ts` | AsteroidOutpostScene |
| `TradeHub.ts` | PlanetA1Scene (deferred) |
| `DroneBase.ts` | Base class for all drones |
| `DroneBay.ts` | AsteroidOutpostScene, PlanetA1Scene |
| `DroneDepot.ts` | AsteroidOutpostScene |
| `ScoutDrone.ts` | AsteroidOutpostScene |
| `HeavyDrone.ts` | AsteroidOutpostScene |
| `CargoDrone.ts` | LogisticsManager |
| `RepairDrone.ts` | AsteroidOutpostScene |
| `BuilderDrone.ts` | AsteroidOutpostScene |
| `SurveyDrone.ts` | AsteroidOutpostScene |
| `RefineryDrone.ts` | AsteroidOutpostScene |
| `GasCollector.ts` | HarvesterManager |
| `HarvesterBase.ts` | Base class for GasCollector etc |
| `Fabricator.ts` | AsteroidOutpostScene |
| `ResearchLab.ts` | AsteroidOutpostScene |
| `HabitationModule.ts` | PlanetA1Scene |
| `SolarPanel.ts` | AsteroidOutpostScene |
| `Launchpad.ts` | AsteroidOutpostScene, PlanetA1Scene |
| `WarpGate.ts` | PlanetA1Scene |
| `GalacticHub.ts` | PlanetA1Scene |
| `ElectrolysisUnit.ts` | AsteroidOutpostScene |
| `WaterCondenser.ts` | AsteroidOutpostScene |
| `IndustrialSite.ts` | AsteroidOutpostScene |
| `PlacedBuilding.ts` | AsteroidOutpostScene (BuildGrid base) |
| `ProcessingPlant.ts` | AsteroidOutpostScene |

---

## Active Services

| File | Notes |
|---|---|
| `GameState.ts` | Credits, RP, unlocks, planet state |
| `SaveManager.ts` | localStorage save/load |
| `SettingsManager.ts` | Audio/display config |
| `EventBus.ts` | Typed event bus |
| `InputManager.ts` | 20 key bindings |
| `Camera.ts` | Viewport pan/zoom |
| `AssetManager.ts` | Texture/spritesheet loading |
| `BuildGrid.ts` | Grid placement system |
| `DepositMap.ts` | Per-planet deposit registry |
| `MiningService.ts` | Deposit interaction, ore extraction |
| `HarvesterManager.ts` | GasCollector update loop |
| `FleetManager.ts` | Drone dispatch, circuit loops |
| `ConsumptionManager.ts` | Colony tier populations |
| `Inventory.ts` | Player carried cargo (10 unit cap) |
| `LogisticsManager.ts` | Trade routes, auto-dispatch |
| `MarketplaceService.ts` | Buy/sell pricing and transactions |
| `PowerManager.ts` | Power balance |
| `TechTree.ts` | Research node registry |
| `SectorManager.ts` | Prestige bonuses, sector completion |
| `SurveyService.ts` | Deposit survey logic |
| `TutorialManager.ts` | Tutorial state (active in DebugAPI; no scene uses it yet) |
| `OutpostDispatcher.ts` | Drone auto-dispatch for outpost |
| `StrandingManager.ts` | Planet B fuel state |
| `OfflineSimulator.ts` | Offline progress calculation |
| `ObstacleManager.ts` | Pathfinding obstacle registry |
| `RoadNetwork.ts` | Road tile graph |
| `TapToMove.ts` | Touch/click movement handler |
| `InteractionManager.ts` | Proximity interaction targets |
| `SpriteSheetHelper.ts` | Sprite sheet slice utilities |
| `DroneSpriteSheet.ts` | Drone animation state |
| `PlayerSpriteSheet.ts` | Player animation state |
| `ZoneManager.ts` | Drone zone assignment (used by PlanetA1Scene, deferred) |
| `MiningCircuitManager.ts` | Auto-mining loop (used by PlanetA1Scene + DebugAPI) |

---

## Active Data Files

| File | Notes |
|---|---|
| `src/data/types.ts` | All type definitions (OreType, QualityLot, etc.) |
| `src/data/tech_tree_nodes.ts` | Tech node definitions |
| `src/data/schematics.ts` | Fabricator recipe list |
| `src/data/outpost_deposits.ts` | Deposit layout for AsteroidOutpostScene |

---

## Deleted Files (by audit 2026-04-24)

These were confirmed to have no active imports. Recover from git history if needed: `git show HEAD~:<path>`.

### UI
| File | Reason |
|---|---|
| `src/ui/MarketplaceOverlay.ts` | Legacy overlay (iron_bar/copper_bar only). Replaced by `ShopPanel` MARKET tab. |
| `src/ui/HarvesterHUD.ts` | PixiJS harvester status bar. Never instantiated. |
| `src/ui/HudOverlay.ts` | Old PixiJS credits/RP display. Replaced by `HUD.ts`. |
| `src/ui/InventoryPanel.ts` | Inventory `[I]` panel. Created but never mounted or triggered. |
| `src/ui/TutorialOverlay.ts` | Tutorial modal. Never instantiated in any scene. |

### Entities
| File | Reason |
|---|---|
| `src/entities/AethonFlora.ts` | Decorative entity. No imports anywhere. |
| `src/entities/AssemblyComplex.ts` | Building entity. No imports anywhere. |
| `src/entities/CrystalHarvester.ts` | Harvester variant. No imports anywhere. |
| `src/entities/MineralHarvester.ts` | Harvester variant. No imports anywhere. |
| `src/entities/Speeder.ts` | Vehicle entity. No imports anywhere. |

### Services
| File | Reason |
|---|---|
| `src/services/DroneTaskQueue.ts` | Abandoned task queue service. No imports anywhere. |

---

## Outdated Docs

All spec files in `docs/specs/` were written targeting a Godot implementation. The project is now TypeScript + PixiJS. The specs remain useful as **design intent documents** but implementation sections referencing `.gd` files, Godot nodes, `autoloads/`, and `theme.tres` are obsolete.

Files with significant Godot references:
`01_resource_quality.md`, `02_surveying.md`, `03_harvesters.md`, `04_drone_swarm.md`, `05_factories.md`, `06_consumption.md`, `07_logistics.md`, `08_vehicles.md`, `09_planets.md`, `10_spacecraft.md`, `11_tech_tree.md`, `13_art_direction.md`, `14_ui_systems.md`, `15_save_load.md`, `16_input_map.md`, `26_web_visual_parity.md`

`docs/specs/26_web_visual_parity.md` also references `LEGACY_old_godot_version/VoidYield` — that directory no longer exists.

The specs are **not being deleted** — the game design intent is still valid. A future pass should strip Godot implementation sections and replace them with TypeScript/PixiJS equivalents.

---

## Marketplace Architecture (as of 2026-04-24)

`ShopPanel` (MARKET tab) is the **only** active marketplace UI.
- Opened when player interacts with the `marketplace` building in `AsteroidOutpostScene`
- All 34 `OreType` values are listed
- `FREE_BUY_MODE = true` in `MarketplaceService.ts` — flip to `false` to re-enable credit costs
- `MarketplaceOverlay` (iron_bar/copper_bar legacy) was **deleted**
