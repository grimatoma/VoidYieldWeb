# VoidYield Migration Gap Report
*Generated: 2026-04-20*

## Executive Summary

The TypeScript/PixiJS web repo (**VoidYieldWeb**) has **significantly surpassed** the Godot repo in game-system depth, breadth, and automated test coverage. Core gameplay loop, economy, progression, automation, multi-planet logistics, prestige, and offline simulation are all fully ported — many with expanded scope. The Godot repo can be **retired**. The remaining gaps are surface-level UX systems (tutorial, audio, menus, event log), not core gameplay.

---

## Step 1 — Godot Repo Inventory

**Repo:** `C:\Users\grima\Documents\VoidYield`  
**Engine:** Godot 4.6.2 (GL Compatibility), pixel-art, 960×540

### Autoloads (14 managers)

| Manager | File |
|---|---|
| GameState | autoloads/game_state.gd |
| ProducerData | autoloads/producer_data.gd |
| SaveManager | autoloads/save_manager.gd |
| AudioManager | autoloads/audio_manager.gd |
| SettingsManager | autoloads/settings_manager.gd |
| TechTree | autoloads/tech_tree.gd |
| ColonyManager | autoloads/colony_manager.gd |
| ConsumptionManager | autoloads/consumption_manager.gd |
| EventLog | autoloads/event_log.gd |
| TutorialManager | autoloads/tutorial_manager.gd |
| LogisticsManager | autoloads/logistics_manager.gd |
| SpacecraftManager | autoloads/spacecraft_manager.gd |
| OfflineManager | autoloads/offline_manager.gd |
| PrestigeManager | autoloads/prestige_manager.gd |

### World Scenes (26 files)
Terminals: sell_terminal, shop_terminal, storage_depot, spaceship  
Resources: ore_node, deposit_node, asteroid_field  
Production: harvester_base, industrial_site, processing_plant, fabricator  
Other: game_loop, zone_manager, survey_tool, launch_pad, cargo_ship, planet_b

### UI Scenes (17 panels)
hud, mobile_controls, shop_panel, spaceship_panel, galaxy_map_panel, tech_tree_panel,  
logistics_panel, prestige_panel, offline_summary_panel, tutorial_overlay,  
resource_quality_inspector, main_menu, pause_menu, options_panel

### Drones (7 scripts)
drone_bay, fleet_manager, drone_task_queue, scout_drone, cargo_drone, heavy_drone, refinery_drone

### Data (9 files)
drones.json, upgrades.json, ship_parts.json, rocket_components.json,  
survey_stages.gd, ore_quality_lot.gd, quality_modifiers.gd, recipes.gd, tech_tree_data.gd

### Godot Git Log (last 20 commits)
```
2d34359 feat(prestige): add PrestigeManager, PrestigePanel, save v0.5 wiring
26b0aa9 feat(offline): core simulation engine + save wiring
b4befbf chore: add git pre-commit hook to clear stale Godot lock files
db1b4bd fix: resolve load crash from TutorialManager/autoload issue
56ccc76 feat: TutorialManager + tutorial overlay (M0 onboarding)
f9fab6b feat: SpacecraftManager + build panel (Phase 3 escape gate)
6dfc575 feat: wire tech tree unlock effects to gameplay systems
723b778 feat: Phase 2 Refinery Drone tasks — close the automation loop
613a05c feat: LogisticsManager + multi-planet storage + trade routes (M11)
...
```

---

## Step 2 — Web Repo Inventory

**Repo:** `C:\Users\grima\Documents\VoidYieldWeb`  
**Stack:** TypeScript + PixiJS v8 + Vite + Vitest + Playwright, 960×540

### Services (19 files)
Camera, ConsumptionManager, DepositMap, DroneTaskQueue, EventBus, FleetManager,  
GameState, HarvesterManager, InputManager, Inventory, LogisticsManager,  
MiningService, OfflineSimulator, PowerManager, SaveManager, SectorManager,  
StrandingManager, TechTree, ZoneManager

### Scenes (7 files)
BootScene, PlanetA1Scene, PlanetA2Scene, PlanetA3Scene, PlanetBScene, PlanetCScene, SceneManager

