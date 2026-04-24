# VoidYield Web — Codebase Status

> Last audited: 2026-04-24
> Purpose: ground truth for agents and developers on what is active and what has been deleted.
> When in doubt, check `git log -- <file>` to recover deleted files.

---

## Active Scenes

Only two scenes are registered in `src/main.ts` and reachable at runtime:

| Scene | File | Notes |
|---|---|---|
| `boot` | `src/scenes/BootScene.ts` | Splash / loading screen |
| `outpost` | `src/scenes/AsteroidOutpostScene.ts` | Primary gameplay scene |

All five planet scenes (`PlanetA1Scene`, `PlanetA2Scene`, `PlanetA3Scene`, `PlanetBScene`, `PlanetCScene`) were **deleted 2026-04-24**. Recover from git if needed: `git log --all -- src/scenes/PlanetA1Scene.ts`

After prestige, `PrestigePanel` now travels to `'outpost'`. `GalaxyMap` shows an empty map (no planet nodes are fed to it from `AsteroidOutpostScene`).

---

## Active UI Panels

All mounted in `src/ui/UILayer.ts` and opened by scene interaction handlers.

| File | Opened By | Notes |
|---|---|---|
| `HUD.ts` | UILayer always-on | Credits, RP, planet label |
| `InteractionPrompt.ts` | InteractionManager events | "Press E" floating hint |
| `ShopPanel.ts` | AsteroidOutpostScene (marketplace building) | Unified shop: DRONES / UPGRADES / MARKET / BUILD tabs. **The active marketplace UI.** |
| `DroneBayPanel.ts` | AsteroidOutpostScene | Drone purchase & fleet |
| `ShipBayPanel.ts` | AsteroidOutpostScene | Launchpad / rocket |
| `TechTreePanel.ts` | UILayer (T key) | Research tree |
| `FleetPanel.ts` | UILayer (F key) | Drone fleet status |
| `FabricatorPanel.ts` | AsteroidOutpostScene | Fabricator building |
| `ProductionDashboard.ts` | UILayer | Factory output overview |
| `LogisticsOverlay.ts` | UILayer | Trade route editor |
| `GalaxyMap.ts` | UILayer (G key) | Planet navigation — shows empty map until planet scenes are rebuilt |
| `SurveyOverlay.ts` | AsteroidOutpostScene | Deposit survey result |
| `SurveyJournalPanel.ts` | UILayer | Survey history |
| `PopulationHUD.ts` | UILayer | Colony tier display |
| `SectorCompleteOverlay.ts` | EventBus `sector:complete` | End-of-sector summary |
| `PrestigePanel.ts` | SectorCompleteOverlay | Prestige / sector restart; travels to `'outpost'` |
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

Panels that were deleted but only used by planet scenes:
- `HabitationPanel.ts` — **still exists** in UILayer but only PlanetA1Scene opened it. Low priority to remove.

---

## Active Entities

| File | Used By |
|---|---|
| `Player.ts` | AsteroidOutpostScene |
| `Deposit.ts` | AsteroidOutpostScene |
| `StorageDepot.ts` | AsteroidOutpostScene |
| `Furnace.ts` | AsteroidOutpostScene |
| `Marketplace.ts` | AsteroidOutpostScene |
| `TradeHub.ts` | DebugAPI / future use |
| `DroneBase.ts` | Base class for all drones |
| `DroneBay.ts` | AsteroidOutpostScene |
| `DroneDepot.ts` | AsteroidOutpostScene |
| `ScoutDrone.ts` | AsteroidOutpostScene |
| `HeavyDrone.ts` | AsteroidOutpostScene |
| `CargoDrone.ts` | LogisticsManager |
| `RepairDrone.ts` | AsteroidOutpostScene |
| `BuilderDrone.ts` | AsteroidOutpostScene |
| `SurveyDrone.ts` | AsteroidOutpostScene |
| `RefineryDrone.ts` | AsteroidOutpostScene |
| `GasCollector.ts` | HarvesterManager |
| `HarvesterBase.ts` | Base class for GasCollector |
| `Fabricator.ts` | AsteroidOutpostScene |
| `ResearchLab.ts` | AsteroidOutpostScene |
| `HabitationModule.ts` | No active scene (planet scenes deleted) |
| `SolarPanel.ts` | AsteroidOutpostScene |
| `Launchpad.ts` | AsteroidOutpostScene |
| `WarpGate.ts` | No active scene (planet scenes deleted) |
| `GalacticHub.ts` | No active scene (planet scenes deleted) |
| `ElectrolysisUnit.ts` | AsteroidOutpostScene |
| `WaterCondenser.ts` | AsteroidOutpostScene |
| `IndustrialSite.ts` | AsteroidOutpostScene |
| `PlacedBuilding.ts` | AsteroidOutpostScene (BuildGrid base) |
| `ProcessingPlant.ts` | AsteroidOutpostScene |

