# VoidYield Web

TypeScript/PixiJS v8 port of [VoidYield](https://github.com/grimatoma/VoidYield) — a top-down 2D active incremental game set in space.

## Stack

- **PixiJS v8** — 2D WebGL/WebGPU renderer
- **TypeScript 5.7** — strict mode
- **Vite 6** — dev server + bundler
- **Vitest 2** — unit tests (jsdom)
- **Playwright** — e2e tests

## Getting started

```bash
npm install
npm run dev        # dev server on http://localhost:3000
npm test           # unit tests
npm run test:e2e   # e2e tests (starts dev server automatically)
npm run build      # production build
```

## Project structure

```
src/
  main.ts          # PixiJS bootstrap
  services/        # GameState, SaveManager, InputManager, EventBus, …
  scenes/          # SceneManager + one class per game scene
  entities/        # Player, Harvester, Drone, …
  data/            # TypeScript types for JSON data
assets/
  sprites/         # PNG sprites (~36 files)
  fonts/           # VoidYieldTerminal.ttf
data/              # JSON data (drones, upgrades, ship_parts, rocket_components)
docs/
  specs/           # 18 game design specs (source of truth)
  GAME_DESIGN.md
  IMPLEMENTATION_ROADMAP.md
  TYPESCRIPT_MIGRATION_PLAN.md
design_mocks/      # 28 SVG wireframes
tests/
  unit/            # Vitest tests
  e2e/             # Playwright tests
```

## Migration status

See [docs/TYPESCRIPT_MIGRATION_PLAN.md](docs/TYPESCRIPT_MIGRATION_PLAN.md) for the full migration plan and current progress.

**Current milestone:** M0 — Engine Foundation ✅  
**Next milestone:** M1 — Walking Simulator