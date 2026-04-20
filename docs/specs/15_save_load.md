# Spec 15 — Save / Load System

**Context:** VoidYield is a session-persistent game where offline simulation matters. The save/load system must capture the full state of a multi-planet empire, support autosave and scene-change saving, and seed the offline simulation on load. Prestige (sector reset) partially clears save data — the spec defines exactly what resets and what persists. The implementation extends the existing `autoloads/save_manager.gd`.

---

## Dependencies

- `09_planets.md` — prestige system: what resets vs. persists; survey data carryover rules
- `14_ui_systems.md` — offline event log is triggered on load from `offline_event_log.gd`; simulation method in §5 Implementation Notes
- `03_harvesters.md` — harvester states (fuel, hopper, degradation) are serialized
- `07_logistics.md` — active trade routes and ship states are serialized
- `06_consumption.md` — population tiers and need satisfaction timers are serialized
- `11_tech_tree.md` — tech tree unlock state is serialized; prestige resets all but one retained node

---

## 1. What Is Serialized — Complete List

The save file captures the following. All fields are required unless marked optional.

### World State
- `deposit_map` — per planet: array of deposit instances (position, ore_type, attributes dict, concentration_map seed, total_yield, remaining_yield, is_exhausted)
- `survey_waypoints` — per planet: array of placed survey markers (position, ore_type, concentration, grade, analysis_complete bool)
- `current_planet` — the planet the player is currently on (string id)
- `phase_flags` — dict of `{planet_id: phase_int}` for each planet's current phase (0–5)

### Harvesters
- `harvester_states` — per planet: array of harvester instances (harvester_id, type, position, fuel_remaining, hopper_contents dict, efficiency_pct, is_running, target_deposit_id)

### Drone Fleet
- `drone_task_queues` — per planet: array of `{drone_id, type, task_queue array, current_task, zone_assignment}`

### Factories
- `factory_states` — per planet: array of factory instances (building_id, type, active_recipe, input_stockpile dict, output_buffer dict, is_running, retooling_timer)

### Logistics
- `active_trade_routes` — array of trade route instances (route_id, source_planet, dest_planet, outbound_manifest, return_manifest, dispatch_condition, assigned_ship_id)
- `ship_fleet` — array of ship instances (ship_id, type, route_id, current_leg, cargo_manifest, fuel_remaining, trip_count, degradation_pct, position_progress_0_to_1)

### Population & Consumption
- `population_data` — per planet: `{tier: string, count: int, housing_capacity: int, luxury_satisfaction_timer_seconds: float}`
- `need_satisfaction_state` — per planet: dict of `{resource: supply_pct}` at time of save

### Research
- `research_points` — current RP total (float)
- `tech_tree_unlocks` — array of unlocked node IDs (strings)

### Economy
- `stockpile_quantities` — per planet: dict of `{resource_id: quantity}`; preserves quality lot metadata as a nested array per resource
- `credits` — player's current credit balance (float)

### Meta
- `last_save_timestamp` — Unix timestamp (int) at time of save; used by offline simulation
- `sector_number` — current sector (int, increments on prestige)
- `sector_bonuses` — array of active prestige bonus IDs (strings)
- `crafting_schematics_known` — array of schematic IDs unlocked; persists across prestige

---

## 2. Save Format

Saves are stored as JSON in Godot's user data directory:

```
user://savegame.json
```

The file mirrors the existing SaveManager pattern in `autoloads/save_manager.gd`. The top-level JSON object uses the sections above as keys:

```json
{
  "format_version": 1,
  "last_save_timestamp": 1745000000,
  "sector_number": 1,
  "current_planet": "a1",
  "phase_flags": { "a1": 2, "planet_b": 0, "planet_c": 0, "a3": 0 },
  "credits": 4820.5,
  "research_points": 347.0,
  "tech_tree_unlocks": ["1.1", "1.A", "1.B", "2.P"],
  "sector_bonuses": ["veteran_miner"],
  "crafting_schematics_known": ["gas_canister", "drill_bit_mkii"],
  "stockpile_quantities": {
    "a1": {
      "vorax_ore": {"total": 450, "lots": [{"quantity": 450, "attributes": {"OQ": 620, "FL": 810}}]}
    }
  },
  "deposit_map": { "a1": [ ... ], "planet_b": [ ... ] },
  "survey_waypoints": { "a1": [ ... ] },
  "harvester_states": { "a1": [ ... ] },
  "drone_task_queues": { "a1": [ ... ] },
  "factory_states": { "a1": [ ... ] },
  "population_data": { "a1": { "tier": "colonist", "count": 22, "housing_capacity": 30, "luxury_satisfaction_timer_seconds": 0.0 } },
  "need_satisfaction_state": { "a1": { "compressed_gas": 1.0, "water": 0.87, "processed_rations": 1.0 } },
  "active_trade_routes": [ ... ],
  "ship_fleet": [ ... ]
}
```

