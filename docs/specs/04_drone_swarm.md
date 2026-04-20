# Spec 04 — Drone Swarm Management

**Context:** The drone system is the engine of automation. It scales from 1 drone (early Phase 1) to hundreds (late Phase 4-5). Drones connect every other system: they fuel harvesters, carry ore, build structures, survey deposits, and ship cargo between planets. The three-tier control system (direct tasking → zone automation → fleet presets) mirrors the player's progression from hands-on operator to empire director. The visual climax of VoidYield — dozens of colored motion lines crisscrossing a planet — is the drone traffic overlay at swarm scale.

Visual mockup: `design_mocks/03_drone_swarm_overview.svg` — bird's-eye base view with Fleet Command hub, labeled drones with active tasks, and zone path lines.

---

## Dependencies

- `03_harvesters.md` — FUEL and EMPTY tasks target specific harvester objects; AUTO-HARVEST-SUPPORT zone behavior monitors harvester states
- `01_resource_quality.md` — drones carry quality lots when transporting ore; lot metadata must be preserved on CARRY tasks
- `05_factories.md` — Builder Drones construct factory buildings from blueprints; Cargo Drones handle inter-factory material flow
- `09_planets.md` — drone operating radius and Drone Bay placement becomes multi-planet in Phase 4-5
- `11_tech_tree.md` — Branch 1 (Extraction) contains all drone unlocks, speed boosts, carry capacity upgrades, and fleet cap increases

---

## 1. Philosophy

The drone system must scale from 1 drone to hundreds without requiring the player to micromanage every unit. Early-game direct tasking should feel tactile and satisfying. Late-game fleet direction should feel like empire-level strategy, not individual unit commands.

**Visual goal:** At peak empire scale, opening the drone traffic overlay (T key) shows dozens of colored motion lines crisscrossing each planet — mining circuits, fuel circuits, cargo routes, construction crews — all operating simultaneously. This is the visual climax of VoidYield.

---

## 2. Drone Types (Full Roster)

| Type | Cost | Speed (px/s) | Carry Capacity | Role |
|---|---|---|---|---|
| Scout Drone | 25 CR | 60 | 3 | General miner — surface OreNodes and shallow deposits |
| Heavy Drone | 150 CR | 40 | 10 | High-throughput miner — dense fields |
| Refinery Drone | 75 CR | 50 | 8 | Logistics — hauls between Storage, Refineries, Harvesters |
| Survey Drone | 150 CR + 5 Alloy Rods | 35 | 0 | Surveys grid patterns, marks deposits |
| Builder Drone | 200 CR + 5 Steel Plates | 45 | 15 (materials) | Constructs buildings from blueprints |
| Cargo Drone | 500 CR + 10 Alloy Rods | 35 | 20 | Inter-planet transport (via Cargo Ship Bay) |
| Repair Drone | 800 CR | 90 | 0 | REPAIR tasks only — repairs harvesters and cargo ships back to 100% efficiency (carries Scrap Metal/Alloy Rods to target); Unlock: tech node 2.S |

### Drone Fabricator Output (materials-based, no CR cost)

When a Drone Fabricator is built (8,000 CR + 60 Steel Plates + 40 Alloy Rods + 20 Crystal Lattices, 6 Power/sec), drones can be produced from materials locally rather than purchased:

| Drone Type | Materials | Build Time |
|---|---|---|
| Scout Drone | 10 Steel Plates + 5 Alloy Rods | 8 min |
| Heavy Drone | 20 Steel Plates + 10 Alloy Rods | 20 min |
| Refinery Drone | 15 Steel Plates + 8 Alloy Rods | 12 min |
| Survey Drone | 12 Steel Plates + 5 Alloy Rods | 10 min |
| Builder Drone | 25 Steel Plates + 12 Alloy Rods + 5 Crystal Lattices | 25 min |

Unlock: tech tree node 2.Y (Drone Fabricator Unlock, 3,000 RP). Drone Fabricator produces drones locally on each planet, so the fleet cap is per-planet.

---

## 3. Three-Tier Control System

### Tier 1: Direct Tasking (Early Game — Precision Control)

Player clicks an individual drone to select it (shift-click for multi-select). Right-click a target in the world to assign a task.

| Task | Target | Description |
|---|---|---|
| **MINE** | OreNode or Deposit location | Mine until full, then carry to depot |
| **CARRY** | Storage Depot or Harvester | Pick up materials from target A, deliver to target B |
| **FUEL** | Harvester | Fetch gas from nearest Gas Collector (or Canister Rack), refuel target harvester |
| **EMPTY** | Harvester | Empty hopper, carry contents to Storage Depot |
| **BUILD** | Blueprint | Fetch required materials, construct building |
| **SAMPLE** | Deposit location | Collect a physical ore sample and bring to Research Lab |
| **REPAIR** | Harvester, Building, or Cargo Ship | Fetch Scrap Metal or Alloy Rods, repair target to 100% efficiency — requires Repair Drone type |
| **HARVEST FLORA** | Flora Zone | Visit each Aethon Flora organism in zone, collect Bio-Resin, return to depot |
| **CRACK CRYSTAL** | Crystal Formation (Planet C) | Carry Resonance Charges to formation, place both, wait for fracture |
| **IDLE** | — | Return to Drone Bay, await orders |

