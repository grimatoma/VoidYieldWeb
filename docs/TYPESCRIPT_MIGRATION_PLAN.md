# VoidYield — TypeScript/Web Migration Plan

**Date:** 2026-04-20  
**Source:** grimatoma/VoidYield (Godot 4.6.2, GDScript)  
**Target:** grimatoma/VoidYieldWeb (TypeScript, PixiJS v8)

---

## Stack Decision

| Concern | Choice | Rationale |
|---|---|---|
| Renderer | PixiJS v8 | 2D sprite renderer, WebGL/WebGPU, excellent perf for pixel-art |
| Language | TypeScript 5.7 | Type safety, scales to 150+ files |
| Bundler | Vite 6 | Fast HMR, ESM-native, trivial PixiJS integration |
| Unit tests | Vitest 2 | Same config as Vite, jsdom environment |
| E2E tests | Playwright | Full browser automation, headless CI-ready |
| Signals | EventEmitter3 | Mirrors Godot's signal pattern; typed `EventBus` |
| Save/Load | localStorage JSON | Matches existing spec 15 schema; IndexedDB upgrade if >500 KB |

---

## Migration Strategy

### Migrate as-is (no logic changes)
- `docs/` — all 18 specs, GDD, roadmap, PRD, alignment/critic reviews
- `design_mocks/` — 28 SVG wireframes
- `assets/sprites/` — 36 PNG sprites (36 files across subdirs)
- `assets/fonts/` — VoidYieldTerminal.ttf
- `data/*.json` — drones, upgrades, ship_parts, rocket_components

### Rewrite (GDScript → TypeScript)
- All 149 `.gd` scripts → TS services/entities in `src/`
- All 29 `.tscn` scenes → TS scene factory functions in `src/scenes/`
- Custom test framework → Vitest + Playwright
- Godot InputMap → `InputManager` service (all 20 bindings from spec 16)
- `user://savegame.json` → `localStorage['voidyield_savegame']`
- `user://settings.cfg` → `localStorage['voidyield_settings']`

### Drop (Godot-specific, no web equivalent)
- `addons/` — Godot editor plugins
- `.import` files — Godot asset metadata
- `.uid` files — Godot resource identifiers
- `export_presets.cfg` — Godot export config
- `project.godot` — replaced by `package.json` + `vite.config.ts`

---

## Autoload → Service Mapping

Each Godot autoload becomes a TypeScript service singleton. Services communicate via `EventBus` (EventEmitter3) instead of Godot signals.

| Godot Autoload | TS Service | Notes |
|---|---|---|
| `game_state.gd` | `GameState` | Credits, RP, planet, phase flags, pause state |
| `save_manager.gd` | `SaveManager` | localStorage JSON, autosave every 5 min |
| `settings_manager.gd` | `SettingsManager` | Audio volumes, fullscreen, controls |
| `audio_manager.gd` | `AudioManager` | Web Audio API synthesis, 3 buses (Music/SFX/UI) |
| `colony_manager.gd` | `ColonyManager` | Population tiers, housing capacity |
| `consumption_manager.gd` | `ConsumptionManager` | Pioneer needs, productivity multiplier |
| `tech_tree.gd` | `TechTree` | 50+ nodes, RP costs, unlock effects |
| `producer_data.gd` | `ProducerData` | Building rate tables loaded from JSON |
| `event_log.gd` | `EventLog` | Offline simulation events |
| `fleet_manager.gd` | `FleetManager` | Drone registry |
| `zone_manager.gd` | `ZoneManager` | Drone zone assignments |
| `logistics_manager.gd` | `LogisticsManager` | Trade routes, ship fleet |
| `deposit_map.gd` | `DepositMap` | Per-planet deposit registry |

---

## Scene → TS Scene Factory Mapping

| Godot scene (`.tscn`) | TS Scene / Factory |
|---|---|
| `main.tscn` | `BootScene` + `MainScene` |
| `planet_a1.tscn` | `PlanetA1Scene` |
| `planet_b.tscn` | `PlanetBScene` |
| `planet_a2.tscn` | `PlanetA2Scene` |
| `planet_a3.tscn` | `PlanetA3Scene` |
| `planet_c.tscn` | `PlanetCScene` |
| HUD CanvasLayer | `HudOverlay` (PixiJS Container on top stage layer) |
| Tech tree panel | `TechTreePanel` UI component |
| Survey journal | `SurveyJournalPanel` UI component |
| Galaxy map | `GalaxyMapPanel` UI component |
| Production dashboard | `ProductionDashboardPanel` UI component |

---

## Milestone Map (Web)

Milestones track directly from `docs/IMPLEMENTATION_ROADMAP.md`. Each milestone targets identical gameplay outcomes; only the implementation layer changes.