---

## 3. Autosave Behavior

Autosave triggers on:
1. **Every 5 real-time minutes** while the game is running (timer-based)
2. **On every scene change** — specifically on planet travel (before the travel animation plays)

Autosave writes the same `user://savegame.json` file (single slot — no rotation). A brief "SAVING…" icon appears in the HUD corner for 1 second on autosave completion.

There is no manual "Save" menu — players cannot trigger a save manually, and there is no multi-slot system in v1. (Future consideration: multi-slot and cloud sync.)

---

## 4. On Load — Offline Simulation Sequence

When `load_game()` is called:

1. Read `user://savegame.json` and deserialize into a `SaveData` resource
2. Validate format version; if mismatched, show upgrade/reset prompt
3. Calculate offline duration: `current_unix_time - last_save_timestamp`
4. Call `offline_event_log.gd` with the deserialized state and offline duration
   - Offline simulation runs (stepwise 30-second intervals, max 960 steps / 8 hours — see `14_ui_systems.md` §5)
   - Returns `{updated_state: SaveData, events: Array}` — the updated state reflects ore accumulated, credits earned, stalls recorded
5. Apply `updated_state` to all autoloads (GameState, consumption_manager, logistics_manager, fleet_manager, zone_manager)
6. Set `last_save_timestamp` to current time and save immediately (so next load calculates from now)
7. Show Offline Event Log panel with the `events` array (see `14_ui_systems.md` §8)
8. HUD loads normally after player dismisses the Offline Event Log

---

## 5. Prestige Partial Persistence

On sector complete and prestige selection, `reset_to_defaults()` is called with a `prestige_context` dict. This controls what clears vs. persists:

### What Resets (cleared to zero / empty on prestige)
- All stockpile quantities (every planet)
- All factory states (buildings removed)
- All harvester states (buildings removed)
- All drone task queues (fleet cleared)
- All ship fleet and trade routes
- Population data (all planets reset to 4 Pioneers)
- Credits (reset to starting amount: 200 CR)
- Tech tree unlocks — **except** the one "retained node" selected at prestige by the player
- Research points (reset to 0, THEN add prestige RP bonus — see below)
- Phase flags (all planets reset to Phase 0)
- Cargo Ship Bay and Launchpad building states

### What Persists (carried into new sector)
- `sector_bonuses` — stacks additively; each prestige adds one bonus
- `crafting_schematics_known` — all schematics learned in any prior sector are always known
- Survey waypoints — carried over for all planets **except Planet C** (Planet C deposits shift and carried data is immediately stale — Planet C must be re-surveyed each sector; see `09_planets.md` §5)
- The one retained tech node selected at prestige screen (chosen from previously unlocked nodes)
- **Prospector's Memory** sector bonus (if selected): additionally persists all survey waypoints for A1 and Planet B
- **Research Heritage** sector bonus (if active): new sector starts with RP = 10% of previous sector's total RP earned (rounded down, minimum 0)
- **Custodian bonuses** (any sector bonus that grants a starting buff): applied fresh at new sector start
- Sector Records (best times, highest quality deposits found, max credits earned — stored in `user://records.json`, never reset)

---

## 6. Godot Implementation

### File Location

Extend existing `autoloads/save_manager.gd`. All save/load logic lives here. Do not scatter serialization across individual building or drone scripts — each system exposes a `serialize()` / `deserialize(data)` method that `save_manager.gd` calls.

### SaveData Resource Class

Define `scripts/resources/save_data.gd` as a GDScript resource (extends Resource). This is NOT a `.tres` file — it's a plain dictionary wrapper populated by `save_manager.gd` from JSON and passed to systems:

