# VoidYield Web — Claude Guidelines

## Git workflow

Open a pull request against `main` for every change, then merge it yourself
once CI is green and review comments are addressed. Do not push directly to
`main`.

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
- **Input:** all 20 bindings in `InputManager` per spec 16 — never add new keys without checking for conflicts
- **Fullscreen:** F11 toggle via `document.requestFullscreen()` in `main.ts`
- **Art palette:** amber `#D4A843`, dark navy `#0D1B3E`, teal accents `#00B8D4`
- **Industrial Site slots:** always enforce slot limits from spec 05 before placing buildings
- **EventBus pattern:** use `EventBus.emit('event:name', payload)` and `EventBus.on('event:name', handler)` — never direct callbacks between services
- **Depot registration:** each planet scene calls `logisticsManager.registerPlanet('planet_x', depot)` in `enter()` and `logisticsManager.unregisterPlanet('planet_x')` in `exit()`

## Testing

- **Unit tests:** `tests/unit/` — Vitest, `jsdom` environment. Run: `npm test` (208 tests, 34 files)
- **E2E tests:** `tests/e2e/` — Playwright. Run: `npm run test:e2e` (96 tests; requires dev server on :3000 via `npx vite --port 3000`)
- **Debug API:** `window.__voidyield__` provides `setCredits`, `setRP`, `setPlanetStock`, `unlockTech`, `unlockAllTech`, `setStranded`, `advanceTime`, `resetAll`, and `services` object for direct service access
- **Helpers:** `tests/e2e/helpers/gameSetup.ts` — `waitForGame(page)` and `waitForPlanet(page, id)` for scene-aware setup
- **Presets:** `tests/e2e/helpers/presets.ts` — `Preset.freshStart`, `Preset.midGame`, `Preset.lateGame`, `applyStockedDepot`, `applyLogisticsReady`, `applyFullTechTree`, etc.

## Adding new systems

1. Check the relevant spec in `docs/specs/` first
2. Check `docs/specs/16_input_map.md` before adding any key binding
3. Create the service/entity in the right folder
4. Export a singleton at the bottom of the file (e.g., `export const myService = new MyService()`)
5. Wire events via `EventBus` rather than direct callbacks where possible
6. Add `serialize()` / `deserialize()` methods if the system has persistent state (see `SaveManager` pattern)
7. Register the new service in `window.__voidyield__.services` in `src/debug/VoidYieldDebugAPI.ts`
8. Add a unit test in `tests/unit/` and E2E coverage in `tests/e2e/cuj/`