Note: `HabitationModule`, `WarpGate`, `GalacticHub` have no active scene using them now. They are kept because they may be needed when planet scenes are rebuilt.

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
| `TutorialManager.ts` | Tutorial state — imported by DebugAPI only; no scene uses it |
| `OutpostDispatcher.ts` | Drone auto-dispatch for outpost |
| `StrandingManager.ts` | Planet B fuel state — kept for save compatibility |
| `OfflineSimulator.ts` | Offline progress calculation |
| `ObstacleManager.ts` | Pathfinding obstacle registry |
| `RoadNetwork.ts` | Road tile graph |
| `TapToMove.ts` | Touch/click movement handler |
| `InteractionManager.ts` | Proximity interaction targets |
| `SpriteSheetHelper.ts` | Sprite sheet slice utilities |
| `DroneSpriteSheet.ts` | Drone animation state |
| `PlayerSpriteSheet.ts` | Player animation state |

---

## Active Data Files

| File | Notes |
|---|---|
| `src/data/types.ts` | All type definitions (OreType, QualityLot, etc.) |
| `src/data/tech_tree_nodes.ts` | Tech node definitions |
| `src/data/schematics.ts` | Fabricator recipe list |
| `src/data/outpost_deposits.ts` | Deposit layout for AsteroidOutpostScene |

---

## Marketplace Architecture (as of 2026-04-24)

`ShopPanel` (MARKET tab) is the **only** active marketplace UI.
- Opened when player interacts with the `marketplace` building in `AsteroidOutpostScene`
- All 34 `OreType` values listed with buy/sell buttons and live depot count
- `FREE_BUY_MODE = true` in `MarketplaceService.ts` — flip to `false` to re-enable credit costs

---

## Deletion Log

All deleted files can be recovered via git: `git log --all -- <path>` then `git show <commit>:<path>`

### 2026-04-24 — Audit cleanup (PR #85 + planet scene removal)

**UI (6 files):**
| File | Reason |
|---|---|
| `src/ui/MarketplaceOverlay.ts` | Legacy iron_bar/copper_bar overlay. Replaced by ShopPanel MARKET tab. |
| `src/ui/HarvesterHUD.ts` | Never instantiated in any scene. |
| `src/ui/HudOverlay.ts` | Replaced by `HUD.ts`. |
| `src/ui/InventoryPanel.ts` | Created but never mounted or triggered. |
| `src/ui/TutorialOverlay.ts` | Never instantiated in any scene. |
| `src/ui/StoragePanel.ts` | Only used by deleted planet scenes. |
| `src/ui/CoverageOverlay.ts` | Only used by PlanetA1Scene (deleted). |
| `src/ui/TrafficOverlay.ts` | Only used by PlanetA1Scene (deleted). |

**Scenes (5 files):**
| File | Reason |
|---|---|
| `src/scenes/PlanetA1Scene.ts` | Not registered in SceneManager. Deleted to reduce confusion. |
| `src/scenes/PlanetA2Scene.ts` | Not registered in SceneManager. |
| `src/scenes/PlanetA3Scene.ts` | Not registered in SceneManager. |
| `src/scenes/PlanetBScene.ts` | Not registered in SceneManager. |
| `src/scenes/PlanetCScene.ts` | Not registered in SceneManager. |

**Data (5 files):**
| File | Reason |
|---|---|
| `src/data/deposits_a1.ts` | Only used by PlanetA1Scene (deleted). |
| `src/data/deposits_a2.ts` | Only used by PlanetA2Scene (deleted). |
| `src/data/deposits_a3.ts` | Only used by PlanetA3Scene (deleted). |
| `src/data/deposits_b.ts` | Only used by PlanetBScene (deleted). |
| `src/data/deposits_c.ts` | Only used by PlanetCScene (deleted). |

**Entities (5 files):**
| File | Reason |
|---|---|
| `src/entities/AethonFlora.ts` | No imports anywhere. |
| `src/entities/AssemblyComplex.ts` | No imports anywhere. |
| `src/entities/CrystalHarvester.ts` | No imports anywhere. |
| `src/entities/MineralHarvester.ts` | No imports anywhere. |
| `src/entities/Speeder.ts` | No imports anywhere. |

**Services (3 files):**
| File | Reason |
|---|---|
| `src/services/DroneTaskQueue.ts` | Abandoned. No imports anywhere. |
| `src/services/ZoneManager.ts` | Only used by PlanetA1Scene (deleted). |
| `src/services/MiningCircuitManager.ts` | Only used by PlanetA1Scene and DebugAPI (removed from DebugAPI). |

---

## Outdated Docs

All spec files in `docs/specs/` were written targeting a Godot implementation. The project is now TypeScript + PixiJS. The specs remain useful as **design intent documents** but implementation sections referencing `.gd` files, Godot nodes, `autoloads/`, and `theme.tres` are obsolete.

Files with significant Godot references:
`01_resource_quality.md`, `02_surveying.md`, `03_harvesters.md`, `04_drone_swarm.md`, `05_factories.md`, `06_consumption.md`, `07_logistics.md`, `08_vehicles.md`, `09_planets.md`, `10_spacecraft.md`, `11_tech_tree.md`, `13_art_direction.md`, `14_ui_systems.md`, `15_save_load.md`, `16_input_map.md`, `26_web_visual_parity.md`

`docs/specs/26_web_visual_parity.md` also references `LEGACY_old_godot_version/VoidYield` — that directory no longer exists.

The specs are **not being deleted** — the game design intent is still valid. A future pass should strip Godot implementation sections and replace them with TypeScript/PixiJS equivalents.