```gdscript
# scripts/resources/save_data.gd
class_name SaveData
extends Resource

var format_version: int = 1
var last_save_timestamp: int = 0
var sector_number: int = 1
var current_planet: String = "a1"
var phase_flags: Dictionary = {}
var credits: float = 200.0
var research_points: float = 0.0
var tech_tree_unlocks: Array = []
var sector_bonuses: Array = []
var crafting_schematics_known: Array = []
var stockpile_quantities: Dictionary = {}
var deposit_map: Dictionary = {}
var survey_waypoints: Dictionary = {}
var harvester_states: Dictionary = {}
var drone_task_queues: Dictionary = {}
var factory_states: Dictionary = {}
var population_data: Dictionary = {}
var need_satisfaction_state: Dictionary = {}
var active_trade_routes: Array = []
var ship_fleet: Array = []
```

### Key Functions

```gdscript
# autoloads/save_manager.gd

func save_game() -> void:
    var data := SaveData.new()
    # Populate data from all autoloads and game state
    data.last_save_timestamp = int(Time.get_unix_time_from_system())
    data.credits = GameState.credits
    data.research_points = TechTree.research_points
    data.tech_tree_unlocks = TechTree.unlocked_nodes
    data.stockpile_quantities = GameState.serialize_stockpiles()
    data.deposit_map = DepositMap.serialize()
    data.survey_waypoints = DepositMap.serialize_waypoints()
    data.harvester_states = GameState.serialize_harvesters()
    data.drone_task_queues = FleetManager.serialize()
    data.factory_states = GameState.serialize_factories()
    data.population_data = ConsumptionManager.serialize_population()
    data.need_satisfaction_state = ConsumptionManager.serialize_needs()
    data.active_trade_routes = LogisticsManager.serialize_routes()
    data.ship_fleet = LogisticsManager.serialize_fleet()
    data.phase_flags = GameState.phase_flags
    data.sector_bonuses = SectorManager.active_bonuses
    data.crafting_schematics_known = CraftingSystem.known_schematics
    data.sector_number = SectorManager.sector_number
    data.current_planet = GameState.active_planet
    # Write JSON
    var json_string := JSON.stringify(inst_to_dict(data))
    var file := FileAccess.open("user://savegame.json", FileAccess.WRITE)
    file.store_string(json_string)
    file.close()
    emit_signal("game_saved")

func load_game() -> void:
    if not FileAccess.file_exists("user://savegame.json"):
        reset_to_defaults()
        return
    var file := FileAccess.open("user://savegame.json", FileAccess.READ)
    var json_string := file.get_as_text()
    file.close()
    var parsed = JSON.parse_string(json_string)
    if parsed == null:
        push_error("SaveManager: corrupt save file")
        reset_to_defaults()
        return
    var data := SaveData.new()
    dict_to_inst(parsed, data)
    # Run offline simulation
    var offline_duration := int(Time.get_unix_time_from_system()) - data.last_save_timestamp
    var sim_result := OfflineEventLog.simulate(data, offline_duration)
    data = sim_result.updated_state
    # Apply state to all systems
    _apply_save_data(data)
    # Show Offline Event Log
    OfflineEventLog.show_panel(sim_result.events)
    emit_signal("game_loaded")

func reset_to_defaults(prestige_context: Dictionary = {}) -> void:
    # Clear all game state; apply prestige_context for partial persistence
    pass  # Full implementation: clear each autoload, then re-apply persisted fields
```

### Key Signals

```gdscript
# save_manager.gd
signal game_saved
signal game_loaded
signal prestige_reset_complete(sector_number: int)
```

---

## 7. Implementation Order

1. Define `SaveData` resource class (`scripts/resources/save_data.gd`) with all fields
2. Wire autosave timer in `save_manager.gd` — 5-minute interval using `Timer` node in autoload
3. Wire scene-change save — connect to planet travel signal in `stranding_manager.gd`
4. Implement `save_game()` — serialize each system in dependency order:
   a. GameState (credits, phase flags, planet)
   b. DepositMap (deposit data, survey waypoints)
   c. GameState harvesters and factories
   d. FleetManager (drone queues)
   e. LogisticsManager (routes, fleet)
   f. ConsumptionManager (population, needs)
   g. TechTree (RP, unlocks, schematics)
5. Implement `load_game()` — deserialize, run offline simulation, apply to all systems
6. Implement `reset_to_defaults()` — prestige clear logic with `prestige_context` persistence rules
7. Validate save file format version; show upgrade or reset prompt on mismatch
8. Test: save with active empire, modify timestamp to simulate 4-hour offline, load — verify Offline Event Log shows correct events and state is applied correctly