| Milestone | Web deliverables | Godot equivalent |
|---|---|---|
| **M0** | PixiJS boot, SceneManager, InputManager (20 bindings), GameState, save/load localStorage round-trip, boot e2e test | `main.tscn`, `save_manager.gd`, `settings_manager.gd`, InputMap |
| **M1** | PlanetA1Scene, player entity (WASD), Camera follow + zoom, world bounds, minimap stub | `planet_a1.tscn`, `player.gd`, `camera_controller.gd` |
| **M2** | DepositMap, manual mining, inventory, StorageDepot, sell mechanic, HUD credits | `deposit.gd`, `inventory.gd`, `storage_depot.gd` |
| **M3** | HarvesterBase, MineralHarvester, GasCollector, building placement, hopper/fuel UI | `harvester_base.gd`, `mineral_harvester.gd` |
| **M4** | DroneBase, ScoutDrone, DroneTaskQueue, DroneBay, traffic overlay | `drone_base.gd`, `scout_drone.gd` |
| **M5** | ProcessingPlant (Ore Smelter), PowerManager, production dashboard | `processing_plant.gd`, `power_manager.gd` |
| **M6** | TechTree (50+ nodes), ResearchLab, RP income, tech panel UI | `tech_tree.gd`, `research_lab.gd` |
| **M7** | ConsumptionManager, HabitationModule, productivity multiplier | `consumption_manager.gd` |
| **M8** | RefineryDrone, ZoneManager automation, circuit scheduling, Rover vehicle | `refinery_drone.gd`, `zone_manager.gd` |
| **M9** | Quality attributes (11 attrs), Fabricator, Production overlay, auto-sell | `fabricator.gd`, `quality_lot.gd` full |
| **M10** | Launchpad, RocketComponent, PlanetBScene, StrandingManager, GalaxyMap | `launchpad.gd`, `planet_b.tscn` |
| **M11** | PlanetA2Scene, CargoBay, TradeRoute, LogisticsManager, GalaxyMap v2 | `cargo_ship.gd`, `trade_route.gd` |
| **M12** | Full tech tree UI, Survey Tool Tier II/III, Speeder, colony tier 2+ | Full `tech_tree_panel`, `speeder.gd` |
| **M13** | All 4 ship types, auto-dispatch, DroneFreightLanes, JumpRelay, PlanetCScene | `logistics_manager.gd`, `planet_c.tscn` |
| **M14** | WarpGate, GalacticHub, SectorManager, prestige reset, offline simulation | `sector_manager.gd`, `offline_event_log.gd` |

---

## Key Differences from Godot Implementation

| Concern | Godot | Web |
|---|---|---|
| Render loop | `_process(delta)` on nodes | `app.ticker` → `SceneManager.update(delta)` |
| Signals | `signal foo` / `emit_signal` | `EventBus.emit('foo', ...)` |
| Node tree | scene tree autoloads | Singleton service instances |
| Save path | `user://savegame.json` | `localStorage['voidyield_savegame']` |
| Navigation (drones) | `NavigationAgent2D` + NavMesh | Simple steering/pathfinding (A* or steering vectors) |
| Fullscreen | `DisplayServer.window_set_mode()` | `document.requestFullscreen()` |
| Input | Godot InputMap actions | `InputManager` keyboard events |
| Audio | `AudioStreamPlayer` + buses | Web Audio API (`AudioContext`) |
| Particle effects | `CPUParticles2D` | PixiJS particle emitter or custom container |
| Camera | `Camera2D` with built-in follow | Manual PixiJS `Container` translate |

---

## Completed (this session — M0 scaffold)

- [x] `package.json` — PixiJS v8, Vite 6, Vitest 2, Playwright, TypeScript 5.7
- [x] `tsconfig.json` — strict, path aliases
- [x] `vite.config.ts` — path aliases, esnext target
- [x] `vitest.config.ts` — jsdom environment
- [x] `playwright.config.ts` — chromium, dev server integration
- [x] `src/main.ts` — PixiJS Application bootstrap, SceneManager, InputManager mount
- [x] `src/services/EventBus.ts` — typed EventEmitter3 bus
- [x] `src/services/InputManager.ts` — all 20 bindings from spec 16
- [x] `src/services/GameState.ts` — credits, RP, planet, phase flags, serialize/restore
- [x] `src/services/SaveManager.ts` — localStorage save/load, autosave, format version check
- [x] `src/scenes/SceneManager.ts` — scene registry + switch
- [x] `src/scenes/BootScene.ts` — navy background, save restore, autosave start
- [x] `tests/unit/SaveManager.test.ts`
- [x] `tests/unit/InputManager.test.ts`
- [x] `tests/unit/GameState.test.ts`
- [x] `tests/e2e/boot.spec.ts` — canvas visible, save round-trip, no console errors
- [x] `docs/` — 18 specs + 6 top-level docs copied from Godot repo
- [x] `design_mocks/` — 28 SVG wireframes copied
- [x] `assets/sprites/` — 36 PNG sprites copied
- [x] `assets/fonts/` — VoidYieldTerminal.ttf copied
- [x] `data/` — drones.json, upgrades.json, ship_parts.json, rocket_components.json

## Next session: M1 — Walking Simulator

See `docs/IMPLEMENTATION_ROADMAP.md` M1 for the full spec. Target files:
- `src/entities/Player.ts` — CharacterBody2D equivalent, WASD movement
- `src/scenes/PlanetA1Scene.ts` — 2800×2000 world, 6 IndustrialSite stubs
- `src/entities/IndustrialSite.ts` — slot data class
- `src/services/Camera.ts` — follow player, clamp bounds, scroll zoom
- `src/ui/MinimapOverlay.ts` — minimap stub
