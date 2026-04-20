# VoidYield Web — Architectural Redesign

**Version:** 1.0  
**Date:** 2026-04-20  
**Status:** Design Document (Ready for Implementation)

## Executive Summary

VoidYieldWeb is architecturally backwards. The entire UI—HUD, dashboards, tech trees, galaxy map, overlays, tooltips—is rendered on a PixiJS canvas. This is wrong for a browser game in 2026. The redesign splits rendering into two independent layers:

1. **Canvas (PixiJS v8)** — ONLY the game world: player, deposits, harvesters, drones, buildings, world-space overlays
2. **HTML/CSS** — EVERYTHING ELSE: HUD, panels, menus, modals, production dashboards, tech tree, galaxy map

This redesign makes the game:
- **Responsive** — UI works at any resolution; text is crisp; layout is CSS-driven
- **Accessible** — Real DOM nodes can be navigated with keyboard; screen readers can inspect UI
- **Maintainable** — UI is separate from world rendering; no hardcoded x/y positions
- **Web-native** — Leverages the browser's strengths instead of fighting them

**Scope:** This redesign does NOT change gameplay, the 5-phase progression, or any design doc. It reorganizes the codebase to match how browser games should be built.

**Migration effort:** ~8 weeks (M0–M4 phases). Minimal risk because we prove the architecture works incrementally before migrating everything.

---

## 1. What We're Keeping

### Design & Gameplay
- Core game concept: exploration → automation → galactic dominion
- All 5-phase progression (Phase 0–5) with the 50–100 hour arc
- All 18 design specs in `docs/specs/`
- QualityLot attribute system (OQ, ER, FL are core; other 8 stay in data but unused for now)
- Drone task queue state machine (simple, works well)
- All gameplay balance numbers and progression curves

### Tech Stack & Patterns
- **TypeScript** — static typing is non-negotiable
- **Vite** — fast builds, HMR, ES module resolution
- **EventBus pattern** — services communicate via events, not direct callbacks
- **Service singletons** — GameState, TechTree, etc. remain singletons, but simplified

### Project Structure
- `src/data/` — deposit definitions, tech tree nodes, schematics
- `src/services/` — business logic (GameState, SaveManager, TechTree, FleetManager, etc.)
- `src/entities/` — game objects (Player, Harvester, Drone, Building)
- All existing game logic and entity implementations
- Spec docs in `docs/specs/` — no changes

---

## 2. What We're Cutting / Simplifying

### PixiJS for UI (All Removed)
- **HudOverlay.ts** — `src/ui/HudOverlay.ts` → replaced with HTML
- **ProductionDashboard.ts** — PixiJS Text rendering → HTML `<table>` + CSS
- **TechTreePanel.ts** — PixiJS Graphics + Text nodes → HTML tree + SVG connectors
- **GalaxyMap.ts** — PixiJS world simulation → HTML panel with CSS grid
- **FleetPanel.ts** — PixiJS list rendering → HTML table
- **All other UI overlays** — PixiJS Graphics containers → HTML layers

**Why:** Every pixel of UI currently requires manual x/y positioning, font rendering, color management. The PixiJS text API has no layout system. Responsive design is impossible. HTML/CSS solves all of this.

### 3-Tier Drone Control (Simplified to 2)
- **Remove:** Direct assignment tier + zone automation tier + fleet presets tier
- **Keep:** Direct task assignment (simple) + zone automation (scales well)
- **Impact:** Reduces DroneTaskQueue and FleetManager complexity; spec 04 simplified

### 11-Attribute Quality System (Simplified to 3 Active Attributes)
- **Keep in data:** All 11 attributes defined in `src/data/types.ts` and quality rolls
- **Remove from gameplay:** Only OQ (Overall Quality), ER (Extraction Ratio), FL (Fuel Loss) are used in formulae
- **Impact:** BER formula simplified; deposit display shows 3 numbers instead of 11; tech tree quality bonuses target 3 attributes only
- **Rationale:** The other 8 attributes exist but don't affect the player's decisions until Phase 4+. Keep them in data (for future expansion), hide them from UI.

### Service Fragmentation (Reduced)
- **Merge:** HarvesterManager + MiningService → **HarvestService** (places harvesters, deposits, mining loops)
- **Merge:** FleetManager + DroneTaskQueue → **FleetService** (assigns drone tasks, manages circuits, executes queues)
- **Merge:** LogisticsManager + StrandingManager → **LogisticsService** (cargo routes, planet fuel state)
- **Keep separate:** GameState, TechTree, SaveManager, PowerManager, ConsumptionManager, ZoneManager
- **Impact:** Fewer imports, clearer ownership, easier to test

### Godot-Inspired Scene Transitions (Replace with Router)
- **Remove:** SceneManager's complex scene lifecycle (enter/update/exit)
- **Replace with:** Simple Router state machine: navigate to `#planet-a1`, `#galaxy-map`, `#boot`
- **Benefit:** URL state matches app state; browser back button works; deep linking possible
- **Impact:** Much simpler scene transitions, clearer intent

