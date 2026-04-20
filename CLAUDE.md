# VoidYield Web — Claude Guidelines

## Model selection

Use the cheapest model that can do the job:

- **Haiku** — mechanical tasks with a clear spec: writing TS per spec, adding save fields, wiring inputs, boilerplate, config. Output is fully determined by the spec.
- **Sonnet** — tasks needing judgment: fitting new systems into existing architecture, non-obvious debugging, multi-file integration.
- **Opus** — deep design work only: cross-spec audits, resolving contradictions, major architectural decisions.

Default to Haiku for M0–M14 milestone implementation.

## Project overview

TypeScript + PixiJS v8 + Vite + Vitest + Playwright port of the Godot VoidYield game.
Base resolution: 960×540. Pixel-art renderer (no antialiasing).

Design docs live in `docs/` — read `docs/GAME_DESIGN.md` first, then the relevant spec in `docs/specs/` before touching any system. Implementation order is in `docs/IMPLEMENTATION_ROADMAP.md`.

Migration plan is at `docs/TYPESCRIPT_MIGRATION_PLAN.md`.

## Stack conventions

- **Entry point:** `src/main.ts` — boots PixiJS Application, mounts InputManager, creates SceneManager
- **Services:** `src/services/` — EventEmitter-based singletons mirroring Godot autoloads
- **Scenes:** `src/scenes/` — each scene implements `Scene` interface (`enter`, `update`, `exit`)
- **Entities:** `src/entities/` — game objects (Player, Harvester, Drone, …)
- **Data types:** `src/data/` — TypeScript interfaces for JSON data (drones, upgrades, ship_parts)
- **Path aliases:** `@services/`, `@scenes/`, `@entities/`, `@data/` — configured in both `tsconfig.json` and `vite.config.ts`

## Autoload → Service mapping

| Godot autoload | TS service |
|---|---|
| `game_state.gd` | `src/services/GameState.ts` |
| `save_manager.gd` | `src/services/SaveManager.ts` (localStorage/JSON) |
| `settings_manager.gd` | `src/services/SettingsManager.ts` (localStorage config) |
| `audio_manager.gd` | `src/services/AudioManager.ts` (Web Audio API) |
| `colony_manager.gd` | `src/services/ColonyManager.ts` |
| `consumption_manager.gd` | `src/services/ConsumptionManager.ts` |
| `tech_tree.gd` | `src/services/TechTree.ts` |
| `producer_data.gd` | `src/services/ProducerData.ts` |
| `event_log.gd` | `src/services/EventLog.ts` |
| Godot signals | `EventBus` in `src/services/EventBus.ts` |

## Key conventions

- **Save data:** `localStorage` key `voidyield_savegame` via `SaveManager` — format mirrors spec 15
- **Settings:** `localStorage` key `voidyield_settings` via `SettingsManager`
- **Input:** all 20 bindings in `InputManager` per spec 16 — never add new keys without checking for conflicts
- **Fullscreen:** F11 toggle via `document.requestFullscreen()` in `main.ts`
- **Art palette:** amber `#D4A843`, dark navy `#0D1B3E`, teal accents `#00B8D4`
- **Industrial Site slots:** always enforce slot limits from spec 05 before placing buildings

## Testing

- **Unit tests:** `tests/unit/` — Vitest, `jsdom` environment. Run: `npm test`
- **E2E tests:** `tests/e2e/` — Playwright. Run: `npm run test:e2e` (requires dev server on :3000)
- Every M0–M14 milestone must include at minimum: one unit test per new service, one e2e smoke test per new scene.

## Adding new systems

1. Check the relevant spec in `docs/specs/` first
2. Check `docs/specs/16_input_map.md` before adding any key binding
3. Create the service/entity in the right folder
4. Export a singleton at the bottom of the file (e.g., `export const myService = new MyService()`)
5. Wire signals via `EventBus` rather than direct callbacks where possible
6. Add serialize/deserialize methods if the system has persistent state (see SaveManager pattern)