### Entities (24 files)
AssemblyComplex, Deposit, DroneBase, DroneBay, Fabricator, GalacticHub, GasCollector,  
HabitationModule, HarvesterBase, HeavyDrone, IndustrialSite, Launchpad, MineralHarvester,  
Player, ProcessingPlant, RefineryDrone, ResearchLab, ScoutDrone, SolarPanel, Speeder,  
StorageDepot, TradeHub, WarpGate, WaterCondenser

### UI (15 files)
CoverageOverlay, FleetPanel, GalaxyMap, HarvesterHUD, HudOverlay, LogisticsOverlay,  
MinimapOverlay, OfflineDispatchPanel, PopulationHUD, PrestigePanel, ProductionDashboard,  
ProductionOverlay, SectorCompleteOverlay, TechTreePanel, TrafficOverlay

### Data (9 files)
deposits_a1/a2/a3/b/c.ts, rocketComponents.ts, schematics.ts, tech_tree_nodes.ts, types.ts

### Web Git Log (last 20 commits)
```
c152ae6 fix: BootScene navigates to planet scene after splash instead of idling
43e4a5e chore: update design mocks, reformat data JSON, trim CLAUDE.md
ba9974f docs: disconnect from Godot — update CLAUDE.md and roadmap to TS-native
c0f487b feat(M14): endgame prestige — WarpGate, GalacticHub, PlanetA3Scene, SectorManager, offline simulation (208 tests)
89bb50a Add window.__voidyield__ debug API + comprehensive E2E CUJ test suite (96 tests)
df96090 M13: Logistics v3 + Multi-planet Economy (190 tests)
feeec4d feat(M12): tech tree v2 + colony tiers — 46 nodes, Speeder, tier advancement
f5d4390 feat(M11): space race — LogisticsManager, CargoShip routes, PlanetA2, GalaxyMap v2
d5c1f75 feat(M10): second world — Launchpad, PlanetBScene, StrandingManager, GalaxyMap
...
```

### Test Coverage
208 unit tests (34 files) + 96 E2E Playwright tests (9 CUJ specs) + `window.__voidyield__` debug API

---

## Step 3 — Feature Gap Table

