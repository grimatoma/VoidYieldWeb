# VoidYield — Implementation Roadmap

**Version:** 1.0  
**Date:** 2026-04-18  
**GDD version this tracks:** GAME_DESIGN.md v0.4

---

## Philosophy

Every milestone ends with a game you can actually play and test. Features ship in thin vertical slices — a harvester that works but has one tier and no polish is more useful than a perfectly designed harvester that isn't in the game yet. Systems are introduced at the earliest point they create interesting decisions, then deepened once their foundation is proven. Nothing waits for the whole game to be done.

---

## Milestone Overview Table

| Milestone | Codename | What you can do at the end | Key files touched |
|---|---|---|---|
| M0 | Engine Foundation | Game launches, saves, F11 works | `save_manager.gd`, `settings_manager.gd`, `main.tscn` |
| M1 | Walking Simulator | Move around Planet A1, see the world | `planet_a1.tscn`, `player.gd`, `camera_controller.gd` |
| M2 | First Ore | Mine ore by hand, sell it, watch credits tick | `deposit.gd`, `survey_tool.gd`, `inventory.gd`, `storage_depot.gd` |
| M3 | First Miner | Harvester fills hopper, you empty it manually | `harvester_base.gd`, `mineral_harvester.gd`, `gas_collector.gd` |
| M4 | First Drone | Scout Drone automates ore carry loop | `drone_base.gd`, `scout_drone.gd`, `drone_task_queue.gd`, `drone_bay.gd` |
| M5 | First Factory | Ore Smelter converts Vorax to Steel Bars | `processing_plant.gd`, `industrial_site.gd`, `schematic.gd` |
| M6 | Tech Gates | RP accumulates, first upgrades unlock | `research_lab.gd`, `tech_tree.gd`, `tech_node.gd` |
| M7 | Colony Pressure | Pioneers consume gas, productivity drops when supply fails | `consumption_manager.gd`, `habitation_module.gd` |
| M8 | Full Automation | Drone circuit runs FUEL→EMPTY→CARRY without you | `refinery_drone.gd`, `zone_manager.gd`, `fleet_manager.gd` |
| M9 | Deep Industry | Fabricators + quality attributes flow through pipeline | `fabricator.gd`, `quality_lot.gd` full implementation |
| M10 | Second World | Launch rocket, reach Planet B, survive stranding | `launchpad.gd`, `rocket_component.gd`, `planet_b.tscn`, `stranding_manager.gd` |
| M11 | Space Race | Visit A2, dispatch first Cargo Ship, A3 gate unlocks | `planet_a2.tscn`, `cargo_ship.gd`, `trade_route.gd` |
| M12 | Tech Tree v2 + Colony v2 | Full tech tree, population climbs to Engineers | `tech_tree.gd` full, `survey_tool.gd` Tier II+III, `speeder.gd` |
| M13 | Logistics v3 + Multi-planet Economy | Auto-dispatch, Drone Freight Lanes, Jump Relays, Planet C | `logistics_manager.gd`, `jump_relay.gd`, `planet_c.tscn` |
| M14 | Endgame & Prestige | Warp Gate, Galactic Hub, prestige bonus stacking | `assembly_complex.gd`, `sector_manager.gd`, `planet_a3.tscn` |

---

## Milestones (detailed)

---

### M0 — Engine Foundation

*Goal: the project runs, saves, and loads. Nothing to play yet.*

**Spec references:** spec 15 (`save_manager.gd` pattern), spec 16 (input map), existing `settings_manager.gd`

**What to build:**

- **Save/load skeleton** (`save_manager.gd`): write and read `user://savegame.json` as spec 15 defines. Start with just `{ "credits": 0, "format_version": 1 }`. Every field in the full spec 15 serialized state list gets a slot in the schema now, filled with defaults, so nothing needs a breaking format change later. Add autosave timer (5-minute interval signal) wired but not yet firing anything useful.

- **Input map** (`project.godot` InputMap section): define all 20 bindings from spec 16 — WASD/Arrows, E, Q, Z, R, T, F, G, L, P, O, B, I, J, Tab, ESC, F11, mouse buttons, scroll. Most actions do nothing yet; the point is reserving the keys so no spec violation creeps in. Controller mappings defined in code too.

- **Settings manager** (`settings_manager.gd`, already partially done): wire F11 to `DisplayServer.window_set_mode()` toggling fullscreen, ESC to pause tree, audio bus stubs for Music/SFX/UI channels. Persist settings to `user://settings.cfg` (separate from save data).

- **Main scene scaffold** (`main.tscn`): one Node2D root, a Camera2D child with zoom limits (0.5× – 2.0×), a placeholder `ColorRect` world background (`#0D1B3E` per spec 13), and empty `HUD` CanvasLayer. Autoload registrations: `SaveManager`, `SettingsManager`.

- **CI smoke test**: game opens, `SaveManager.save_game()` writes a file, `SaveManager.load_game()` reads it without errors, F11 toggles fullscreen, ESC pauses.

**Playtest check:** Game launches to a navy blue screen. F11 toggles fullscreen without crashing. ESC opens a pause overlay. Closing and reopening the game doesn't error. No gameplay yet.

---

### M1 — Walking Simulator

*Goal: Planet A1 exists and you can walk around it.*

**Spec references:** spec 17 (A1 layout, 2,800 × 2,000 px), spec 16 (WASD movement), spec 13 (art palette), spec 09 (A1 identity)

**What to build:**

- **Player character** (`player.gd`, `CharacterBody2D`): WASD/Arrow movement at 200 px/s base speed. Sprite placeholder (32×32 white square). Collision shape. No interaction yet.

- **Camera** (`camera_controller.gd`, `Camera2D`): follows player, clamped to world bounds. Mouse-scroll zoom (spec 16: Mouse Scroll). Middle-mouse drag pan. Zoom range 0.5×–3×.

- **A1 world scene** (`planet_a1.tscn`): 2,800 × 2,000 px world (spec 17). No terrain tiles yet — flat `TileMap` or plain `ColorRect` floor. Place 6 `IndustrialSite` node stubs at approximate positions from spec 17 (A1-S1 through A1-S6). Each `IndustrialSite` node: `site_id`, `is_occupied = false`, yellow debug rectangle.

- **`IndustrialSite` node** (`industrial_site.gd`): just the data class with `site_id: String`, `is_occupied: bool`, `occupy(building)` / `free_site()` methods. Used by every building system downstream.

- **Minimap stub** (`minimap.gd`, `SubViewport` + `Camera2D`): renders world at 15% zoom in a fixed HUD corner. No icons yet.

- **World border collision**: `StaticBody2D` walls at world edges so the player can't walk off.

**Autoloads added:** none yet.

**Playtest check:** Game loads Planet A1. Player walks around with WASD. Camera follows. 6 yellow rectangles mark Industrial Sites. Minimap shows player dot moving. Player can't walk off the edge.

---

### M2 — First Ore

*Goal: ore deposits exist, you can mine them manually, sell ore, see credits go up.*

**Spec references:** spec 01 (deposit data model, quality lot), spec 02 (survey tool Quick Read, waypoint), spec 17 (A1 deposit positions), spec 12 (sell prices: Vorax 1 CR/unit, Krysite 5 CR/unit)

**What to build:**

- **`deposit.gd`** (Resource class, spec 01 §1): fields: `deposit_id`, `ore_type` (enum: VORAX, KRYSITE, GAS), `position: Vector2`, `concentration_peak: float` (0–100), `yield_remaining: int`, `size_class` (SMALL/MEDIUM/LARGE). No quality attributes yet — those come in M9. Seed A1 with 4–5 Vorax deposits and 1–2 Krysite from `data/deposits_a1.json` (create stub JSON with fixed positions per spec 17 layout: Outer Ring Krysite, Inner Field Vorax clusters).

- **`deposit_map.gd`** (Autoload, spec 01): loads `data/deposits_a1.json`, instantiates `Deposit` nodes. Provides `get_nearest_deposit(pos, radius)`. Persisted in save data (M0 schema slot).

- **`quality_lot.gd`** (Resource class, spec 01): `ore_type`, `quantity: int`, `attributes: Dictionary` (empty dict for now, filled at M9). All ore pickups use this class — it's the unit of currency through the whole pipeline.

