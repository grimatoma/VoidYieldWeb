# VoidYield — Spec Alignment Review

**Date:** 2026-04-19  
**GDD version reviewed:** v0.4 (18 spec files)  
**Implementation roadmap version:** v1.0

**Coverage:** autoloads (9/9), drone scripts (7/7), core world scripts (~12), data/resource files (~3/15), UI scripts (~8/20), test files (6).

---

## ✅ Aligned (spec matches implementation)

- **Save/Load core (Spec 15):** Two-slot save, autosave on 60-second interval, version checking, JSON at `user://save.json` + `user://save_auto.json` — all working as specced.
- **Consumption & Productivity (Spec 06):** `ConsumptionManager` autoload fully implements 5-tier progression (Pioneers → Directors), per-tier consumption rates, and productivity multiplier (100% → 1.0×; 0% → 0.15×) applied to harvester BER in real time.
- **Tech Tree unlock logic (Spec 11):** RP accumulation, prerequisite checking, signal emission on unlock, save/load of unlocked nodes — all in place. All 50+ nodes defined in `data/tech_tree_data.gd`.
- **Deposit / Quality lot system (Spec 01):** `DepositNode` tracks ore type, concentration, and survey stage. `OreQualityLot` class exists. Quality tiers generated on survey advancement.
- **Personal Mineral Harvester (Spec 03):** BER formula fully implemented: `base_ber × (concentration/100) × (ER/1000) × upgrade_multiplier + (FL/1000 × BER × 0.5)`. Fuel, hopper, and productivity multiplier all wired correctly.
- **Drone task queue (Spec 04 — Tier 1):** `DroneTaskQueue` with `enqueue()`, `assign_next()`, `complete_task()`, priority sorting, and task-type enum (IDLE, HAUL, SCOUT, REPAIR, REFUEL) is in place.
- **Survey Tool Tier I (Spec 02):** Quick Read and Passive Scan stages implemented on `DepositNode` via `advance_survey()`. Survey result card UI placeholder present.
- **Processing Plant (Spec 05):** Single-recipe production and basic UI exist. Factory scene structure in place.

---

## ⚠️ Diverged (implemented differently than specced)

- **Ore sell prices (Spec 12):** Spec calls for dynamic pricing with phase-based scaling and per-resource price curves. Implementation has static prices hardcoded in `GameState` (common=2, rare=5, aethite=8, voidstone=15). Economy balance sheet from spec 12 not yet applied.
- **Drone control (Spec 04):** Spec defines three tiers: (1) Direct tasking, (2) Zone automation, (3) Fleet presets. Only Tier 1 is sketched — `DroneTaskQueue` exists but no zone polygons, priority matrix, or auto-dispatch logic. Drones do not auto-reassign.
- **Quality passthrough in factories (Spec 05/12):** `OreQualityLot` exists, but the quality passthrough formula through refining → fabrication → assembly is not yet wired. Factory outputs do not reflect input quality.
- **Tech tree effects not applied (Spec 11):** Nodes unlock correctly, but unlocking a node does not yet auto-apply its effect (e.g., "Harvester BER Upgrade I" does not yet add +10% to active harvesters).
- **Survey Tier I–III not wired to tech tree (Spec 02):** Three-tier survey progression is specced to unlock via nodes 3.S and 3.T. Deep Scan hold-timer, Tier II range/precision bonuses, and Survey Journal persistence are not implemented.
- **Input map (Spec 16):** Spec defines all 20+ bindings as a single source of truth. Individual systems currently define their own keys; no centralized `input_map` spec reference exists.

---

## ❌ Missing (specced but not implemented)

- **Offline simulation & Event Log (Spec 15/14):** No stepwise 30-second offline simulation. No "Empire Dispatch" panel on load. Players receive no feedback on what happened while away.
- **Prestige / Sector Reset (Spec 09 §5, Spec 15):** No `SectorManager`, no prestige screen, no reset logic, no bonus stacking. The post-Sector-Complete loop does not exist.
- **Multi-planet logistics (Spec 07/09):** No Cargo Ships, no trade routes, no Drone Freight Lanes, no Jump Relays. Planets are effectively isolated from each other.
- **Planet B — full implementation (Spec 09/10):** Scene exists but no terrain, deposits, Atmospheric Water Extractor, Bio-Resin harvesting, stranding mechanic (20 RF on arrival, 100 to launch), or starting supply pack.
- **Planet C & unique harvesters (Spec 09/03):** No Planet C scene. Gas Trap, Resonance Charge Cracking, shifting deposit re-roll, and survey marker staleness not implemented.
- **Spacecraft construction arc (Spec 10):** `launch_pad.gd` and `spaceship.gd` are incomplete stubs. No rocket component schematics, no assembly UI checklist, no Fuel Synthesizer logic, no launch animation, no Planet B arrival sequence.
- **Advanced drone types (Spec 04):** Heavy, Refinery, Survey, Builder, Cargo, and Repair drones are scene stubs only — no task logic implemented. Zone automation (Tier 2) and Fleet Presets (Tier 3) are entirely missing. Drone Fabricator not implemented.
- **Fabricator & Assembly Complex (Spec 05):** Scene stubs exist with no production logic, no multi-input recipes, no retooling, no proximity bonus.
- **Ore Refinery & Drone Fabricator (Spec 05):** Both entirely missing (not even stubs).
- **Vehicles (Spec 08):** Rover, Speeder, Vehicle Survey Mount, and Shuttle — none implemented.
- **Planet A3 & Galactic Hub (Spec 09, M14):** No scene, no Warp Gate, no Galactic Hub, no Ferrovoid ore. A3 unlock conditions not checked.
- **Advanced UI overlays (Spec 14):** Production Dashboard ([P]) is a basic stub. Production ([O]), Logistics ([L]), Traffic ([T]), and Coverage ([B]) overlays are entirely missing.
- **Advanced colony buildings (Spec 06/09):** Habitation Module not placed. Population growth timer and tier advancement conditions not wired.
- **Planet A2 (Spec 09):** No scene, no gas depot, no secret cache, no transit asteroid layout.

---

## 🔥 Critical gaps (would break the core loop if absent)

1. **Prestige / Sector Reset (Spec 09/15)** — Without it the game ends at Sector Complete and never loops. The entire replayability model depends on this. **BLOCKER for v1.0.**
2. **Offline Simulation (Spec 15/14)** — Core incremental-game pillar. Players cannot tell whether anything happened while away. **BLOCKER for v1.0.**
3. **Spacecraft Construction (Spec 10)** — Gate to Phases 3+. Without it players are permanently stuck in Phase 1–2. **BLOCKER for Phase 3+.**
4. **Drone Tier 2 automation — Refinery Drone tasks + zones (Spec 04)** — Phase 2 graduation event is "first automated circuit runs." Without FUEL/EMPTY task logic and zone AUTO-HARVEST-SUPPORT, players never experience the "relief" pillar. **BLOCKER for Phase 2 closure.**
5. **Multi-planet logistics (Spec 07/09)** — Phase 4 cross-planet economy is impossible without cargo routing. **BLOCKER for Phase 4+.**