### Module-Level Singleton Imports
- **Current:** `import { gameState } from '@services/GameState'` pulls a singleton module instance
- **Problem:** Import order matters; circular dependencies are hard to spot; testing requires mocking module internals
- **Solution:** Light dependency injection container `ServiceContainer` (one file, ~50 lines):
  ```typescript
  // src/core/ServiceContainer.ts
  const container = {
    gameState: new GameState(),
    techTree: new TechTree(),
    saveManager: new SaveManager(),
    // ...
  };
  export const getService = <K extends keyof typeof container>(key: K) => container[key];
  ```
- **Impact:** No circular imports; services are testable; mockable for tests

### OfflineSimulator (Rewrite or Defer)
- **Current:** Stub that doesn't work
- **Options:**
  - *Rewrite:* Implement full offline simulation (reasonable 3-week task)
  - *Defer:* Cut until Phase 4, focus on core game working correctly
- **Recommendation:** Defer. Polish Phase 0–2 on a single planet first.

### Fixed 2800×2000 World (Add Proper Camera)
- **Current:** World is static; viewport is the canvas; no zoom or pan
- **New:** Camera with viewport, pan (arrow keys), zoom (scroll wheel), follow-player option
- **Impact:** Player can explore larger worlds; PixiJS stage transforms rather than moving everything manually

---

## 3. New Tech Stack

### Canvas Rendering: Keep PixiJS v8 (Only for Game World)

**Decision:** PixiJS v8 for the 2D game world (player, entities, deposits, drones, buildings, world-space overlays).

**Why PixiJS, not Three.js?**
- PixiJS is optimized for 2D (no 3D pipeline overhead)
- Already in the codebase; proven working
- WebGL fallback to Canvas2D
- Light dependencies (no Node, no heavy math libraries)

**Why not raw Canvas2D?**
- No transform system; manual matrix math
- No sprite batching; poor performance at scale
- PixiJS abstracts all of this away

**What PixiJS handles ONLY:**
- Sprite transforms (position, rotation, scale)
- Deposit circles with quality color coding
- Harvester + drone rendering
- World-space UI overlays (coverage radius, traffic trails, production color-coding)
- Particles (dust, drone trails, explosions)
- Minimap (as a PixiJS RenderTexture, displayed in an HTML `<canvas>` element)

**What PixiJS does NOT handle:**
- Any UI panel, menu, or overlay that isn't part of the game world
- Production Dashboard, Tech Tree, Galaxy Map, Fleet Panel, HUD, Settings, Modals — all HTML/CSS

### UI Layer: Plain HTML + CSS (No Framework)

**Decision:** Semantic HTML + CSS custom properties. No React, Vue, or Svelte.

**Why not a framework?**
- UI panels are relatively simple: static layout, event-driven updates
- Adding React/Vue adds ~40KB minified + a build step complexity
- The game already has a design system (monospace fonts, amber/navy palette)
- State updates are simple: show/hide panels, refresh lists, update counters
- A 50-line effect system (signals) replaces most framework magic

**Tech stack:**
- **HTML:** Semantic structure (no divs everywhere)
  ```html
  <nav id="hud" role="status" aria-live="polite">
    <span id="credits-display">Credits: 0 CR</span>
    <span id="rp-display">RP: 0</span>
  </nav>
  <div id="production-dashboard" class="panel" role="complementary">
    <table>...</table>
  </div>
  ```
- **CSS:** Custom properties for the palette + component-scoped styles
  ```css
  :root {
    --color-primary: #D4A843; /* amber */
    --color-secondary: #0D1B3E; /* navy */
    --color-accent: #00B8D4; /* teal */
  }
  
  .hud {
    position: absolute;
    top: 0;
    left: 0;
    font-family: monospace;
    color: var(--color-primary);
  }
  ```
- **Zero framework overhead:** No JSX, no virtual DOM, no reconciliation

### Reactivity: Signals (not EventBus)

**Decision:** Use `@preact/signals-core` for UI reactive bindings.

**Current problem:** HudOverlay listens to `EventBus.on('credits:changed', handler)` and manually updates PixiJS Text nodes. This works but is verbose and doesn't scale to 15 panels.

**Solution:** Signals (a native TC39 proposal, implemented by Preact):

```typescript
// src/signals/resources.ts
import { signal, computed } from '@preact/signals-core';
import { gameState } from '@services/GameState';

export const credits = signal(gameState.credits);
export const rp = signal(gameState.researchPoints);
export const creditRate = computed(() => {
  // Derived value: recomputed whenever dependencies change
  return /* harvester income per second */;
});

// Sync GameState changes into signals
EventBus.on('credits:changed', (val) => { credits.value = val; });
EventBus.on('rp:changed', (val) => { rp.value = val; });
```

```typescript
// src/ui/components/HUD.ts
import { effect } from '@preact/signals-core';
import { credits, rp } from '@signals/resources';

export function initHUD() {
  const creditsEl = document.getElementById('credits-display')!;
  const rpEl = document.getElementById('rp-display')!;

  // Auto-update when signals change
  effect(() => {
    creditsEl.textContent = `Credits: ${credits.value} CR`;
  });

  effect(() => {
    rpEl.textContent = `RP: ${rp.value.toFixed(1)}`;
  });
}
```

**Why signals?**
- Explicit dependency tracking (effect auto-runs when signal changes)
- No framework coupling (works with plain HTML)
- Tiny (3KB minified)
- Tree-shakeable
- Used by Preact, Solid, Angular (industry standard for lightweight reactivity)

