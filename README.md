# VoidYield Web

TypeScript/PixiJS v8 port of [VoidYield](https://github.com/grimatoma/VoidYield) — a top-down 2D active incremental game set in space.

## Docs &amp; Mocks Hub

A unified review site for every tracked design doc, gameplay spec, and visual mock is published alongside the game on GitHub Pages:

- **Hub:** [`/docs/`](https://grimatoma.github.io/VoidYieldWeb/docs/) — sidebar TOC, search, rendered markdown, inline outline, SVG and HTML mock viewers, view-mode toggle
- Mocks gallery: `/docs/#section=mocks`
- Specs gallery: `/docs/#section=specs`
- Direct doc link: `/docs/#path=docs/GAME_DESIGN.md`

The sidebar is generated from `docs/manifest.json`. To regenerate it after adding a doc or mock, run `node scripts/gen_hub_manifest.mjs` (the deploy workflow also runs it automatically).

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
  index.html       # unified Docs & Mocks Hub (sidebar, search, MD renderer)
  manifest.json    # auto-generated catalog read by the hub
  vendor/          # marked + highlight.js (vendored, no CDN dependency)
  specs/           # 18 game design specs (source of truth)
  GAME_DESIGN.md
  IMPLEMENTATION_ROADMAP.md
  TYPESCRIPT_MIGRATION_PLAN.md
  UI_MENU_CATALOG.md  # factual catalog of every UI surface (UX redesign baseline)
  design_mocks/    # 6 phase-1 core-loop HTML mockups
design_mocks/      # 28 SVG wireframes + HTML mockups + ui/ studies
scripts/
  gen_hub_manifest.mjs  # regenerates docs/manifest.json from the filesystem
tests/
  unit/            # Vitest tests
  e2e/             # Playwright tests
```

## Migration status

See [docs/TYPESCRIPT_MIGRATION_PLAN.md](docs/TYPESCRIPT_MIGRATION_PLAN.md) for the full migration plan and current progress.

**Current milestone:** M0 — Engine Foundation ✅  
**Next milestone:** M1 — Walking Simulator