**Task queue:** Each drone holds up to 5 queued tasks. Tasks execute in order. The **LOOP** checkbox makes the queue repeat indefinitely (e.g., FUEL Harvester → EMPTY Harvester → LOOP creates a permanent maintenance drone for that harvester).

**Drag-to-queue:** Drag tasks from a task palette onto the drone's task bar, or right-click targets to append tasks to the queue.

### Tier 2: Zone Management (Mid-Game — Area Automation)

Player draws a zone polygon on the minimap (hold Z + drag). The zone is assigned N drones from the fleet. Within that zone, drones execute the assigned zone behavior autonomously.

| Behavior | What drones in zone do |
|---|---|
| **AUTO-MINE** | Find nearest unclaimed OreNode or deposit signal, mine until full, carry to nearest Storage Depot, repeat |
| **AUTO-HARVEST-SUPPORT** | Monitor all harvesters in zone; FUEL any harvester below 20% fuel; EMPTY any harvester above 80% hopper fill |
| **AUTO-BUILD** | Process all construction blueprints in zone in order of priority |
| **AUTO-SURVEY** | Walk survey grid pattern over zone, mark all deposits found above player-set threshold |
| **AUTO-SAMPLE** | Collect samples from all un-analyzed deposits in zone, deliver to Research Lab |
| **AUTO-HARVEST-FLORA** | Monitor all designated Flora Zones in zone; assign HARVEST FLORA runs on cycle |

**Zone stats overlay:** Each zone shows: drones assigned, drones active, tasks/hour (rolling average), efficiency score.

**Zone priority:** Zones can be given priority 1–5. When a new drone is added to the fleet, it automatically joins the highest-priority zone that has fewer drones than its target count.

### Tier 3: Fleet Strategy (Late Game — Global Direction)

**Fleet Presets** — one-button global reassignment:

| Preset | Effect |
|---|---|
| **MINING FORMATION** | All available drones assigned to AUTO-MINE in mining zones |
| **HARVESTER SUPPORT** | All Refinery Drones reassigned to AUTO-HARVEST-SUPPORT across all zones |
| **CONSTRUCTION PUSH** | All Builder Drones reassigned to AUTO-BUILD; clears all pending blueprints |
| **SURVEY SWEEP** | All Survey Drones dispatched to survey unmapped areas; other drones maintain current tasks |
| **EMERGENCY FUEL** | ALL drones drop current tasks and FUEL every harvester below 50% fuel |

**Priority Matrix:** The player sets a global priority order for automatic drone dispatching:
```
Example: Mining > Harvester Support > Construction > Survey
```
When drones complete tasks and look for new assignments, they pull from the highest-priority category that needs workers.

**Drone count targets:** The player sets a target count per zone (e.g., "Zone A: 8 drones", "Zone B: 4 drones"). The system auto-balances as drones finish tasks.

Tech tree unlock: node 1.X (Drone Coordination, 500 RP + 300 CR) — drones share target data, no double-mining. Node 1.Y (Fleet Automation, 1,500 RP + 800 CR) — drones auto-reassign based on Priority Matrix.

---

## 4. Fleet Size and Progression

**Starting fleet:** 1 Scout Drone (after first purchase at 25 CR)

| Phase | Target Fleet Size | Primary Composition |
|---|---|---|
| Phase 0-1 | 1–3 | Scout Drones |
| Phase 2 | 5–10 | Scout + 2–3 Refinery Drones |
| Phase 3 | 10–20 | Scout + Heavy + Refinery + Survey |
| Phase 4 | 20–50 | Full roster, multi-planet |
| Phase 5 | 50–200+ | All types, Drone Fabricator producing continuously |

**Fleet size cap:** Base cap: 3. Raised through tech tree Branch 3 (Logistics nodes):
- 3.1 Logistics I: +1 (100 RP + 100 CR)
- 3.2 Logistics II: +2 (300 RP + 300 CR)
- 3.3 Logistics III: +3 (800 RP + 800 CR)
- 3.4 Grand Fleet: +5 (2,000 RP + 2,000 CR)
- 3.5 Armada: +10 per planet (5,000 RP + 5,000 CR)

The cap is per-planet when the Drone Fabricator is in use. Players building drones locally on Planet B have a separate fleet count from A1.

---

## 5. Drone Bay and Operating Radius

The **Drone Bay** is a building (1 Industrial Site slot) that has a service radius (default 400px). Drones from a given Bay can only service buildings within range. Larger planets require multiple Drone Bays placed strategically.

The **Coverage Overlay** (press [B] — for Bay radius) shows each bay's radius circle color-coded by load. Plan drone bay placement before placing factories — a factory out of range of any Drone Bay cannot receive Builder or Refinery Drone service.