### Routing: Simple Hash Router (No Library)

**Decision:** Hand-rolled URL hash router, 100 lines of code.

**Pattern:**
```typescript
// src/core/Router.ts
export class Router {
  private currentScene: string = 'boot';

  async navigate(scene: string) {
    location.hash = scene;
    await this.load(scene);
  }

  private load(scene: string) {
    // Switch scenes, dispose old, init new
  }
}

// In main.ts
window.addEventListener('hashchange', () => {
  router.handleHashChange();
});
```

**Why no router library?**
- Simplicity: we have 6 scenes + a few menus
- The scene system is already a state machine
- Adding a router library is overkill

### Signals Library: @preact/signals-core (3KB)

**Decision:** Add `@preact/signals-core` as a dependency.

**Why?**
- Tree-shakeable (only import `signal`, `computed`, `effect`)
- No framework coupling
- Matches modern reactivity standards
- Tiny bundle impact
- Used in production by Preact, Qwik, Angular, Solid

**In package.json:**
```json
{
  "dependencies": {
    "pixi.js": "^8.6.0",
    "eventemitter3": "^5.0.1",
    "@preact/signals-core": "^1.11.0"
  }
}
```

### Testing: Keep Vitest + Playwright, Add happy-dom

**Current:** Vitest with `jsdom` environment
**Issue:** jsdom is comprehensive but slower (100ms per test setup vs 10ms)

**Solution:** Use `happy-dom` for unit tests (70–80% of the test suite), jsdom only for integration tests that need full DOM compatibility.

```js
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom', // Fast for units
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      lines: 80,
      functions: 80,
      branches: 75,
    },
  },
});
```

**Impact:** Test suite runs 2× faster, no loss of coverage.

### Build & Formatting: Vite + Biome

**Current:** Vite (good), ESLint + Prettier (works but slow)

**Solution:** Add Biome (replaces ESLint + Prettier in one tool, 100× faster, zero config):

```bash
npm add -D @biomejs/biome
```

```json
{
  "scripts": {
    "lint": "biome lint src/",
    "format": "biome format src/ --write",
    "check": "biome check src/"
  }
}
```

**Impact:**
- Single tool for lint + format (no two-tool pipeline)
- Instant feedback in IDE
- CI checks run in <1s

---

## 4. Rendering Split: Canvas vs HTML (The Architecture Heart)

### PixiJS Canvas Responsibilities

The game world is rendered on a PixiJS canvas. The canvas is `position: absolute; top: 0; left: 0; z-index: 10` and occupies the full viewport. It contains:

**World Entities:**
- Player sprite (x, y, rotation, walking animation)
- Deposit circles (with quality color coding: white for OQ > 800, amber for 500–800, grey for < 500)
- Harvester sprites (stationary, color-coded: idle = cyan, running = green, stalled = red)
- Drone sprites (moving along vectors, type-specific colors: Scout = blue, Heavy = orange, Refinery = green)
- Buildings (Industrial Sites, Launchpad, Drone Bays, Research Lab, etc.) as sprite containers