### Legend
✅ Fully ported (web equals or exceeds Godot)  
🔄 Partially ported (some gaps or reduced scope)  
❌ Not started (Godot has it, web does not)  
🗑️ Intentionally dropped (Godot-specific or superseded)  
⬆️ Web exceeds Godot (feature didn't exist in Godot)

---

### Core Game Loop

| Feature | Status | Notes |
|---|---|---|
| Player movement / WASD | ✅ | Player.ts, InputManager with 20 bindings |
| Manual ore mining (interact) | ✅ | MiningService + Deposit entities |
| Ore inventory | ✅ | Inventory.ts service |
| Storage Depot | ✅ | StorageDepot entity |
| Ore selling / credits | ✅ | TradeHub entity (replaces sell_terminal + shop_terminal) |
| Shop / upgrades | ✅ | TradeHub handles purchasing |
| HUD (credits, RP display) | ✅ | HudOverlay, PopulationHUD, HarvesterHUD |

### Resource & Deposit System

| Feature | Status | Notes |
|---|---|---|
| Deposit nodes with quality tiers | ✅ | Deposit.ts, DepositMap service |
| Survey mechanics | ✅ | MiningService + Deposit (survey stages implemented) |
| Resource quality attributes | ✅ | QualityAttributes (spec 01, M9 — full implementation) |
| Ore quality inspector UI | ❌ | Godot has resource_quality_inspector.gd; no equivalent UI panel in web |
| Multiple ore types | ✅ | common, rare, aethite, voidstone, void_cores, shards, etc. |
| Asteroid field (visual/gameplay) | 🔄 | No asteroid_field entity; visual decoration only in Godot anyway |

### Harvester Buildings

| Feature | Status | Notes |
|---|---|---|
| Harvester base / mineral harvester | ✅ | HarvesterBase + MineralHarvester entities |
| Gas collector | ✅ | GasCollector entity (used on Planet B/C) |
| HarvesterManager tick loop | ✅ | HarvesterManager service |
| Harvester HUD | ✅ | HarvesterHUD overlay |
| Industrial site slot limits | ✅ | IndustrialSite.ts enforces spec 05 limits |
| Processing plant | ✅ | ProcessingPlant entity |
| Fabricator | ✅ | Fabricator entity (M9) |
| Assembly complex | ⬆️ | AssemblyComplex — not in Godot, added in web |
| Power system (solar panels, balance) | ⬆️ | PowerManager + SolarPanel entity — not in Godot |
| Water condenser | ⬆️ | WaterCondenser entity — not in Godot |
| Habitation module | ⬆️ | HabitationModule entity — not in Godot |

### Drone System

| Feature | Status | Notes |
|---|---|---|
| Scout drone | ✅ | ScoutDrone entity |
| Heavy drone | ✅ | HeavyDrone entity |
| Refinery drone | ✅ | RefineryDrone entity |
| Cargo drone | 🗑️ | Subsumed by heavy drone in web design |
| Drone bay | ✅ | DroneBay entity |
| Fleet manager | ✅ | FleetManager service |
| Drone task queue | ✅ | DroneTaskQueue service |
| Zone manager / auto-dispatch | ✅ | ZoneManager service |
| Fleet panel UI | ✅ | FleetPanel overlay |
| Traffic / coverage overlays | ✅ | TrafficOverlay + CoverageOverlay |

### Tech Tree

| Feature | Status | Notes |
|---|---|---|
| Tech tree data & nodes | ✅ | tech_tree_nodes.ts — 46 nodes (more than Godot) |
| TechTree service (unlock logic, RP costs) | ✅ | TechTree.ts service |
| Tech tree panel UI | ✅ | TechTreePanel.ts |
| Research Lab entity | ✅ | ResearchLab.ts |
| RP accumulation | ✅ | Wired through GameState + EventBus |
| Prerequisite gating | ✅ | TechTree.ts enforces chains |

### Economy & Production

| Feature | Status | Notes |
|---|---|---|
| Credit economy | ✅ | GameState credits + TradeHub |
| Production dashboard | ✅ | ProductionDashboard + ProductionOverlay |
| Economy model / price tuning | ✅ | Matches spec 12 balance sheet |
| Schematics / recipes | ✅ | schematics.ts data file |

### Colony & Consumption

| Feature | Status | Notes |
|---|---|---|
| ConsumptionManager (population tiers 1–5) | ✅ | ConsumptionManager.ts fully ported |
| Productivity multiplier | ✅ | Wired to Fabricator + ProcessingPlant |
| Population HUD | ✅ | PopulationHUD overlay |
| ColonyManager (Pioneer housing, morale, needs) | 🔄 | ConsumptionManager handles tiers; explicit Pioneer-count morale loop from Godot's colony_manager.gd not ported as a named service. HabitationModule exists but full morale/needs simulation may differ. |

### Multi-Planet / Logistics

| Feature | Status | Notes |
|---|---|---|
| LogisticsManager (trade routes) | ✅ | LogisticsManager.ts — fully ported and expanded |
| Logistics overlay / UI | ✅ | LogisticsOverlay.ts |
| Galaxy map | ✅ | GalaxyMap.ts (v2) |
| Planet A1 | ✅ | PlanetA1Scene |
| Planet A2 | ✅ | PlanetA2Scene (Transit Asteroid) |
| Planet A3 | ⬆️ | PlanetA3Scene — does not exist in Godot |
| Planet B (stranding / fuel) | ✅ | PlanetBScene + StrandingManager |
| Planet C | ⬆️ | PlanetCScene — does not exist in Godot |
| WarpGate | ⬆️ | WarpGate entity — endgame gate, not in Godot |
| GalacticHub | ⬆️ | GalacticHub entity — not in Godot |
| Minimap | ✅ | MinimapOverlay |
| Cargo ship (inter-planet visual) | 🔄 | cargo_ship.gd exists in Godot as a visual entity; web handles logistics as a service with no animating ship sprite |
| A2 Transit waypoint mechanic | ✅ | LogisticsManager handles transit routing per spec 00 |

### Spacecraft Construction

| Feature | Status | Notes |
|---|---|---|
| Rocket component data | ✅ | rocketComponents.ts (hull, engine, fuel_tank, avionics, landing_gear) |
| Launchpad entity | ✅ | Launchpad.ts with 5-slot build tracker |
| StrandingManager (Planet B fuel) | ✅ | StrandingManager.ts |
| Launch sequence / transition | ✅ | PlanetBScene + SectorManager handle post-launch |
| Spaceship build panel (visual UI) | 🔄 | Godot has a dedicated spaceship_panel.gd; in web the Launchpad entity renders its own inline build progress UI. No standalone full-panel equivalent. |

### Prestige / Sector Reset

| Feature | Status | Notes |
|---|---|---|
| SectorManager (prestige bonuses) | ✅ | SectorManager.ts — 10 bonus types, stacking |
| PrestigePanel UI | ✅ | PrestigePanel.ts |
| SectorCompleteOverlay | ✅ | SectorCompleteOverlay.ts |
| Cross-run persistence | ✅ | SaveManager serializes prestige state |

### Offline Simulation

| Feature | Status | Notes |
|---|---|---|
| OfflineSimulator / OfflineManager | ✅ | OfflineSimulator.ts — 8h cap, step-based, harvester stall detection |
| Offline dispatch panel UI | ✅ | OfflineDispatchPanel.ts |
| SaveManager offline trigger | ✅ | Calls OfflineSimulator before state load |

### Save / Load

| Feature | Status | Notes |
|---|---|---|
| Save service | ✅ | SaveManager.ts — localStorage key `voidyield_savegame` |
| Serialize / deserialize all services | ✅ | All services implement serialize()/deserialize() |
| Autosave | ✅ | Throttled autosave in SaveManager |
| Versioned save format | ✅ | Per spec 15 |
| Two save slots | 🔄 | Godot has main + auto slots explicitly; web autosaves to same key (no named slot picker) |

### Settings

| Feature | Status | Notes |
|---|---|---|
| SettingsManager service | ✅ | SettingsManager.ts (localStorage `voidyield_settings`) |
| Options/Settings panel UI | ❌ | No SettingsPanel.ts; SettingsManager service exists but there's no in-game UI for changing audio/display settings |

### HUD & Menus

| Feature | Status | Notes |
|---|---|---|
| Main HUD (credits, RP, inventory) | ✅ | HudOverlay.ts |
| Main Menu (title screen / load game) | ❌ | No MainMenu scene; BootScene goes straight to planet |
| Pause Menu | ❌ | No PauseMenu.ts; InputManager maps Escape key but no pause overlay |
| Options Panel | ❌ | See Settings above |

### Tutorial

| Feature | Status | Notes |
|---|---|---|
| 7-step onboarding tutorial | ❌ | No tutorial system in web — TutorialManager, tutorial_overlay are Godot-only |

### Audio

| Feature | Status | Notes |
|---|---|---|
| AudioManager (synthesized SFX) | ❌ | No audio system in web; no sound effects or music |
| Named SFX (mine, sell, survey, purchase) | ❌ | Not implemented |
| Drone hum (loop on active fleet) | ❌ | Not implemented |

### Event Log

| Feature | Status | Notes |
|---|---|---|
| EventLog service (200-entry in-game log) | ❌ | No EventLog equivalent; EventBus exists for service-to-service events but no player-facing event log UI |

### Input

| Feature | Status | Notes |
|---|---|---|
| All 20 key bindings (spec 16) | ✅ | InputManager.ts |
| Fullscreen (F11) | ✅ | document.requestFullscreen() in main.ts |
| Mobile / virtual joystick | ❌ | Godot has mobile_controls.gd with virtual joystick; no touch/mobile controls in web (some files reference touch events but no joystick overlay) |

### Vehicles

| Feature | Status | Notes |
|---|---|---|
| Speeder vehicle | ✅ | Speeder.ts entity |
| Vehicle survey mount / tier upgrades | ✅ | Wired through TechTree |
| Cargo ship (animated, inter-planet) | 🗑️ | Godot's cargo_ship.gd was a visual entity; web logistics are headless. Intentional design difference. |

---

## Step 4 — Recommendation

### Can the Godot repo be retired?

**Yes.** The web repo is definitively ahead: more planets (A1/A2/A3/B/C vs A+B), more entities (24 vs ~15 world entities), 208 unit tests + 96 E2E tests vs Godot's smaller test suite, a full debug API, and an active CI/CD pipeline to GitHub Pages. Commit `ba9974f` ("docs: disconnect from Godot") already formally declared this. The Godot repo has received no commits since the prestige/offline work while the web repo advanced through M14.

**Recommended retirement action:** Archive the Godot repo (GitHub: set to archived/read-only). Keep it accessible for historical reference and design inspiration. Do not delete.

---

### Minimum Remaining Work to Reach Full UX Parity

These 6 gaps are the only material differences between "game-complete web build" and a polished shippable product:

**Priority 1 — Blockers for first-time players**

1. **Tutorial system** — 7-step onboarding (welcome → survey → build harvester → collect ore → sell → buy drone → second harvester). Without it, new players are lost. Estimated scope: ~2 days. Model: Sonnet.

2. **Main Menu / Pause Menu** — Title screen with Start/Load, in-game Escape to pause. Currently BootScene hard-navigates to planet. Estimated scope: ~1 day. Model: Haiku.

3. **Audio** — Synthesized SFX using Web Audio API (mine ping, sell chime, purchase blip, survey sweep, drone hum loop). No audio files needed — same philosophy as Godot. Estimated scope: ~1–2 days. Model: Sonnet.

**Priority 2 — Polish / QoL**

4. **Settings Panel** — In-game UI to control audio volumes and display options. SettingsManager service already exists. Just needs a UI overlay. Estimated scope: ~0.5 days. Model: Haiku.

5. **Event Log** — Player-facing in-game notification log (200-entry ring buffer, categorized). Helps players understand what's happening without reading raw state. Estimated scope: ~1 day. Model: Haiku.

6. **Offline Summary Panel** — `OfflineDispatchPanel.ts` exists but verify it surfaces the narrative "you were away X hours, here's what happened" summary that Godot's `offline_summary_panel` shows on load. If it doesn't, add the modal. Estimated scope: ~0.5 days. Model: Haiku.

**Nice-to-have (not blocking)**

- Ore quality inspector panel (visual tooltip showing deposit grade breakdown)
- Mobile virtual joystick overlay (only needed if targeting mobile browsers)
- Named dual save slots with a slot-picker UI
- Cargo ship sprite animation along trade routes (purely visual, logistics work headlessly)

---

### What from Godot Should NOT Be Ported

| Godot Feature | Reason Not to Port |
|---|---|
| `.tscn` scene files / Node2D hierarchy | PixiJS Container tree replaces Godot's scene tree |
| GDScript synthesized audio via AudioServer | Web Audio API has equivalent API; code rewrite is trivial |
| Godot physics layers (player/world/drones) | PixiJS doesn't use physics layers; spatial logic is custom |
| `user://` file paths | localStorage already used; paths are irrelevant |
| `[autoload]` registration in project.godot | TypeScript module singletons replace autoload pattern |
| CANVAS_ITEMS stretch mode | PixiJS `resizeTo` handles viewport scaling |
| Godot particle effects (amber ore sparks) | Would need PixiJS particle emitter reimplementation — low priority |
| `mobile_controls.gd` virtual joystick (Godot InputMap) | If needed, reimplement as PixiJS touch overlay from scratch |
| `ProducerData` autoload (loads JSON at startup) | TypeScript const arrays in `src/data/` replace runtime JSON loading |
| `cargo_ship.gd` (animated entity) | Intentional design decision: logistics are headless in web |

---

### Final Verdict

The VoidYieldWeb TypeScript repo is the canonical, primary, and only active VoidYield codebase. It has surpassed the Godot repo in every meaningful dimension: more planets, more buildings, more economy depth, 300+ automated tests, CI/CD, and a public debug API. The Godot repo served its purpose as a prototyping ground and should be archived.

To reach a shippable v1.0 from the current M14 state, approximately **5–7 developer-days** of UX work remains: tutorial, menus, and audio. All core gameplay is complete.