- **Survey Tool v1** (`survey_tool.gd`, `survey_tool.tscn`, equippable): press Q to toggle. While active, HUD border pulses cyan (#00B8D4, spec 14). Within 30 px of a deposit (Tier I radius, spec 02): display ore type text popup. No scan stages yet. Press Q again or ESC to unequip.

- **`survey_waypoint.gd`** + `survey_waypoint.tscn` (spec 02): world-space icon (small colored square per ore type color in spec 13) + minimap dot. Placed by pressing E while Survey Tool shows a deposit ping. `survey_journal.gd` records it.

- **Manual mining** (on `player.gd`): press E within 20 px of a surveyed deposit (waypoint required). 1.5-second hold animation. Extracts 3 units as a `QualityLot`. Adds to player inventory. Deposit `yield_remaining` decreases.

- **`inventory.gd`** (Autoload): stores `Array[QualityLot]`. Press I to open `inventory_panel.tscn` — simple list of ore type + quantity. Carry limit: 10 units base (spec 11: Cargo Pockets adds 5/level).

- **`storage_depot.gd`** + `storage_depot.tscn`: one placed in A1 center. Press E within 20 px: transfer all inventory to depot stockpile. Add "SELL ALL" button: converts stockpile to credits at spec 12 prices (Vorax 1 CR/unit, Krysite 5 CR/unit). Credits counter in HUD (top-left).

- **HUD credits display** (`hud.tscn` CanvasLayer): top-left label showing "Credits: 0 CR". Updates on every credit change.

- **Save extends** (M0 schema): add `credits`, `inventory`, `survey_waypoints`, `deposit_yield_remaining` per planet to save JSON.

**Playtest check:** Walk to a Vorax deposit. Equip survey tool (Q), see cyan border pulse, get ore type ping. Press E to place waypoint. Unequip (Q). Walk to waypoint, press and hold E to mine 3 units. Open inventory (I), confirm ore present. Walk to Storage Depot, sell, watch credits increase by 3 CR. Save and reload — credits and waypoint persist.

---

### M3 — First Miner

*Goal: place a harvester on a deposit, watch it fill automatically, collect the ore manually.*

**Spec references:** spec 03 (harvester system, BER formula, hopper/fuel), spec 02 (Full Scan for deposit survey), spec 17 (A1 gas deposit positions), spec 12 (gas economy: Personal Gas Collector ≈ 90 gas/hr at 50% concentration)

**What to build:**

- **Survey Tool v2** (`survey_tool.gd` update): Full Scan stage (stand still 6 s while survey mode active, spec 02). Reveals deposit `size_class` + concentration peak %. UI: result card (`survey_result_card.gd`, `survey_result_card.tscn`) — ore type, grade (just OQ grade at this stage: C/B/A), size, concentration %. Waypoint now stores these fields. `survey_journal.gd` panel ([J] key): list of all waypoints with their result cards.

- **`gas_collector.gd`** + `gas_collector.tscn` (spec 03): self-powered (no fuel needed). Place on a gas deposit survey waypoint. Extraction rate: `BER(6) × (concentration/100)` units/min. Stores gas in internal hopper (200-unit cap). Player empties by pressing E. One Gas Collector placed in A1 scene by default so the player always has a gas source. Cost: 100 CR + 8 Steel Plates (buy from depot for now).

- **`harvester_base.gd`** (spec 03): base class. Fields: `hopper_current: int`, `hopper_capacity: int`, `fuel_current: float`, `fuel_per_hour: float`, state enum (RUNNING, FUEL_EMPTY, HOPPER_FULL, IDLE). Each tick: if fuel > 0 and hopper < capacity, run BER formula (simplified: `BER × (concentration/100)` — FL attribute added M9). Deplete fuel. If fuel hits 0 → FUEL_EMPTY state.

- **`mineral_harvester.gd`** + `personal_mineral_harvester.tscn` (spec 03 tier 1): BER=5, hopper capacity=500, gas consumption=3/hr. Must be placed within 20 px of a survey waypoint. Building placement UI (`building_placer.gd`): click an `IndustrialSite` node in world, select "Personal Mineral Harvester" from radial menu, costs 150 CR + 10 Steel Plates. Instant build. Visual: grey box with drill animation.

- **Gas Canister item** (`gas_canister.gd`): stackable item, 50 gas each. Player crafts at Crafting Station or buys from depot (5 CR each). Carry up to 3 in inventory slot.

- **`crafting_station.gd`** + `crafting_station.tscn` (spec 05 minimal): one placed in world. Press E: opens simple recipe list. Initially: Gas Canister (free, just bundles gas from inventory). No Industrial Site slot required (spec 12).

- **Harvester UI feedback** (spec 14): each harvester has a floating HUD element showing hopper fill bar (green → orange at 80% → red at 95%) and fuel icon. When FUEL_EMPTY: alarm icon pulses yellow on minimap. When HOPPER_FULL: full icon. Press E on harvester to either: refuel (if player holding Gas Canisters) or empty hopper (transfer ore to player inventory, then walk to depot to sell).

- **Steel Plates prerequisite**: Ore Smelter is M5, so Steel Plates for harvester cost need to be purchasable at depot for now (5 CR each) — placeholder until factory comes online.

**Autoloads updated:** `DepositMap` now tracks which deposits have harvesters.

**Playtest check:** Survey a Vorax deposit (hold still 6 s, see result card). Build a Personal Mineral Harvester on it. Build/buy a Gas Collector on a nearby gas deposit. Empty the Gas Collector's hopper into Gas Canisters. Walk to the Mineral Harvester and refuel it. Watch the hopper fill over 2–3 minutes. Press E to empty it. Sell ore. Income is noticeably faster than hand-mining.

---

### M4 — First Drone (Logistics v1)

*Goal: one Scout Drone hauls ore from a harvester to storage without you touching it.*

**Spec references:** spec 04 (drone roster, MINE/CARRY tasks, Drone Bay), spec 13 (drone trail color: blue #2196F3 for Scout)

**What to build:**

- **`drone_base.gd`** (`CharacterBody2D` or `Area2D`, spec 04): fields: `drone_type`, `carry_capacity: int`, `speed: float`, `current_task: DroneTask`, `cargo: QualityLot`. State machine: IDLE → MOVING_TO_TARGET → EXECUTING → RETURNING → IDLE. Navigation via `NavigationAgent2D` (Godot 4 NavMesh, bake a flat A1 nav region for now).

- **`scout_drone.gd`** (spec 04): speed=60 px/s, carry=3, cost=25 CR. Purchases from Drone Bay: simple transaction, instantiates drone in the Drone Bay building's scene.

- **`drone_task_queue.gd`** (spec 04): mixin. `task_queue: Array[DroneTask]` (max 5). `DroneTask` resource: `type` (MINE, CARRY, IDLE), `target_node: NodePath`, `quantity: int`. Execute head of queue, pop when done.

- **MINE task**: drone navigates to a deposit node, "drills" for 2 s, adds `QualityLot` (3 units) to cargo. Plays mining spark particle (`CPUParticles2D`, orange sparks, spec 13 Vorax color).

- **CARRY task**: drone navigates to Storage Depot, deposits cargo. Storage Depot accumulates stockpile. Sell button still manual.

- **`drone_bay.gd`** + `drone_bay.tscn` (spec 04): occupies 1 Industrial Site slot. Service radius: 400 px. Contains: owned drone list, purchase UI (Scout Drone 25 CR). Press E on Drone Bay → open fleet panel stub.

- **Direct tasking UI** (spec 04 Tier 1): click a drone to select it. Click on a deposit node: "Assign MINE task" context menu. Click on Storage Depot: "Assign CARRY task". Queue shown as icon strip under the drone.

- **`zone_manager.gd`** (Autoload, spec 04): empty implementation, just the singleton. `fleet_manager.gd` (Autoload): tracks all drones, provides `get_all_drones()`. Both autoloads registered now so every downstream system can reference them.

- **Traffic Overlay v1** ([T] key, spec 14): toggles colored trail behind each moving drone (0.3 s `Line2D` fade). Scout/Heavy = blue #2196F3. One-line implementation: every drone emits `global_position` each physics frame; `TrafficOverlay` records last 10 positions as a polyline.

- **HUD drone count**: "Drones: 1/3" (1 active, 3 base cap per spec 04).

**Autoloads added:** `ZoneManager`, `FleetManager`.

**Playtest check:** Buy a Scout Drone from the Drone Bay. Click the drone, click a Vorax deposit, assign MINE task. Click the drone again, click Storage Depot, assign CARRY task. Watch the drone loop: mine → carry → mine. Toggle traffic overlay (T) to see its trail. Credits accumulate automatically (sell button still manual).

---

### M5 — First Factory (Crafting v1)

*Goal: one Processing Plant recipe works end-to-end. Selling Steel Bars instead of raw Vorax.*

**Spec references:** spec 05 (Processing Plants, Ore Smelter: Vorax → Steel Bars 12/min), spec 12 (sell prices: Vorax 1 CR/unit raw, Steel Plate 5 CR/unit refined), spec 09 (Industrial Site slot: Processing Plant = 1 slot)

**What to build:**

- **`schematic.gd`** (Resource class, spec 05): `schematic_id`, `input_a: OreType`, `input_a_qty: int`, `input_b: OreType` (optional), `output_type: OreType`, `output_qty: int`, `rate_per_min: float`. Preloaded from `data/schematics.json`.

- **`processing_plant.gd`** + `processing_plant.tscn` (spec 05): occupies 1 Industrial Site slot. Single active schematic. Pulls `QualityLot` from connected storage, converts at `rate_per_min`, pushes output lot to connected storage. Recipe for this milestone: **Ore Smelter** (Vorax → Steel Bars, 12/min, 3 Power/sec).

- **Power system v1** (`power_manager.gd` stub): tracks Power balance. Solar Panel building (2 Power/sec, no Industrial Site slot, costs 50 CR + 5 Steel). Processing Plant draws 3 Power/sec. If power balance goes negative: buildings throttle to 50% rate. No blackout/shutdown yet — that's M7. Solar Panels placed in world without slots so players can always fix power easily.

- **Building placement flow** (extends M3 `building_placer.gd`): click vacant Industrial Site → radial menu shows available buildings with cost + slot count. Confirm → deduct credits + materials → building node instantiated, `IndustrialSite.occupy()` called.

- **Storage routing**: Storage Depot now has per-resource stockpile counters. Processing Plant has `input_node` and `output_node` references. Builder assigns these during placement (nearest depot within 200 px auto-linked, or player clicks to set).

- **Auto-sell toggle** on Storage Depot: checkbox "Auto-sell [Steel Bars]" — when checked, any Steel Bars added to stockpile are sold immediately at current price (5 CR/unit, spec 12). Vorax stays raw (1 CR/unit) until converted.

- **`industrial_site.gd`** extends: slot count enforcement. A1 has 6 slots. Processing Plant = 1 slot. If all 6 slots occupied, radial menu shows buildings greyed out with "No slots available."

- **Production Dashboard v1** ([P] key, spec 14): `production_dashboard.tscn` panel. Two resource rows: Vorax (production rate/min, stockpile qty) and Steel Bars (production rate/min, stockpile qty). Net delta shown. No "days to empty" yet.

- **Building visual feedback v1** (spec 14): Running = subtle smoke particle emitter (`CPUParticles2D`) active. Stalled = particles off, building desaturated via shader. No power = red tint.

**Autoloads added:** `PowerManager`.

**Playtest check:** Build a Solar Panel (power balance: +2). Build an Ore Smelter on A1-S1 (power: −1 net). Feed it Vorax from the drone carry loop. Enable auto-sell on Steel Bars. Watch income per minute increase ~5× vs. selling raw Vorax. Open Production Dashboard (P) to confirm rates. Run out of power by building 2 plants — watch them throttle.

---

### M6 — Tech Gates (Tech Tree v1)

*Goal: Research Points accumulate, a few key upgrades gate meaningful improvements.*

**Spec references:** spec 11 (tech tree branches, RP income, Research Lab cost: 1,500 CR + 30 Crystal Lattices), spec 03 (Research Lab node), spec 12 (Crystal Lattice at 30 CR/unit markup from Trade Hub = 900 CR total just for materials)

**What to build:**

- **Trade Hub** (`trade_hub.gd`, `trade_hub.tscn`): one placed in A1 world, no Industrial Site slot. Sells a fixed catalog of resources at 2–10× market price (spec 02: Crystal Lattices are "bought at heavy markup"). Initial catalog: Gas Canisters (5 CR), Steel Plates (15 CR), Alloy Rods (50 CR), Crystal Lattices (30 CR — markup on 8 CR base). This is the player's safety valve and the pressure that motivates Planet B.

- **`research_lab.gd`** + `research_lab.tscn` (spec 03, spec 11): occupies 2 Industrial Site slots. Cost: 1,500 CR + 30 Crystal Lattices. Produces 1.0 RP/min base. Sample analysis (spec 03): player carries an ore lot to the lab (press E), lab queues a 2-minute analysis, result reveals 3 highest attributes. Attribute names visible but values blank until M9's full attribute system.

- **`tech_tree.gd`** (Autoload, spec 11): loads node registry from `data/tech_tree.json`. Manages `unlocked_nodes: Dictionary`, `research_points: float`. Exposes `can_unlock(node_id)`, `unlock(node_id)`. Fires `node_unlocked` signal.

- **`tech_node.gd`** (Resource, spec 11): `node_id`, `branch` (1/2/3), `rp_cost`, `cr_cost`, `prerequisites: Array[String]`, `effect_type`, `effect_value`. Loaded from JSON.

- **Tech Tree panel** (`tech_tree_panel.tscn`, [J] key second tab or dedicated panel): visual grid of nodes organized by branch. Available = bright; locked (prereqs unmet) = dim; unlocked = filled. Click → shows description + costs → "Unlock" button if affordable.

- **Early purchases wired** (no RP required, spec 11): implement as zero-RP tech nodes with CR cost only:
  - **Drill Bit Mk.II** (50 CR): manual mine time 1.5 s → 0.75 s
  - **Cargo Pockets Mk.I** (75 CR): carry limit +5 (buy up to 3 times)
  - **Thruster Boots** (60 CR): player move speed +20%

- **First real tech nodes** (require RP):
  - **1.1 Improved Drill Geometry** (50 RP, no CR): harvester BER +10%
  - **1.P Heavy Drone** (100 RP): unlocks Heavy Drone purchase at Drone Bay (150 CR, carry=10, spec 04)
  - **2.V Sample Analysis I** (100 RP): reduces lab analysis time to 60 s (from 2 min)
  - **3.1 Logistics I** (100 RP + 100 CR): fleet cap +1 (4 total per planet)

- **RP display in HUD**: "RP: 12.4 / 100 (1.0/min)" near credits.

- **Save extends**: add `research_points`, `tech_tree_unlocks` to save JSON.

**Autoloads added:** `TechTree`.

**Design note — Crystal Lattice gating**: the Research Lab's Crystal Lattice cost is intentional friction (spec phase 2). Players buying 30 lattices at 30 CR each = 900 CR just for materials, total cost ~2,400 CR. This is 2–3× the cost of harvesters they've bought so far. First time they feel a real resource constraint. The solution is either grind credits or push toward Planet B.

**Playtest check:** Buy Drill Bit Mk.II (50 CR) immediately — feel the mine speed improvement. Accumulate 2,400 CR, buy Crystal Lattices from Trade Hub, build Research Lab. Watch RP counter tick up. Spend 100 RP + 100 CR on Logistics I — fleet cap becomes 4. Buy a second Scout Drone. Unlock Heavy Drone (100 RP), buy one (150 CR).

---

### M7 — Colony Pressure (Population v1)

*Goal: Pioneers exist, consume gas, and the productivity multiplier makes supply failures feel real.*

**Spec references:** spec 06 (consumption system, Pioneer needs: Compressed Gas + Water, productivity multiplier table), spec 06 §3 (population growth: 1 Pioneer/90 s if needs met)

**What to build:**

- **`habitation_module.gd`** + `habitation_module.tscn` (spec 06): occupies 1 Industrial Site slot. Cost: 800 CR + 20 Steel + 10 Alloy. Capacity: 30 crew. Must be built before population exceeds 4 (starter crew) — building one is required for growth.

- **`consumption_manager.gd`** (Autoload, spec 06): tracks per-planet population tiers. Starts with 4 Pioneers. Each Pioneer consumes (spec 06): Compressed Gas 2/day + Water 1/day (1 in-game day = 20 real minutes). Pulls from storage stockpile each "day tick". Calculates `supply_pct` per need. Applies productivity multiplier per spec 06 table: 100% supply → 1.0×; 50% → 0.65×; 0% → 0.15×.

- **Productivity multiplier application** (spec 06): multiplier signal broadcast to `HarvesterBase` (affects BER), `ProcessingPlant` (affects output rate). Drone speed multiplier deferred to M8 (when drone circuit exists and the effect is visible).

- **Water production for A1**: design gap in specs (water source not explicitly defined for A1). Resolution for M7: Water Condenser building (no slot, 300 CR + 10 Steel, produces 5 water/day) — a placeholder building until spec is clarified. Flag this in a FIXME comment.

- **Gas Compressor** (`processing_plant.gd` new recipe): Raw Gas → Compressed Gas (10/min, 3 Power/sec, spec 05). Compressed Gas is what Pioneers consume. Players now need a gas-to-compressed-gas pipeline or they risk productivity collapse.

- **Population growth timer** (spec 06 §3): once Habitation Module built AND Pioneers' Basic Needs at 100% for a continuous period, a new Pioneer spawns every 90 real-time seconds up to housing capacity. Growth paused if needs unmet.

- **Population HUD panel**: "Pioneers: 4/30" + need satisfaction bars (Compressed Gas: 100% ✓, Water: 100% ✓). Color-coded per spec 13 UI accents (green/amber/red). Visible on HUD always, expandable.

- **Save extends**: add `population_data`, `need_satisfaction_state` to save JSON.

**Autoloads added:** `ConsumptionManager`.

**Playtest check:** Build Habitation Module. Build Gas Compressor (need to also build Ore Smelter if not already done — Compressed Gas needs raw gas input). Let Compressed Gas stockpile run empty. Watch harvester BER and factory rates drop to 65% (if 50% supply). Refill gas → rates recover. Build Water Condenser. Watch Pioneers grow from 4 to 7 over 4.5 minutes (90 s × 3).

---

### M8 — Full Automation (Drones v2 + Logistics v2)

*Goal: a drone circuit runs FUEL → EMPTY → CARRY without player intervention. Player can step back and watch.*

**Spec references:** spec 04 (Refinery Drone 75 CR, FUEL/EMPTY tasks; zone automation Tier 2; AUTO-HARVEST-SUPPORT behavior), spec 11 (1.Q Refinery Drone: 300 RP), spec 08 (Rover vehicle)

**What to build:**

- **`refinery_drone.gd`** (spec 04): speed=50 px/s, carry=8, cost=75 CR. Unlock: tech 1.Q (300 RP). Tasks: **FUEL** (carry Gas Canisters from Gas Collector hopper to target harvester), **EMPTY** (carry ore from harvester hopper to Storage Depot). These are the core maintenance tasks that end Phase 1 friction.

- **FUEL task logic**: Refinery Drone navigates to Gas Collector, picks up `min(carry_capacity, gas_available)` units of gas, navigates to assigned harvester, deposits gas. Gas Canisters abstracted — drone carries gas units directly, no item object needed.

- **EMPTY task logic**: drone navigates to harvester, picks up ore lots (up to carry cap), navigates to nearest Storage Depot, deposits.

- **Circuit scheduling** (in `drone_task_queue.gd`): queue type CIRCUIT — repeating task loop. Player assigns a circuit to a Refinery Drone: pick fuel source, pick harvester, pick deposit target. The drone loops forever. Interrupt button in fleet panel.

- **`zone_manager.gd`** proper implementation (spec 04 Tier 2): zone paint tool ([Z] key, already in input map). Player draws rectangular zone over a set of harvesters. Zone types for this milestone: **AUTO-HARVEST-SUPPORT** (Refinery Drones within service radius automatically handle FUEL + EMPTY for all harvesters in zone). Zone assignment UI: click zone → "Assign Drone" → select drone from list.

- **Heavy Drone** (`heavy_drone.gd`, spec 04): speed=40 px/s, carry=10, cost=150 CR. Unlock: tech 1.P (100 RP, already available since M6). MINE task only at this stage.

- **Coverage Overlay** ([B] key, spec 14): shows each Drone Bay's 400 px service radius as a colored circle. Overlapping radii shown as blended region. Helps player see coverage gaps.

- **Fleet Panel** ([T] key, spec 14): panel listing all drones, their current task, and circuit status. [F] key: quick "Fleet Dispatch" — assigns all idle drones to their last circuit. Simple implementation: iterate `FleetManager.drones`, call `resume_circuit()` on each.

- **`fleet_manager.gd`** full implementation (spec 04): `add_drone()`, `remove_drone()`, `get_drones_by_type()`, `get_idle_drones()`. Fires `drone_state_changed` signal.

- **Rover vehicle** (`rover.gd`, `rover.tscn`, spec 08): player can enter/exit by pressing E near it. Speed 280 px/s (vs. 200 base). Carry +15. Fuel: 30 gas, depletes while moving. Park near Gas Collector to refuel. Cost: 300 CR. Garage building (`garage.gd`, 80 CR + 10 Steel, no Industrial Site slot).

- **Traffic Overlay update** (spec 14): Refinery Drone trails = green #4CAF50. All drone type colors per spec 13. Zone assignment animation: when drone is assigned to a zone, brief "converge then fan out" animation.

**Playtest check:** Set up AUTO-HARVEST-SUPPORT zone over 2 Mineral Harvesters. Assign a Refinery Drone. Walk away. Watch the drone handle FUEL and EMPTY automatically. Open traffic overlay (T) — see green Refinery trail, blue Scout trails. The harvesters never stall. Player earns credits without touching a button for 2 minutes.

---

### M9 — Deep Industry (Crafting v2 + Economy v1)

*Goal: Fabricators working, quality attributes flow through the pipeline, three-tier income is visible.*

**Spec references:** spec 05 (Fabricators, 2-input recipes, retooling; quality passthrough), spec 01 (11 attributes, OQ grade system), spec 11 (2.X Fabricator Unlock: 800 RP, 2.1 Metallurgy I: 200 RP + 400 CR), spec 12 (sell prices: Alloy Rod 20 CR, Crystal Lattice 30 CR)

**What to build:**

- **Quality attributes full implementation** (`deposit.gd` + `quality_lot.gd` update, spec 01): on deposit discovery (Full Scan at M3), roll all 11 attributes using spec 01 grade ranges. OQ, CR, CD, DR, FL, HR, MA, PE, SR, UT, ER. Store in `attributes: Dictionary`. Quality grade (F/D/C/B/A/S) derived from OQ range (spec 01: B = 600–799, A = 800–949). Grade colors per spec 13 applied to waypoint icons and result cards.

- **BER formula update** (`harvester_base.gd`): add FL attribute: `units_per_min = BER × (concentration/100) × (ER/1000) × upgrade_multiplier + (FL/1000 × BER × 0.5)` (spec 03 §1). Concentration peak from Full Scan now matters for income meaningfully.

- **Quality passthrough** (spec 05, spec 01): when ore is refined, the output `QualityLot.attributes` is a weighted average of input lot attributes. Processing Plant: output inherits input attributes 1:1. Fabricator: output attributes = weighted average of both inputs by quantity ratio. This makes hunting high-OQ deposits matter.

- **Alloy Refinery** (`processing_plant.gd` new recipe, spec 05): Krysite → Alloy Rods (6/min, 3 Power/sec). Now Krysite is worth 20 CR/unit refined vs. 5 CR raw. Requires Krysite deposits — already on A1 (Mid Belt, spec 17). Opens the Fabricator recipe chain.

- **`fabricator.gd`** + `fabricator.tscn` (spec 05): 2 Industrial Site slots. Requires tech 2.X (800 RP) to unlock, preceded by tech 2.1 Metallurgy I (200 RP + 400 CR). Input slots A + B. Pulls from storage. Produces output. Rate per spec 05 table. Retooling: [R] key near a Fabricator opens recipe swap UI. Retooling costs 500 CR + 30 min downtime.

- **First Fabricator recipes available at M9**:
  - Drill Head: Steel Bars + Alloy Rods → Drill Head (3/hr)
  - Sensor Array: Alloy Rods + Crystal Lattice → Sensor Array (2/hr) — still needs Crystal Lattice from Trade Hub or Planet B
  - Hull Plating: Steel Bars + Processed Resin → Hull Plating (4/hr)
  - Power Cell: Energy Shards + Crystal Lattice → Power Cell (5/hr)

- **Ore Refinery** (`ore_refinery.gd`, spec 05): batch refinery, accepts multiple input lots, produces single quality-weighted output. Lot priority selection: player can pin "use highest OQ first" or "use oldest first." Used for the ore-to-refined pipeline when quality routing matters.

- **Production Dashboard v2** ([P] key, spec 14): all tracked resources with production rate, consumption rate, net delta, days-to-empty. Red/green coding. Per-planet tabs (only A1 now). Drill-down: click a resource row to see which buildings contribute. "Crew/Consumption" tab: shows Pioneer needs met %.

- **Production Overlay** ([O] key, spec 14): world goes 70% desaturated. Each building shows colored status dot: 🟢 Running, 🟡 Partial, 🔴 Stalled, ⚫ Idle. Status icons above buildings (fuel canister, hopper fill, wrench). Immediately readable without opening a panel.

- **Auto-sell pipeline** (Trade Hub update): player can set per-resource price floors; auto-sell fires if stockpile exceeds threshold AND price is above floor.

- **Sample analysis v2** (`sample_analysis.gd`, spec 03): Research Lab analysis now reveals all attribute values (not just names). Lab analysis time reduced to 60 s (tech 2.V), 30 s (tech 2.W, 300 RP). Survey Journal shows full attribute breakdown for analyzed deposits.

**Playtest check:** Survey a B-grade Krysite deposit (OQ 620–720). Full Scan reveals concentration and grade. Place a Mineral Harvester. Feed Alloy Refinery with the Krysite output. Build a Fabricator (after earning 800 RP — takes ~13 hrs at 1 RP/min, or faster with Crystal Lattice consumption; player should have 2+ Research Labs by now). Set Fabricator to Sensor Array recipe. Sell Sensor Arrays. Open Production Overlay — all buildings green. Open Production Dashboard — see Krysite → Alloy Rod → Sensor Array pipeline with net delta for each.

---

### M10 — Second World (Planet B v1)

*Goal: build and launch a rocket, reach Planet B, survive stranding long enough to launch back.*

**Spec references:** spec 10 (spacecraft construction, 5 components, Launchpad), spec 09 (stranding: arrive with 20 RF, need 100 RF to escape; Planet B starting supplies), spec 17 (Planet B layout: 3,200 × 2,400 px, 14 Industrial Sites, cave entrances), spec 09 (Planet B survey range: −40%)

**What to build:**

- **Fuel Synthesizer** (`fuel_synthesizer.gd`, spec 05): Compressed Gas → Rocket Fuel (10 RF per 20 gas, rate: 4 RF/min, spec 12). Processing Plant variant. Players need ~200+ RF total for A1 launching operations.

- **`launchpad.gd`** + `launchpad.tscn` (spec 10): 3 Industrial Site slots (largest building on A1). Cost: 500 CR + 80 Steel + 30 Alloy + 20 Energy Cells. 5 component slots. Build time: 2 minutes. Visual: empty rocket frame, ghost silhouette visible immediately.

- **`rocket_component.gd`** (spec 10, Resource): carriable item. Fields: `component_type` (HULL/ENGINE/FUEL_TANK/AVIONICS/LANDING_GEAR), `quality_attributes: Dictionary`, `carry_slots_required: int`. Crafted at Crafting Station (schematic unlocked automatically when Launchpad is built).

- **5 component schematics** (`crafting_station.gd` update, spec 10):
  - Hull Assembly: 120 Steel + 10 Alloy (3 min), carries full inventory
  - Engine Assembly: 50 Steel + 20 Alloy + 10 Crystal (4 min), 5 carry slots
  - Fuel Tank: 40 Steel + 15 Alloy + 5 Energy Cells (2 min), 4 carry slots
  - Avionics Core: 15 Crystal + 10 Alloy + 5 Void Cores OR 20 Alloy fallback (5 min), 1 slot. Note: Void Cores from Voidstone (Planet B cave-only) aren't available yet, so fallback path (20 Alloy Rods) is the M10 path. Full Avionics quality requires Planet B materials.
  - Landing Gear: 20 Steel + 8 Alloy (90 s), 3 slots

- **Rocket assembly UI** (`rocket_assembly_panel.gd`, spec 10): checklist panel opens when near Launchpad. Each component row: "❌ Not installed" → "✅ Hull (Grade C, SR: 440)". Ghost rocket fills in as components attached (shader tween on mesh, spec 14). Rocket Fuel gauge: "0/100 RF" fills as player loads fuel canisters. LAUNCH button: greyed until all 5 components + 100 RF present.

- **Launch animation**: rocket ascent particle effect, screen fade, planet transition.

- **`planet_b.tscn`** (spec 17): 3,200 × 2,400 px. 14 IndustrialSite nodes placed. 4 cave entrances (`b_cave_entrance.tscn`, locked — require Crystal Bore tech 1.Z from M12). Gas deposits with PE 650–900 (high quality). Shards deposits. Aethite deposits (surface only for now — deep cave deposits unlock with Crystal Bore). Teal-purple ambient WorldEnvironment. Bio-Resin Flora zones (3 pre-placed, harvestable but no harvester drone task until M13).

- **`stranding_manager.gd`** (spec 09): on Planet B arrival, set `rocket_fuel_current = 20` (80 consumed in transit). Displays "STRANDED — Need 100 RF to launch" warning banner. Removes banner and enables LAUNCH button when `rocket_fuel_current >= 100`. Player must build Gas Collector + Fuel Synthesizer on Planet B to escape.

- **Planet B starting supplies** (spec 09): when player first arrives, spawn in inventory: Survey Tool Tier I, 5 Gas Canisters (250 gas), Personal Gas Collector deed, Personal Mineral Harvester deed, Crafting Station deed, 50 Steel Plates, 10 Alloy Rods, 200 CR. These deeds are single-use building spawners.

- **Planet B survey interference** (spec 09): Survey Tool effective radius reduced by 40% (Tier I: 30 px → 18 px). Shown in survey HUD as "Survey Range: 18px (atmospheric interference)".

- **Galaxy Map v1** ([G] key, spec 14): modal panel showing A1 and Planet B as nodes, connected by a route line. Current planet highlighted. "Travel" button appears on other planets once Launchpad + rocket ready.

- **Save extends**: add `current_planet`, per-planet `harvester_states` / `factory_states` / `stockpile_quantities`.

**Playtest check:** Craft all 5 rocket components (using fallback Avionics Core — no Void Cores yet). Load 100 RF at Launchpad. Launch to Planet B. See stranding warning (20 RF). Survey a gas deposit on Planet B. Build Gas Collector from deed. Build Fuel Synthesizer from deed. Wait ~30 min of gameplay for 100 RF. Launch back to A1 with Shards and Aethite in inventory. Sell Aethite at Trade Hub — first taste of Planet B resources.

---

### M11 — Space Race (Spacecraft v1 + Transit Asteroid)

*Goal: visit A2, dispatch the first Cargo Ship, and unlock the A3 gate.*

**Spec references:** spec 00 (A2 transit asteroid, Krysite/Vorax Grade B deposits, secret cache, gas depot), spec 07 (Cargo Ships, manual trade route, Bulk Freighter), spec 09 (A3 unlock: visited A2 + 10 Void Cores produced), spec 10 (Launchpad dual-use: Cargo Ship Bay)

**What to build:**

- **`planet_a2.tscn`** (spec 00): small 600 × 400 px asteroid scene. Two hand-harvest ore deposits: Krysite vein (Grade B, OQ 620–720, 80–120 units, respawns 60 min) and Vorax cluster (Grade B, OQ 600–680, 50–80 units, respawns 45 min). No Industrial Sites. No harvesters or factories.

- **`a2_gas_depot.gd`** (spec 00): static node. Stores 200 RF, regenerates 5 RF/hr. Cargo Ships auto-refuel here on A1↔Planet C routes (M13). For M11: player can manually dock Shuttle here to top up RF.

- **Secret cache** (`a2_cache.gd`, spec 00): hidden interact point, one-time. Triggers on E press within 15 px. Reward: 500 CR + 1× Grade A Krysite sample (OQ 820, FL 750, 15 units). Marked as "discovered" in save data — won't respawn on prestige.

- **A2 visit flag**: `a2_visited: bool` in save data. Set on first arrival. Checked as part of A3 unlock condition.

- **`cargo_ship_bay.gd`** + `cargo_ship_bay.tscn` (spec 07): built at Launchpad (Launchpad is dual-purpose, spec 10). Cost: 5,000 CR + 100 Steel + 30 Void Cores. 2 Industrial Site slots. Void Cores require Voidstone (Planet B cave-only) — players must have explored Planet B's surface Gas deposits and earned enough RP to unlock Crystal Bore (tech 1.Z, 400 RP + 1,500 CR) to reach Voidstone. This is the gating mechanism for M11.

- **Bulk Freighter construction** (spec 07): assembled at Cargo Ship Bay. Cost: 2,000 CR + 100 Steel + 30 Alloy. Build time: 5 minutes. Result: `cargo_ship.tscn` instance assigned to route.

- **`trade_route.gd`** (Resource, spec 07): `route_id`, `source_planet`, `destination_planet`, `cargo_class`, `ship_ref`, `dispatch_mode` (MANUAL for M11), `status` (ACTIVE/LOADING/DELAYED/STALLED). `logistics_manager.gd` (Autoload) stores all routes.

- **Manual trade route UI** ([L] key, spec 14 Logistics Overlay v1): panel listing active routes. "New Route" button: select source planet, destination planet, cargo class (Bulk = dry goods), assign ship. "SEND" button dispatches manually. Route status indicator per spec 07 table.

- **Cargo Ship behavior** (`cargo_ship.gd`): on dispatch, loads export buffer (up to hold capacity 1,200 units for Bulk), disappears from source world (in transit), reappears at destination after trip time (3–4 min real for A1↔B, spec 07). Deposits cargo at destination storage. Degradation counter ticks (breakdown check after 20 trips, spec 07 — no Repair Drone yet, just show warning).

- **A3 unlock check** (`tech_tree.gd` or `sector_manager.gd` update, spec 09): condition: `a2_visited AND void_cores_produced_total >= 10`. When met: A3 appears on Galaxy Map as a locked icon with "Unlock: conditions met" tooltip. Player visits to confirm unlock (Shuttle travel, costs RF).

- **Galaxy Map v2** ([G] key): shows A1, A2, Planet B. Route lines for active Cargo Ship routes. Animated ship icon on route line during transit. A3 node shown greyed-out with lock icon. Tooltip: "Void Cores produced: X/10" and "A2 visited: ✅/❌".

**Autoloads added:** `LogisticsManager`.

**Playtest check:** Unlock Crystal Bore (1.Z, 400 RP + 1,500 CR). Travel to Planet B, mine Voidstone from cave. Process into Void Cores (need Voidstone → Void Core recipe — this is the Crystal Harvester + Crystal Processor chain, spec 03/05). Accumulate 10 Void Cores (and 30 for Cargo Ship Bay). Build Cargo Ship Bay. Construct Bulk Freighter. Fly Shuttle to A2 — find secret cache (500 CR + Grade A Krysite). A3 unlocks on Galaxy Map. Dispatch Bulk Freighter A1→B loaded with Steel Plates. Check route status in Logistics panel ([L]).

---

### M12 — Tech Tree v2 + Colony v2

*Goal: full tech tree browsable, population climbs to Technicians, Survey Tool Tier II in hand.*

**Spec references:** spec 11 (all 50+ nodes, 3 branches), spec 06 (colony tiers 2–5, Colonist needs: Power Cells + Processed Rations; Technician needs: Bio-Circuit Boards), spec 02 (Survey Tool Tiers II–III), spec 08 (Speeder + Vehicle Survey Mount)

**What to build:**

- **Full tech tree UI** (`tech_tree_panel.tscn` update): render all 3 branches with dependency lines connecting nodes. Scrollable, zoomable panel. Branch headers: "Extraction", "Processing & Crafting", "Expansion". Node states: unlocked (filled), available (bright border), locked (dim). Tooltips show full effect description + prerequisite chain. RP cost visible on each node.

- **All 50+ tech nodes implemented** (spec 11): Wire effects for each node as it becomes relevant. Key new nodes for M12:
  - Branch 1: 1.2, 1.3, 1.4 (player mining chain), 1.A–1.H (drone drilling speed), 1.R Survey Drone unlock, 1.S–1.U drone speed upgrades, 1.X Drone Coordination (500 RP + 300 CR), 1.Y Fleet Automation (1,500 RP + 800 CR)
  - Branch 2: 2.1 Metallurgy I (200 RP + 400 CR), 2.A–2.C energy chain, 2.P auto-sell, 2.Q market prices, 2.R trade bonuses, 2.S Repair Drone (500 RP), 2.W Sample Analysis II (30 s), 2.X Fabricator Unlock (800 RP, prereq 2.1), 2.Y Drone Fabricator (3,000 RP)
  - Branch 3: 3.2–3.5 fleet caps (+2/+3/+5/+10), 3.A–3.C storage, 3.P Warp Theory (2,000 RP + 10 Void Cores produced prereq), 3.Q Auto-Dispatch (see M13), 3.R Cargo Drone unlock (1,000 RP), 3.S Survey Tool Mk.II (400 RP + 200 CR), 3.T Survey Tool Mk.III (1,500 RP + 500 CR), 3.X Research Lab Amplifier ×1.25, 3.Y Quantum Research ×1.75, 3.Z–3.Z3 fuel efficiency

- **Multiple Research Labs**: 3 labs achievable now; RP income: 1 lab=1.0 RP/min, 2=1.5, 3=1.75 (spec 11). Crystal Lattice consumption for instant +10 RP wired.

- **Survey Tool Tier II** (tech 3.S unlock, spec 02): radius 60 px (vs. 30), concentration accuracy ±5% (vs. ±15%). New result: Deep Scan stage (15 s hold still): reveals 3 highest attribute values. Update `survey_tool.gd`: if `upgrade_level >= 2`, enable deep scan stage. Survey Tool Tier III (tech 3.T): 120 px radius.

- **Speeder vehicle** (`speeder.gd`, `speeder.tscn`, spec 08): speed 520 px/s. Carry +10. Fuel: 20 gas. Craft at Garage: 20 Steel + 15 Alloy + 5 Crystal. Vehicle Survey Mount upgrade (600 CR + 5 Alloy, install at Garage): enables Full Scans while moving ≤50 px/s (spec 08). With this upgrade, surveying A1 systematically takes minutes instead of an hour on foot.

- **Colony tier advancement** (`consumption_manager.gd` update, spec 06): Tier 2 Colonists unlock when Pioneers have 100% Luxury Needs (Processed Rations) for 10 consecutive in-game minutes AND housing capacity exists. Escalating needs ladder per spec 06:
  - Colonists: Basic = Rations + Gas + Water; Luxury = Power Cells
  - Technicians: Basic = Power Cells + Rations + Gas; Luxury = Bio-Circuit Boards
  - Engineers: Basic = Bio-Circuits + Power Cells + Rations; Luxury = Warp Components
  - Directors: Basic = Warp Components + Bio-Circuits + Power Cells; Luxury = none

- **Processed Rations** (new Processing Plant recipe): add "Bio-Extractor" (Planet B Bio-Resin → Processed Resin, spec 05) and "Ration Synthesizer" (Processed Resin → Processed Rations). This creates first hard dependency on Planet B trade route being reliable.

- **Bio-Circuit Board** (Fabricator recipe, spec 05): Alloy Rods + Processed Resin → Bio-Circuit Board (3/hr). Required for Technician tier advancement. Requires Planet B Bio-Resin.

- **Survey Drone** (tech 1.R, spec 04): speed 35 px/s, carry 0, unlocks via tech tree. AUTO-SURVEY zone behavior: drone methodically covers zone grid, Quick Reads all deposits, marks waypoints automatically. This is the Phase 3 "survey automation" moment.

- **Production Dashboard update**: new tabs for each Planet B building category. Population productivity bar shown prominently. "Crew at risk" warning if any tier's needs fall below 75%.

**Playtest check:** Unlock Survey Tool Tier II (400 RP + 200 CR). Equip and explore A1 — 60 px radius reveals deposits you missed. Get a Deep Scan on a Vorax deposit — see OQ, ER, FL values. Advance Pioneers to Colonists by shipping Processed Rations from Planet B via Cargo Ship. Feel the productivity boost (+15% on average). Open the full tech tree — see all 3 branches, identify the Warp Theory path (needs 10 Void Cores + 2,000 RP).

---

### M13 — Logistics v3 + Multi-planet Economy

*Goal: cargo ships auto-dispatch on fill thresholds, Drone Freight Lanes run continuously, Planet C exists.*

**Spec references:** spec 07 (all 4 cargo ship types, auto-dispatch tech 3.Q, Drone Freight Lanes, Jump Relays), spec 04 (Cargo Drone unlock tech 3.R, 1,000 RP), spec 09 (Planet C identity, shifting deposits), spec 17 (Planet C: 4,000 × 3,000 px, 18 slots), spec 03 (Gas Trap, Resonance Charge Cracking)

**What to build:**

- **All 4 cargo ship types** (`cargo_ship.gd` type field, spec 07): Bulk Freighter (1,200 capacity, dry goods), Liquid Tanker (800 capacity, gas/Bio-Resin, 45 RF/trip), Container Ship (600 capacity, finished goods, requires 15 Void Cores), Heavy Transport (3,600 capacity, 90 RF/trip, requires 20 Void Cores). Cargo class enforcement: Liquid Tanker required for gas routes or they fail with error.

- **Auto-dispatch** (tech 3.Q unlock, spec 07): once unlocked, each route can set dispatch mode to AUTO (threshold-based: dispatch when hold ≥ 80% full). `logistics_manager.gd` checks fill level each game tick, fires dispatch if threshold met. Manual override always available.

- **Cargo ship degradation** (spec 07): after every 20 trips, `degradation_trips_counter` increments. At counter mod 20: 5% chance of BREAKDOWN mid-route. Breakdown: ship icon on Galaxy Map turns red, cargo lost (stored in "recovery pending" queue for 24 hrs in-game). Repair costs 5 Alloy Rods. Without Repair Drone, player must manually initiate repair from Cargo Ship Bay panel.

- **Repair Drone** (`repair_drone.gd`, spec 04): speed 90 px/s, carry 0. Unlock: tech 2.S (500 RP). Assigned to a route: auto-intercepts BREAKDOWN ships, spends 5 Alloy Rods from storage, restores ship to ACTIVE. First drone type that runs fully autonomously without player assignment.

- **`cargo_drone.gd`** (spec 04): speed 35 px/s, carry 20. Unlock: tech 3.R (1,000 RP). Used for Drone Freight Lanes only.

- **Automated Drone Freight Lanes** (`logistics_manager.gd` update, spec 07): new route type. Setup: [L] key → "New Lane" → pick source/destination nodes (buildings, not planets) → pick cargo class → assign Cargo Drones count. Lane runs continuously: cargo drones shuttle between nodes. No CR per trip (no RF needed). Throughput: 20 units/trip × drone count. This is the "Phase 4 logistics" system that replaces manual ship management for local intra-planet routes.

- **Jump Relay Module** (Assembly Complex recipe, spec 05, spec 07): Warp Capacitor + Sensor Array + Refined Alloy → Jump Relay Module (3-input, requires Assembly Complex from tech 2.Z). Jump Relay building (`jump_relay.gd`): costs 2 Jump Relay Modules + 500 CR. Provides instant transfer of up to 200 units/min (no liquids). 20 Power/sec draw. Range: planet-to-planet. **Prerequisite chain**: Assembly Complex requires tech 2.Z (1,200 RP + 2,000 CR), Warp Capacitor requires Void Core + Power Cell + Resonance Shard (Planet C).

- **`assembly_complex.gd`** + `assembly_complex.tscn` (spec 05): 3 Industrial Site slots. Tech 2.Z required. 3-input recipe processing. Proximity bonus: +10% throughput if all 3 input Fabricators within 80 px. Key M13 recipes: Rocket Engine, Navigation Core, Warp Capacitor, Jump Relay Module.

- **Logistics Overlay v2** ([L] key, spec 14): route health indicators. Route rows color-coded by status (ACTIVE=green, LOADING=blue, DELAYED=amber, STALLED=red, BREAKDOWN=flashing red). "STALLED" routes surface automatically when cargo hasn't moved for 2× expected cycle time. "VIEW BREAKDOWN" jumps to Cargo Ship Bay panel.

- **`planet_c.tscn`** (spec 17): 4,000 × 3,000 px. 18 Industrial Site nodes (6 Western, 6 Rift, 6 Eastern). Void-Touched Ore deposits everywhere (quality scrambled: OQ 150–950, no pattern). 6 Resonance Crystal formations (C-XTAL-1 to C-XTAL-6, 3–5 crack cycles each, finite per sector). 8 Dark Gas Geysers (fixed vent positions, eruption ~1/8 min). No standard gas deposits.

- **Planet C shifting deposits** (spec 17): Void-Touched Ore concentration re-rolls every 2–4 in-game hours (±30% shift). `deposit_map.gd` update: on re-roll, fire `deposit_shifted` signal. Survey waypoints for those deposits get "RESURVEY" badge in Journal.

- **`gas_trap.gd`** (spec 03): Planet C only. Placed over a geyser vent. Captures Dark Gas on eruption event. No continuous rate — burst collection.

- **Resonance Charge Cracking** (`crystal_harvester.gd` variant, spec 03): placed at a Resonance Crystal formation. Uses "charges" (consumable item, crafted from Compressed Gas + Steel). Each charge cracks 3–5 crack cycles of yield (spec 17: 3–5 per formation). Finite resource — cannot be replenished within a sector.

- **Navigation Core** (Assembly Complex recipe, spec 05): Sensor Array + Crystal Lattice + Void Core → Navigation Core. Required for Warp Gate construction (spec 11). Planet C Assembly Complex proximity bonus makes crafting it here most efficient.

**Playtest check:** Set up auto-dispatch Liquid Tanker (Planet B → A1) for high-PE Gas. Watch Rocket Fuel production sustain itself without manual dispatch. Build a Jump Relay between A1 Storage Depot and a Fabricator (intra-planet test). Land on Planet C — notice no gas deposits. Build Gas Trap over a geyser vent. Collect first Dark Gas burst. Place Resonance Charge Cracker at C-XTAL-1, craft charges, harvest Resonance Shards. Notice deposit shift event — "RESURVEY" badge appears on Journal waypoints.

---

### M14 — Endgame & Prestige

*Goal: Warp Gate built and active, Galactic Hub placed on A3, prestige loop works end-to-end.*

**Spec references:** spec 11 §5 (Warp Gate: tech 3.P, 20,000 CR + 50 Void Cores + 100 Alloy Rods), spec 09 (Sector Complete trigger, prestige resets/persists, 10 sector bonus options), spec 15 (full save/load with prestige partial persistence, offline simulation 30 s stepwise), spec 14 §5 (Offline Event Log, Empire Dispatch format)

**What to build:**

- **Warp Theory unlock** (tech 3.P, 2,000 RP, prereq: 10 Void Cores produced): unlocks Warp Gate construction schematic and A3 access. `tech_tree.gd` checks `void_cores_produced_total >= 10` as unlock gate.

- **Warp Gate** (`warp_gate.gd`, spec 11 §5): build cost 20,000 CR + 50 Void Cores + 100 Alloy Rods. Placed at A3 (on `planet_a3.tscn`). Once active: player can travel between planets instantly (no Rocket Fuel cost, no stranding, spec 11). Cargo transport still requires ships/relays.

- **`planet_a3.tscn`** (spec 09): Void Nexus. All 5 ore types spawn (Vorax, Krysite, Aethite, Voidstone, Gas). Ferrovoid ore (A3-exclusive, higher OQ cap and unique CD+ER combination). Wider quality distribution (more variance = hunting payoff is higher, spec 09). Warp Gate placement zone marked. Galactic Hub placement zone marked.

- **Galactic Hub** (`galactic_hub.gd`): build cost 30,000 CR + 200 Steel + 100 Alloy + 50 Void Cores + 30 Crystal Lattices. Placed at A3. Effect: all goods sold through A3 get +20% price bonus (spec 09). Research passively completes remaining tech nodes at 2× RP (spec 09). Required for Sector Complete.

- **`sector_manager.gd`** (Autoload, spec 09): tracks Sector Complete conditions: A1 + Planet B + Planet C all at Phase 4+ automation (all harvesters drone-maintained, no manual intervention needed for 10 min), Warp Gate built, Galactic Hub complete. On all conditions met: Sector Complete overlay triggers.

- **Sector Complete sequence**: full-screen overlay, "SURVEY COMPLETE. ALL DEPOSITS CATALOGUED. SECTOR EXTRACTION AT MAXIMUM EFFICIENCY." Stats shown: total ore extracted, peak CR/min achieved, sector time. "INITIATE PRESTIGE" button.

- **Prestige screen** (`prestige_panel.gd`, spec 09): show 10 sector bonus options (Veteran Miner, Fleet Commander, Survey Expert, Trade Connections, Refined Tastes, Research Heritage, Harvester Legacy, Fuel Surplus, Pioneer Spirit, Void Walker). Player picks 1. Stacks with previous sector bonuses.

- **Prestige reset** (`sector_manager.gd`, spec 09 + spec 15): clear per spec 15 "What Resets" list. Persist per spec 15 "What Persists" list. Credits reset to 200 CR + prestige bonus (e.g., Fleet Commander starts with 2 deployed Scout Drones). Planet C survey waypoints explicitly cleared (shifting deposits). Sector number increments. Sector 2 scaling applies: +5% quality OQ caps, +5% building costs.

- **Offline Event Log** (`offline_event_log.gd`, spec 14 §5 + spec 15): on game load, if `last_save_timestamp` is more than 5 minutes ago, run offline simulation. Stepwise: 30-second intervals, up to 960 steps (8 hours max). Each step: calculate harvester outputs (full BER formula), apply factory consumption, drone task completions, stockpile deltas, stall conditions. Collect `EventLog` entries: routes completed, ore extracted, harvesters stalled (with units lost), survey discoveries (Survey Drones), factory output, net credits gained. On completion: show Empire Dispatch panel — concrete numbers, opportunity costs, positive framing per spec 14. "VIEW DASHBOARD" jumps to Production Dashboard with deficits highlighted.

- **Fleet Presets Tier 3** (`fleet_manager.gd` update, spec 04): preset templates: MINING FORMATION (all drones to AUTO-MINE), HARVESTER SUPPORT (all eligible drones to FUEL/EMPTY circuits), CONSTRUCTION PUSH (all Builder Drones to outstanding BUILD queue), SURVEY SWEEP (Survey Drones cover all unmarked zones), EMERGENCY FUEL (all Refinery Drones drop current task → FUEL harvesters). Apply preset via Fleet Panel with one click.

- **Full save/load** (`save_manager.gd` completion, spec 15): every field in the spec 15 serialized state list serialized and deserialized correctly. Validation: format version check on load. Migration path if format_version mismatch (skip incompatible fields, log warning). All autoloads restored from save state in correct dependency order: DepositMap → ConsumptionManager → TechTree → ZoneManager → FleetManager → LogisticsManager.

- **Sector Records** (spec 09): best sector time, highest quality deposit found, max simultaneous CR/min, highest population reached. Shown on prestige screen and main menu.

**Playtest check:** Complete all three planets' automation (all harvesters drone-maintained, no manual intervention needed). Build Warp Gate on A3 (verify instant planet travel). Build Galactic Hub. Sector Complete triggers. Select "Trade Connections" (+10% sell price). Confirm reset: credits → 200 CR, drones gone, harvesters gone. Confirm persistence: survey waypoints on A1 still present, "Trade Connections" bonus active. Start Sector 2 — notice +10% prices on first ore sale. Save and reload — Empire Dispatch shows 8 hrs of simulated offline progress.

---

## Cross-cutting Concerns

*Implement alongside milestones, not after. Each entry lists when to introduce and when to complete.*

### Audio

| System | Introduce | Complete |
|---|---|---|
| Audio bus setup (Music/SFX/UI) | M0 | M0 |
| Player footstep SFX stub | M1 | M8 |
| Mining interaction SFX (pickaxe hit, 1.5s loop) | M2 | M3 |
| Harvester ambient mechanical loop | M3 | M5 |
| Harvester warning tones (fuel / hopper) | M3 | M8 |
| Survey tone rising toward concentration peak | M2 stub | M6 (tied to accurate concentration) |
| Factory running SFX (distinct per building tier) | M5 | M9 |
| Drone engine hum (audible within 80 px) | M4 | M8 |
| Rocket construction: component clunk + fuel fill | M10 | M10 |
| Background music tracks (3: exploration, automation, late-game) | M5 stub | M12 |

### Visual Effects (Particles)

| Effect | Milestone |
|---|---|
| Mining sparks (CPUParticles2D, orange, Vorax; silver-blue, Krysite) | M3 |
| Harvester drill dust particle | M3 |
| Drone engine trail (Line2D fade, type-colored) | M4 |
| Factory smoke vent (grey puffs on running state) | M5 |
| Survey scan ripple (cyan ring expanding from player) | M6 |
| Rocket exhaust + launch particle burst | M10 |
| Warp Gate activation shimmer | M14 |

### Performance

| Concern | Milestone to address |
|---|---|
| Drone `NavigationAgent2D` pathfinding: switch to flow-field or grid-based pathfinding if >20 drones show stutter | M8 |
| Large A1 world: cull `CPUParticles2D` emitters outside camera viewport | M5 |
| A3 + Planet C worlds (larger): `VisibilityNotifier2D` on all harvesters and factories to pause processing when off-screen | M10 |
| Offline simulation (960 × 30s steps): run in `Thread`, show progress bar during load | M14 |
| Save file size: if `savegame.json` exceeds 500 KB, compress with `FileAccess.COMPRESSION_DEFLATE` | M14 |

### Polish Pass

| Feature | Milestone |
|---|---|
| UI panel open/close tween (slide + fade) | M9 |
| Resource flow animation (ore moving along a line between buildings) | M9 |
| Building placement ghost (translucent preview, red if invalid) | M3 (basic), M9 (polished) |
| Galaxy Map route animation (ship icon moving along arc) | M11 |
| Production Overlay world dimming shader | M9 |
| Offline Event Log Empire Dispatch formatting and typewriter reveal | M14 |

---

## File Reference Index

| Spec File | First Milestone | Deepened In |
|---|---|---|
| `00_a2_transit.md` | M11 (A2 scene, cache, gas depot) | M13 (Cargo Ship routing) |
| `01_resource_quality.md` | M2 (deposit.gd, quality_lot.gd stubs) | M9 (full 11 attributes), M14 (A3 Ferrovoid) |
| `02_surveying.md` | M2 (Quick Read, waypoints) | M3 (Full Scan), M9 (Deep Scan + attrs), M12 (Tier II/III + Survey Drone) |
| `03_harvesters.md` | M3 (Personal Mineral, Gas Collector) | M8 (circuits), M11 (Crystal Harvester), M13 (Cave Drill, Gas Trap, Resonance Cracking) |
| `04_drone_swarm.md` | M4 (Scout, MINE/CARRY) | M8 (Refinery, zone automation), M11 (Builder, Cargo), M12 (Survey Drone), M13 (Cargo Drone, Freight Lanes), M14 (Fleet Presets) |
| `05_factories.md` | M5 (Processing Plant) | M9 (Fabricator), M13 (Assembly Complex) |
| `06_consumption.md` | M7 (Pioneers, gas/water) | M12 (full 5-tier ladder, Bio-Circuits, Warp Components) |
| `07_logistics.md` | M11 (manual Cargo Ship, Bulk Freighter) | M12 (auto-dispatch), M13 (all ship types, Freight Lanes, Jump Relays) |
| `08_vehicles.md` | M8 (Rover) | M12 (Speeder + Survey Mount), M10 (Shuttle — Launchpad/travel) |
| `09_planets.md` | M1 (A1 Industrial Sites) | M10 (Planet B + stranding), M13 (Planet C + shifting), M14 (A3 + prestige system) |
| `10_spacecraft.md` | M10 (Launchpad, 5 components, launch) | M11 (Cargo Ship Bay dual-use), M13 (all ship types) |
| `11_tech_tree.md` | M6 (stub: 3 early purchases + 4 nodes) | M8 (drone unlocks), M9 (Fabricator unlock), M12 (full 50+ nodes), M14 (Warp Theory, endgame nodes) |
| `12_economy.md` | M2 (sell prices) | M5 (refinery multipliers), M9 (full quality pipeline), M14 (Phase 5 benchmarks, prestige scaling) |
| `13_art_direction.md` | M1 (background color, resource colors) | M3 (harvester visuals), M5 (factory visuals), M8 (drone trails), M10 (Planet B ambient), M13 (Planet C ambient) |
| `14_ui_systems.md` | M2 (HUD credits) | M5 (Production Dashboard v1), M8 (Traffic + Coverage Overlays), M9 (Production/Overlay v2), M11 (Galaxy Map + Logistics Overlay), M14 (Offline Event Log, Empire Dispatch) |
| `15_save_load.md` | M0 (save skeleton, format schema) | Each milestone extends schema; M14 (full state, offline simulation, prestige persistence) |
| `16_input_map.md` | M0 (all keys defined) | M2 (E, Q wired), M4 (T), M5 (P), M6 (J), M8 (Z, F, B), M9 (O, R), M11 (G, L) |
| `17_world_generation.md` | M1 (A1 Industrial Site positions) | M2 (deposit positions JSON), M3 (gas deposit positions), M10 (Planet B layout), M13 (Planet C layout + geysers + crystal formations) |
