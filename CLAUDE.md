# VoidYield Web — Claude Guidelines

## Model selection

Use the cheapest model that can do the job:

- **Haiku** — mechanical tasks with a clear spec: writing TS per spec, adding save fields, wiring inputs, boilerplate, config. Output is fully determined by the spec.
- **Sonnet** — tasks needing judgment: fitting new systems into existing architecture, non-obvious debugging, multi-file integration.
- **Opus** — deep design work only: cross-spec audits, resolving contradictions, major architectural decisions.

## Project overview

TypeScript + PixiJS v8 + Vite + Vitest + Playwright web game.
Base resolution: 960×540. Pixel-art renderer (no antialiasing).
All milestones M0–M14 are **complete**. The game is a pure TypeScript/PixiJS project — there is no Godot dependency.

Design docs live in `docs/` — read `docs/GAME_DESIGN.md` first, then the relevant spec in `docs/specs/` before touching any system.

## Stack conventions

- **Entry point:** `src/main.ts` — boots PixiJS Application, mounts InputManager, creates SceneManager, mounts `window.__voidyield__` debug API in DEV mode
- **Services:** `src/services/` — EventBus-based singletons (e.g. `GameState`, `TechTree`, `LogisticsManager`, `SectorManager`)
- **Scenes:** `src/scenes/` — each scene implements `Scene` interface (`enter`, `update`, `exit`); registered in `SceneManager`
- **Entities:** `src/entities/` — game objects (`Player`, `StorageDepot`, `WarpGate`, `GalacticHub`, …)
- **Data:** `src/data/` — TypeScript const arrays for deposits, tech nodes, etc.
- **UI:** `src/ui/` — PixiJS Container overlays (`HudOverlay`, `GalaxyMap`, `SectorCompleteOverlay`, …)
- **Debug:** `src/debug/VoidYieldDebugAPI.ts` — `window.__voidyield__` API mounted in DEV only
- **Path aliases:** `@services/`, `@scenes/`, `@entities/`, `@data/`, `@ui/` — configured in `tsconfig.json` and `vite.config.ts`

## Service singletons

| Service | File | Purpose |
|---|---|---|
| `gameState` | `src/services/GameState.ts` | Credits, RP, sector, planet visits, tech unlocks |
| `saveManager` | `src/services/SaveManager.ts` | localStorage save/load, offline detection |
| `settingsManager` | `src/services/SettingsManager.ts` | localStorage config (audio, display) |
| `techTree` | `src/services/TechTree.ts` | Tech node registry, unlock gating, RP costs |
| `consumptionManager` | `src/services/ConsumptionManager.ts` | Colony tier populations, productivity multiplier |
| `miningService` | `src/services/MiningService.ts` | Deposit interaction, ore extraction |
| `fleetManager` | `src/services/FleetManager.ts` | Drone fleet dispatch, circuit loops |
| `logisticsManager` | `src/services/LogisticsManager.ts` | Trade routes, auto-dispatch, depot registry |
| `harvesterManager` | `src/services/HarvesterManager.ts` | GasCollector/Harvester update loop |
| `strandingManager` | `src/services/StrandingManager.ts` | Planet B fuel state |
| `sectorManager` | `src/services/SectorManager.ts` | Prestige bonuses, sector complete conditions |
| `EventBus` | `src/services/EventBus.ts` | Typed event bus replacing Godot signals |
| `inputManager` | `src/services/InputManager.ts` | All 20 key bindings per spec 16 |
| `depositMap` | `src/services/DepositMap.ts` | Per-planet deposit loading and lookup |
| `powerManager` | `src/services/PowerManager.ts` | Power balance across buildings |

## Key conventions

- **Save data:** `localStorage` key `voidyield_savegame` via `SaveManager` — format mirrors spec 15
- **Settings:** `localStorage` key `voidyield_settings` via `SettingsManager`
- **Input:** all 20 bindings in `InputManager` per spec 16 — never add new keys without checking for 