**World-Space Overlays (still PixiJS, because they're part of the world):**
- Coverage radius circles (when [B] key is pressed)
- Traffic motion trails (when [T] key is pressed, drone movement lines)
- Production color overlay (when [O] key is pressed, buildings tinted by production state)
- Scan radius circle (during survey)
- Deposit highlight when moused over
- Zone paint rectangles (when [Z] key is pressed)
- Minimap (rendered as a PixiJS RenderTexture, displayed in HTML `<canvas id="minimap">`)

**Camera:**
- Viewport (world-space rectangle that bounds the visible area)
- Pan (arrow keys or WASD move the viewport)
- Zoom (scroll wheel scales the world)
- Follow-player option (camera tracks player position)

### HTML/CSS Layer Responsibilities

Everything that isn't the game world. Positioned `position: absolute; top: 0; left: 0; z-index: 20` (above the canvas), with `pointer-events: none` on the container, but `pointer-events: auto` on interactive elements.

**HUD (Always Visible):**
- Credits counter (top-left, updates every frame)
- Research Points counter (top-left below credits)
- Phase/planet indicator
- Current time / session time
- Alert indicators (stalled harvester, low fuel, etc.)

**Panels (Toggle with Keys, Modals):**
- **Production Dashboard** ([P]) — HTML `<table>` with resource rows
  ```html
  <div id="production-dashboard" class="panel" data-shortcut="P">
    <table>
      <thead><tr><th>Resource</th><th>Stock</th><th>+Prod</th><th>Net</th></tr></thead>
      <tbody>
        <tr><td>Vorax</td><td>1,234</td><td>+45.2/min</td><td>+12.1</td></tr>
      </tbody>
    </table>
  </div>
  ```

- **Tech Tree** ([J]) — HTML tree with CSS connectors or SVG lines
  ```html
  <div id="tech-tree-panel" class="panel">
    <div class="branch" data-branch="extraction">
      <div class="node" data-unlocked="false" data-available="true">
        <h3>Drill Bit Mk. II</h3>
        <p>Cost: 50 RP</p>
      </div>
    </div>
  </div>
  ```

- **Galaxy Map** ([G]) — HTML planet cards with CSS grid layout
  ```html
  <div id="galaxy-map" class="panel">
    <div class="planet" data-planet="a1">Planet A1: 45% explored</div>
    <div class="planet" data-planet="b">Planet B: Locked</div>
  </div>
  ```

- **Fleet Panel** ([F]) — HTML table of active drones
  ```html
  <div id="fleet-panel" class="panel">
    <table>
      <tr><td>Scout #3</td><td>MINING_ORE</td><td>▲ (43°)</td><td>ETA: 12s</td></tr>
    </table>
  </div>
  ```

- **Logistics Overlay** ([L]) — HTML control panel + SVG route lines overlaid on canvas
  - HTML controls: source planet, destination planet, cargo type, establish route button
  - SVG `<svg style="position: absolute; pointer-events: none">` draws route lines on top of the world

- **Production Overlay** ([O]) — HTML legend (tells what colors mean) + PixiJS world tinting

- **Coverage Overlay** ([B]) — HTML legend + PixiJS Drone Bay radius circles

- **Harvester Interaction Popup** — HTML tooltip-style panel that appears near a clicked harvester
  ```html
  <div id="harvester-popup" class="popup">
    <h3>Personal Harvester #1</h3>
    <p>Status: RUNNING</p>
    <p>Fuel: 45 / 60</p>
    <button onclick="...">Refuel</button>
  </div>
  ```

- **Settings Menu** ([ESC]) — HTML form with checkboxes/sliders
  ```html
  <div id="settings-panel" class="panel">
    <label><input type="checkbox"> Master Volume</label>
    <label><input type="range" min="0" max="100"> Music Volume</label>
  </div>
  ```

- **Boot/Loading Screen** — HTML on startup, removed when game loads

- **Sector Complete Overlay** — HTML modal with prestige bonus selection

- **Prestige Panel** — HTML summary of sector bonuses and next-sector reset preview

**No Hardcoded Positions:**
All positions are CSS-driven:
```css
.panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-secondary);
  border: 1px solid var(--color-accent);
  padding: 16px;
  max-width: 400px;
  overflow: auto;
}

.hud {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 14px;
}

@media (max-width: 800px) {
  .panel {
    max-width: 90vw;
  }
}
```

---

## 5. New Folder Structure

```
src/
├── core/                           # Game engine primitives
│   ├── Camera.ts                   # Viewport, pan, zoom, follow
│   ├── GameLoop.ts                 # requestAnimationFrame driver
│   ├── Renderer.ts                 # PixiJS stage setup + teardown
│   ├── Router.ts                   # Scene/route navigation
│   ├── InputManager.ts             # (moved from services/)
│   └── ServiceContainer.ts         # DI container for singletons
│
├── world/                          # PixiJS world rendering
│   ├── WorldStage.ts               # Main PixiJS stage + viewport
│   ├── overlays/
│   │   ├── CoverageOverlay.ts      # Drone Bay radius circles
│   │   ├── TrafficOverlay.ts       # Drone motion trails
│   │   ├── ProductionOverlay.ts    # Building color-coding
│   │   ├── ZonePaintOverlay.ts     # Zone rectangles
│   │   └── ScanRadiusOverlay.ts    # Survey scan circle
│   │
│   ├── entities/                   # PixiJS entity sprites
│   │   ├── PlayerSprite.ts
│   │   ├── DepositSprite.ts
│   │   ├── HarvesterSprite.ts
│   │   ├── DroneSprite.ts
│   │   └── BuildingSprite.ts
│   │
│   └── scenes/                     # Per-planet world scenes
│       ├── PlanetA1World.ts        # World only, no UI
│       ├── PlanetBWorld.ts
│       └── ...
│
├── ui/                             # HTML/CSS UI system
│   ├── UIManager.ts                # Mount/unmount panels, manage z-index
│   │
│   ├── components/                 # Panel components
│   │   ├── HUD.ts                  # Credits + RP counter
│   │   ├── ProductionDashboard.ts  # Resource table
│   │   ├── TechTreePanel.ts        # Tech tree tree view
│   │   ├── GalaxyMap.ts            # Planet cards
│   │   ├── FleetPanel.ts           # Drone list table
│   │   ├── LogisticsPanel.ts       # Cargo route controls
│   │   ├── SettingsPanel.ts        # Game settings
│   │   ├── BootScreen.ts           # Startup/loading
│   │   ├── SectorCompleteOverlay.ts
│   │   ├── PrestigePanel.ts
│   │   └── HarvesterPopup.ts       # Context-sensitive tooltip
│   │
│   └── styles/                     # CSS modules + global styles
│       ├── global.css              # Palette, fonts, base styles
│       ├── components.css          # Panel styles
│       ├── theme.css               # Dark/light mode if added later
│       └── responsive.css          # Media queries
│
├── services/                       # Business logic singletons
│   ├── GameState.ts                # Game state + inventory
│   ├── SaveManager.ts              # Save/load, offline simulation
│   ├── SettingsManager.ts          # Audio, display settings
│   ├── TechTree.ts                 # Tech node registry
│   ├── HarvestService.ts           # Merged HarvesterManager + MiningService
│   ├── FleetService.ts             # Merged FleetManager + DroneTaskQueue
│   ├── LogisticsService.ts         # Trade routes (merged with StrandingManager)
│   ├── ConsumptionManager.ts       # Crew needs + productivity
│   ├── PowerManager.ts             # Power balance
│   ├── ZoneManager.ts              # Zone paint grid
│   ├── SectorManager.ts            # Prestige + sector completion
│   ├── DepositMap.ts               # Deposit lookup
│   ├── Inventory.ts                # Stockpile storage
│   └── EventBus.ts                 # Event emitter (unchanged)
│
├── signals/                        # Reactive signal definitions
│   ├── resources.ts                # credits, rp, stockpiles (derived from GameState)
│   ├── buildings.ts                # harvesterList, droneList, buildings (derived from services)
│   ├── ui.ts                       # panelVisibility, selectedDrone, etc.
│   └── world.ts                    # playerPosition, cameraView (derived from world state)
│
├── entities/                       # Game object classes (UNCHANGED)
│   ├── Player.ts
│   ├── Deposit.ts
│   ├── HarvesterBase.ts
│   ├── DroneBase.ts
│   ├── StorageDepot.ts
│   └── ... (all 60+ entities, no changes to logic)
│
├── data/                           # Static game data (UNCHANGED)
│   ├── types.ts
│   ├── deposits_a1.ts
│   ├── deposits_b.ts
│   ├── tech_tree_nodes.ts
│   ├── schematics.ts
│   └── ...
│
├── debug/                          # Debug API (UNCHANGED)
│   ├── VoidYieldDebugAPI.ts
│   └── types.d.ts
│
├── main.ts                         # Bootstrap only (much shorter)
└── vite-env.d.ts

docs/
├── GAME_DESIGN.md                  # (unchanged)
├── ARCHITECTURE_REDESIGN.md        # This document
├── specs/                          # (unchanged)
│   ├── 01_resource_quality.md
│   ├── ...
│   └── 17_world_generation.md
└── MIGRATION_LOG.md                # (created during migration, documents each M0–M4 phase)

tests/
├── unit/                           # (same structure)
├── e2e/                            # (same structure)
└── fixtures/                       # Test data
```

**Key changes:**
1. `src/core/` contains engine primitives (Camera, GameLoop, Renderer, Router)
2. `src/world/` is PixiJS-specific and isolated
3. `src/ui/` is HTML/CSS-specific and isolated
4. `src/signals/` defines reactive signal bindings (new)
5. Services are simplified (HarvestService, FleetService, LogisticsService merged)
6. All game logic in `src/entities/` and `src/services/` is untouched

---

## 6. State & Data Flow

### The Signal-Driven Reactive System

**Core principle:** Services hold the truth. Signals are derived views. UI subscribes to signals.

#### Example: Credits Counter

```typescript
// src/services/GameState.ts — The Source of Truth
export class GameState {
  private _credits: number = 200;

  addCredits(amount: number) {
    this._credits = Math.max(0, this._credits + amount);
    EventBus.emit('credits:changed', this._credits);  // ← Notify
  }
}
```

```typescript
// src/signals/resources.ts — Derived View
import { signal } from '@preact/signals-core';
import { EventBus } from '@services/EventBus';
import { gameState } from '@core/ServiceContainer';

export const credits = signal(gameState.credits);

// Wire service changes into signals
EventBus.on('credits:changed', (val) => {
  credits.value = val;  // ← Signal updated, triggers effects
});
```

```typescript
// src/ui/components/HUD.ts — The Listener
import { effect } from '@preact/signals-core';
import { credits } from '@signals/resources';

export function initHUD() {
  const el = document.getElementById('credits-display')!;

  effect(() => {
    // Runs whenever credits.value changes
    el.textContent = `Credits: ${formatCredits(credits.value)}`;
  });
}
```

#### Example: Production Dashboard

```typescript
// src/signals/buildings.ts
import { computed } from '@preact/signals-core';
import { depotStockpile, activeHarvesters, activePlants } from './...';

export const production = computed(() => {
  const stockpile = depotStockpile.value;
  const plants = activePlants.value;

  return Object.entries(stockpile).map(([ore, qty]) => {
    const prod = plants
      .filter(p => p.output === ore)
      .reduce((sum, p) => sum + p.rate, 0);

    return { ore, qty, prod, net: prod - consumption(ore) };
  });
});
```

```typescript
// src/ui/components/ProductionDashboard.ts
import { effect } from '@preact/signals-core';
import { production } from '@signals/buildings';

export function initProductionDashboard() {
  const tbody = document.querySelector('#production-dashboard tbody')!;

  effect(() => {
    // Rebuild table whenever production signal changes
    tbody.innerHTML = production.value.map(row => `
      <tr>
        <td>${row.ore}</td>
        <td>${row.qty}</td>
        <td>${row.prod.toFixed(1)}/min</td>
        <td>${row.net.toFixed(1)}</td>
      </tr>
    `).join('');
  });
}
```

### Game Loop Architecture

```typescript
// src/core/GameLoop.ts
export class GameLoop {
  private paused = false;

  start() {
    let lastTick = 0;

    const tick = (now: number) => {
      if (!this.paused) {
        const deltaMS = now - lastTick;
        const deltaSec = deltaMS / 1000;

        // Physics tick (60 FPS)
        this.physicsUpdate(deltaSec);  // Player movement, drone physics

        // UI tick (every 100ms, slower)
        if (Math.floor(now / 100) !== Math.floor(lastTick / 100)) {
          this.uiUpdate();  // Update signals, refresh dashboard
        }
      }

      lastTick = now;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private physicsUpdate(delta: number) {
    // Update Player position
    // Update Drone positions (move along vectors)
    // Update Camera if in follow mode
    // PixiJS stage.render() happens automatically via Application.ticker
  }

  private uiUpdate() {
    // Signal updates happen here, which trigger effect() handlers
    // This prevents 60 DOM updates per second for data that changes rarely
  }
}
```

### Data Flow Diagram

```
User Action (click button)
    ↓
InputManager / event listener
    ↓
Service method (e.g., gameState.addCredits())
    ↓
EventBus.emit('credits:changed', newValue)
    ↓
Signal updated (credits.value = newValue)
    ↓
effect() triggered in UI component
    ↓
DOM updated (textContent = newValue)
    ↓
Screen rendered by browser
```

### Signal Organization

| Signal Group | File | Purpose |
|---|---|---|
| Resources | `signals/resources.ts` | credits, rp, creditRate, rpRate |
| Stockpiles | `signals/stockpiles.ts` | inventoryByOre, totalWeight |
| Buildings | `signals/buildings.ts` | production, harvesters, plants, drones |
| UI State | `signals/ui.ts` | visiblePanels, selectedHarvester, hoveredDeposit |
| World | `signals/world.ts` | playerPos, cameraView, zoom |
| Tech | `signals/tech.ts` | unlockedNodes, availableNodes, nextCosts |

**Key invariant:** Signals are read-only in UI components. Services own the truth. Signals are updated by EventBus listeners in the signals file, not by UI clicking directly into services.

---

## 7. Migration Path: Phased Approach (M0–M4)

### Phase M0 — Foundation (2 weeks)

**Goal:** Prove the architecture works with a single component.

1. **Setup infrastructure:**
   - Add `@preact/signals-core` to `package.json`
   - Add `@biomejs/biome` for linting/formatting
   - Create `src/core/ServiceContainer.ts` (DI for singletons)
   - Create `src/core/Router.ts` (hash-based navigation)
   - Create `src/signals/resources.ts` with credits + RP signals
   - Create `src/ui/UIManager.ts` (mount/unmount panels)

2. **Create the HTML/CSS layer:**
   - Add `index.html` with empty `<div id="game-container">` and `<div id="ui-layer">`
   - CSS base file: palette, fonts, layout
   - Position: PixiJS canvas at z-index 10, HTML at z-index 20

3. **Port the HUD:**
   - Create `src/ui/components/HUD.ts` (HTML, no PixiJS Text)
   - Wire signals to DOM updates via `effect()`
   - Replace `HudOverlay.ts` usage in scenes
   - Test: HUD updates when credits/RP change

4. **Verification:**
   - Play the game for 5 minutes
   - Verify HUD updates in real-time
   - Open DevTools: inspect HUD element, see real DOM nodes
   - Check no console errors

**Deliverable:** A single HTML HUD component that proves the architecture works.

### Phase M1 — Migrate UI Panels (3 weeks)

**Goal:** Replace all PixiJS UI with HTML/CSS components.

1. **Port Production Dashboard:**
   - Create `src/ui/components/ProductionDashboard.ts`
   - `src/signals/buildings.ts` for derived production data
   - Wire table updates to signal changes
   - Remove `ProductionDashboard.ts` from PixiJS tree

2. **Port Tech Tree:**
   - Create `src/ui/components/TechTreePanel.ts`
   - HTML tree structure with CSS or SVG connectors
   - Signal: `signals/tech.ts` with unlockedNodes, availableNodes
   - Click handlers unlock nodes via TechTree service

3. **Port Galaxy Map:**
   - Create `src/ui/components/GalaxyMap.ts`
   - HTML planet cards with CSS grid
   - Signal: planet state (visited, unlocked, progress)
   - Click handlers trigger `router.navigate(planetId)`

4. **Port Fleet Panel:**
   - Create `src/ui/components/FleetPanel.ts`
   - HTML table of active drones
   - Signal: droneList (computed from FleetService)
   - Click to select drone, inspect details

5. **Port Settings:**
   - Create `src/ui/components/SettingsPanel.ts`
   - HTML form (checkboxes for audio, sliders for volume)
   - Wire to SettingsManager

6. **Styling:**
   - Create `src/ui/styles/components.css`
   - Panel borders, backgrounds, text colors (using CSS vars)
   - Responsive: works on 1280×720 minimum
   - Consistent spacing, typography

7. **Integration:**
   - Update UIManager to mount all panels
   - Wire keyboard shortcuts ([P], [G], [F], [J], [L], [O], [B], [T], [I])
   - Update InputManager to trigger panel visibility toggles

**Verification:**
- All panels appear and respond to keypresses
- Data updates in real-time
- No PixiJS Text in UI layers
- Inspect DevTools: see real HTML tables, divs, etc.

### Phase M2 — World Refactor (2 weeks)

**Goal:** Implement proper camera and separate world from UI.

1. **Camera system:**
   - Implement `src/core/Camera.ts` with viewport, pan, zoom
   - Arrow keys / WASD pan the viewport
   - Scroll wheel zooms (1.0–2.0× scale)
   - World is rendered within the camera's viewport

2. **World stage cleanup:**
   - Create `src/world/WorldStage.ts`
   - PixiJS stage contains ONLY: world entities, deposits, drones, buildings, world-space overlays
   - Remove all UI from the stage

3. **Overlay system in PixiJS:**
   - Move `CoverageOverlay.ts`, `TrafficOverlay.ts`, `ProductionOverlay.ts` into `src/world/overlays/`
   - These are still PixiJS (they're part of the world), but isolated from entities

4. **Minimap:**
   - Render minimap as PixiJS RenderTexture
   - Display in HTML `<canvas id="minimap">` element
   - Updates every frame

5. **Player movement:**
   - InputManager still drives player.moveTo()
   - Player sprite updates position every frame
   - Camera follows player (optional, signal-driven)

**Verification:**
- Player moves, world pans/zooms
- Camera viewport bounds are correct
- Overlays (coverage, traffic, production) render correctly on the world
- Minimap displays correctly

### Phase M3 — State Completion (3 weeks)

**Goal:** Full save/load and offline simulation.

1. **Service merges:**
   - Merge HarvesterManager + MiningService → HarvestService
   - Merge FleetManager + DroneTaskQueue → FleetService
   - Merge LogisticsManager + StrandingManager → LogisticsService
   - Update service imports throughout codebase

2. **Save/load:**
   - Implement full serialization for:
     - Harvester states (fuel, hopper, position)
     - Drone task queues
     - Factory recipes + production state
     - Stockpile quantities
     - Tech tree unlocks
     - Population state
   - Update `SaveManager.serialize()` to capture all state
   - Verify round-trip: save → quit → load → state is identical

3. **Offline simulation:**
   - Implement `OfflineSimulator.step(deltaSeconds)` to advance game time
   - Run 30-second simulation steps from last save time
   - Cap at 8 hours (per spec 14)
   - Update stockpiles, harvester fuel, factory progress
   - Show "Empire Dispatch" event log on load (spec 14 format)

4. **Quality simplification:**
   - In deposit display, show only OQ / ER / FL
   - Keep all 11 in data files, but don't render the others
   - Update BER formula to use only OQ/ER/FL (remove unused attributes)

**Verification:**
- Save game, restart, load: game state is identical
- Go offline for 8 hours (simulate), come back: offline simulation shows correct harvest/production
- Deposits display 3 quality values, not 11

### Phase M4 — Polish & Platform (ongoing)

**Goal:** Production readiness.

1. **UI Polish:**
   - Panel open/close animations (CSS transitions)
   - Keyboard navigation within panels (Tab to focus)
   - Accessibility: aria labels, semantic HTML, focus indicators

2. **Responsive design:**
   - Test at 1280×720, 1920×1080, 768×1024 (tablet)
   - Panels reflow, don't overflow
   - Minimap scales appropriately

3. **Performance audit:**
   - Profile PixiJS rendering (target: 60 FPS)
   - Profile HTML rendering (target: 60 FPS for UI updates)
   - Check memory leaks (GameLoop, signal subscriptions)

4. **PWA/offline support:**
   - Create `manifest.json` (PWA metadata)
   - Add service worker for offline caching
   - Allow play offline (with limitations)

5. **Documentation:**
   - Update `CLAUDE.md` with new architecture
   - Write `src/core/README.md`, `src/ui/README.md`, `src/world/README.md`
   - Document signal API and component registration

**Verification:**
- Game is playable end-to-end (Phase 0–2 at least)
- All panels work, no UI bugs
- Performance is smooth at any resolution
- Offline play is possible

---

## 8. Proof of Architecture: Minimal Slice (M0 Deliverable)

To prove this architecture is sound before migrating everything, build this minimal slice first:

### What You'll Build:
1. Create `src/core/ServiceContainer.ts` — exports `getService('gameState')`, etc.
2. Create `src/signals/resources.ts` — credits and rp signals, wired to GameState via EventBus
3. Create `src/ui/components/HUD.ts` — a real HTML element with signal subscriptions
4. Update `src/main.ts` to initialize HUD instead of HudOverlay
5. Remove `src/ui/HudOverlay.ts` from the scene

### What You'll Test:
- Run the game
- Credits increase when you mine ore and sell it
- Watch the HUD update in real-time
- Open Chrome DevTools, inspect the HUD element: it's a real DOM node, not PixiJS Text
- Resize the browser window: HUD stays in the corner, readable at any resolution
- The text is crisp (native browser rendering, not PixiJS rasterization)

### Success Criteria:
- HUD works exactly as before
- DevTools shows real `<span>` and `<div>` elements
- No PixiJS code in the HUD component
- No resize/responsiveness issues
- Console shows no errors or warnings

If this feels right, the architecture is proven. If there are unexpected issues, debug them now (before migrating the other 14 panels). The cost of learning here is low.

---

## 9. Rationale for Key Decisions

### Why Not Svelte / React / Vue?

**Svelte:** Would work, but adds a build step (transpilation). No framework coupling is actually simpler for our use case.

**React:** Overkill. We have ~15 panels, each with ~10–50 DOM nodes. React's virtual DOM is unnecessary. Signals + effect() is lighter and more transparent.

**Vue:** Similar to React. Good framework, but we don't need two-way binding or component props cascading. Simple HTML + signals is cleaner.

**Plain HTML + Signals:** ~3KB dependency (signals), no framework, no transpilation, no bundler plugin. The HTML is readable and inspectable. Each component is a ~50-line function that sets up DOM and signal subscriptions.

### Why Not Keep Everything in PixiJS?

**The problem:** PixiJS has no layout system. UI is positioned manually with hardcoded x/y. Responsive design means rewriting x/y for every resolution. Accessibility is zero (no keyboard navigation, no screen reader support, no semantic DOM). Printing is impossible. Zooming breaks everything.

**The browser does all of this for free:** CSS layout, responsive media queries, keyboard navigation, screen readers, zoom, print. Why re-implement it in PixiJS?

### Why Cut the 3-Tier Drone Control?

**Current:** Direct assignment (pick drone, assign task) + zone automation (mark zone, drones auto-maintain) + fleet presets (complex priority matrix)

**Problem:** Three tiers are too much. Players don't use all three. The priority matrix is confusing.

**Solution:** Two tiers (direct + zone) cover 95% of use cases. Direct assignment for urgent repairs. Zone automation for large-scale harvester maintenance. If players need more, we add it later.

### Why Keep EventBus AND Add Signals?

**EventBus** (stays): For **game events** that cross service boundaries. Harvester runs out of fuel → emit 'harvester:fuel_depleted' → other services react. This is the right pattern for business logic.

**Signals** (new): For **UI data binding**. When a signal changes, effects auto-run. Much simpler than manually subscribing to EventBus in every component.

They're complementary:
- Service: "Harvester fuel changed" → emit event
- Signal: Event listener updates signal → effects re-run → UI updates

---

## 10. Success Metrics

When the redesign is complete:

### Code Quality
- [ ] All UI is HTML/CSS with zero PixiJS for non-world content
- [ ] All services have proper serialize/deserialize methods
- [ ] Unit test coverage remains ≥80%
- [ ] No hardcoded x/y positions in UI code
- [ ] Zero circular imports

### Performance
- [ ] 60 FPS physics tick (player movement, drone movement, world simulation)
- [ ] 60 FPS UI updates (no lag when opening panels)
- [ ] <500 KB bundle size (PixiJS + signals + code)
- [ ] Game runs on 2-year-old hardware (i5, 4GB RAM)

### User Experience
- [ ] Game is playable from boot to Phase 2 end-to-end
- [ ] All panels open/close with keyboard shortcuts
- [ ] No UI glitches at 1280×720, 1920×1080, 2560×1440
- [ ] HUD is readable at any zoom level
- [ ] Offline play works for ≤8 hours of simulation

### Maintainability
- [ ] Adding a new panel takes <1 hour (create component, wire signals, style)
- [ ] Changing the amber palette color is a single CSS var update
- [ ] Services are testable without mocking imports
- [ ] Save/load is fully implemented and tested

---

## 11. Risk & Mitigation

### Risk: Signal subscriptions leak memory

**Mitigation:** `effect()` returns an unsubscribe function. Call it in cleanup:
```typescript
const cleanup = effect(() => { ... });
// Later
cleanup(); // unsubscribe
```

### Risk: Two-layer rendering (canvas + HTML) causes input event conflicts

**Mitigation:** Canvas layer has `pointer-events: auto`, HTML layer has `pointer-events: none` by default but `pointer-events: auto` on interactive elements. Clearly defined event handling.

### Risk: Offline simulation is complex and buggy

**Mitigation:** Defer offline simulation to Phase 4. Phase M3 focuses on core save/load. Offline sim is optional until multi-planet play.

### Risk: Migration breaks existing E2E tests

**Mitigation:** E2E tests use Playwright (DOM inspection). Since we're moving toward real DOM, most tests will work unchanged. Update selectors from PixiJS inspection to CSS selectors.

### Risk: Browser compatibility

**Mitigation:** Signals work on all modern browsers (Safari 16+, Chrome 100+, Firefox 100+). CSS custom properties work on all modern browsers. Fallback to CSS variables if needed, but not required.

---

## 12. Conclusion

This redesign is a **fundamental realignment** of how VoidYieldWeb is built. Instead of trying to do everything in PixiJS (which is optimized for game worlds, not UI), we split clearly:

- **PixiJS:** The game world (entities, overlays, camera, rendering)
- **HTML/CSS:** Everything else (panels, menus, modals, HUD)
- **Signals:** The reactive glue between them

This is how professional browser games are built in 2026. The architecture is:
- **Simple:** Services hold truth. Signals derive views. UI reacts to signals.
- **Responsive:** CSS layout handles any screen size.
- **Accessible:** Real DOM nodes, keyboard navigation, semantic HTML.
- **Maintainable:** UI code is separate from world rendering. Changes don't cascade.
- **Proven:** This pattern is used by Preact, Solid, Angular, and every modern web game.

The migration is **low-risk** because we prove the architecture with M0 (HUD component) before rolling it out. Each phase (M0–M4) is self-contained and testable. At any point, if the approach feels wrong, we can course-correct with only a few days of work lost.

Start with Phase M0. Get the HUD working in real HTML. If it feels right, continue to M1. By the end of M1 (3 weeks), you'll have a modern, responsive UI layer that's easier to maintain than the current PixiJS-based approach.

**The game's gameplay stays exactly the same. Only the architecture improves.**