**Relay Station** (500 CR + 15 Alloy Rods, 1 slot, 1 Power/sec): Extends drone operating radius by 50%. Max 3 per zone.

---

## 6. Fleet Command Panel (Full Redesign)

The Fleet Command panel (formerly "Drone Bay") is a full-featured swarm management interface with 5 tabs:

**Tab 1: FLEET** — Table view of all drones. Columns: Type, Current Task, Queue, Zone, Priority, Fuel/Durability. Click any row to select drone and edit task queue.

**Tab 2: ZONES** — Zone list with drone allocation sliders and behavior dropdowns. Map overlay toggle (shows zone polygons on world map).

**Tab 3: DEPLOY** — Buy/fabricate new drones. Shows fleet capacity vs. current count. Displays Drone Fabricator queue if available.

**Tab 4: ASSIGNMENTS** — Legacy direct assignment (ore type preference, zone restriction). Retained from v0.1 but now also has Priority column.

**Tab 5: PRESETS** — One-button fleet presets and Priority Matrix settings.

---

## 7. Traffic Overlay (T Key)

Colored motion lines representing all active drone paths:
- Scout/Heavy (mining): blue
- Refinery (logistics): green
- Survey: cyan
- Builder: yellow
- Cargo: purple

At 50+ drones, the overlay looks like a complex network diagram of the player's operation. Turning it on for the first time at swarm scale is a revelation moment.

**Zone assignment animation:** When drones accept a zone assignment, they visually converge on the zone boundary, then fan out. The zone polygon on the minimap fills with moving dots.

**Fleet Preset activation:** A full-screen flash (very brief, translucent) in the preset's theme color. All drones simultaneously update their waypoints — the traffic overlay shows a mass redirecting.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/drones/
  drone_base.gd           # Base class: position, speed, carry capacity, state machine
  scout_drone.gd          # Extend existing ScoutDrone.gd — add task queue mixin
  heavy_drone.gd
  refinery_drone.gd
  survey_drone.gd
  builder_drone.gd
  cargo_drone.gd
  drone_task_queue.gd     # Mixin: task queue (up to 5), LOOP flag, task execution
autoloads/
  zone_manager.gd         # Autoload — zone polygon storage, drone assignment to zones, AUTO-* behaviors
  fleet_manager.gd        # Autoload — fleet roster, preset execution, priority matrix
scenes/buildings/
  drone_bay.tscn          # Drone Bay building — radius, drone roster
ui/
  fleet_command_panel.tscn   # 5-tab panel
  zone_editor.tscn           # Zone draw tool (hold Z + drag)
```

### Key Signals

```gdscript
# drone_base.gd
signal task_started(drone_id: String, task: Dictionary)
signal task_completed(drone_id: String, task: Dictionary)
signal task_failed(drone_id: String, task: Dictionary, reason: String)
signal cargo_picked_up(drone_id: String, quality_lot: Dictionary)
signal cargo_delivered(drone_id: String, destination_id: String)

# zone_manager.gd
signal zone_created(zone_id: String)
signal zone_behavior_changed(zone_id: String, behavior: String)
signal drone_assigned_to_zone(drone_id: String, zone_id: String)

# fleet_manager.gd
signal preset_activated(preset_name: String)
signal fleet_cap_reached()
```

### Relevant Existing Scaffolding

- `scripts/drones/ScoutDrone.gd` — keep core state machine; extend with `drone_task_queue.gd` mixin
- `autoloads/game_state.gd` — extend with `drone_task_queues[]`; each drone's queue persists across sessions
- `scenes/world/` — drones are world objects; their positions persist in GameState

### Implementation Order

1. `drone_task_queue.gd` mixin — task struct, queue array (max 5), LOOP flag, task execution via state machine
2. Extend `ScoutDrone.gd` with task queue: right-click assignment, task bar UI
3. MINE and CARRY task types first — test basic task queue workflow
4. FUEL and EMPTY task types — wire to `harvester_base.gd` signals
5. Fleet Command panel Tab 1 (FLEET) — drone table with task queue display
6. `zone_manager.gd` autoload — zone polygon storage, drone assignment
7. AUTO-MINE and AUTO-HARVEST-SUPPORT zone behaviors first
8. Fleet Command panel Tab 2 (ZONES) — zone list, drone count sliders, behavior dropdowns
9. All remaining drone types (Heavy, Refinery, Survey, Builder, Cargo) — each as an extension of `drone_base.gd`
10. BUILD, SAMPLE, REPAIR task types
11. Zone behaviors: AUTO-BUILD, AUTO-SURVEY, AUTO-SAMPLE
12. Fleet presets (Tab 5) and Priority Matrix
13. `zone_manager.gd` tech tree wires: 1.X Drone Coordination (no double-mining), 1.Y Fleet Automation
14. Traffic overlay (T key) — colored motion trail system per drone type
15. Drone Fabricator integration — material-based production queue, no CR cost
