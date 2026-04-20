# Spec 07 — Logistics System

**Context:** Logistics is the connective tissue of the multi-planet empire. In the endgame, the player manages a supply network where materials flow between planets on a schedule, stockpiles buffer against delays, and a broken route causes a cascade of production stalls on the receiving end. The system is designed to feel like a satisfying third layer of management — not a background abstraction. The emotional loop mirrors the harvester loop: satisfying when it runs smoothly, genuinely tense when it breaks, and rewarding when you diagnose and fix the stall.

Visual mockup: `design_mocks/09_logistics_route.svg` — Galaxy Map in LOGISTICS overlay mode with color-coded routes, ISV Carver mid-transit, stalled-route alert diagnostic.
Visual mockup: `design_mocks/21_cargo_dock.svg` — Cargo dock building and ship loading animation.

---

## Dependencies

- `09_planets.md` — planet identities (what each planet exports/imports); Industrial Site slot for Cargo Ship Bay (2 slots); Launchpad required for ship assembly
- `10_spacecraft.md` — Cargo Ships require Rocket Fuel (same propellant as spacecraft); inter-planet travel times
- `05_factories.md` — cargo classes: Bulk Freighter for dry goods (ore/bars/plates), Liquid Tanker for gas/Bio-Resin, Container Ship for Fabricator/Assembly Complex outputs
- `04_drone_swarm.md` — Cargo Drones (Phase 4) provide Automated Drone Freight Lanes; Repair Drones service broken ships

---

## 1. Design Intent

The logistics system should feel like a designed system the player actively builds, monitors, and repairs — not a background abstraction. Three progressively automated tiers mirror the drone automation arc: manage manually first (Phase 3 Cargo Ships), then optimize toward continuous automated flow (Phase 4 Lanes), then solve bottlenecks with precision instant transfer (Phase 5 Relays).

---

## 2. Three Tiers of Inter-Planet Logistics

### Tier 1 — Cargo Ships (Phase 3 Unlock)

Physical craft **built at the Launchpad** using the **Ship Assembly panel** (a separate tab from Rocket Assembly on the same Launchpad building — NOT purchased with CR). Ships are component-assembled just like the rocket, then assigned to trade routes. Slow but high-capacity. Require crew to operate and carry breakdown risk.

**Cargo class rules — wrong ship for wrong cargo cannot load:**

| Ship Type | Cargo Class | Hold Capacity | Fuel/Trip | Build Cost |
|---|---|---|---|---|
| Bulk Freighter | Dry goods (ore, bars, plates) | 1,200 units | 50 RF | 2,000 CR + 100 Steel + 30 Alloy |
| Liquid Tanker | Liquid cargo (gas, Bio-Resin, chemicals) | 800 units | 45 RF | 2,400 CR + 80 Steel + 20 Alloy + 10 Crystal |
| Container Ship | Finished components, electronics, high-value goods | 600 units | 55 RF | 3,500 CR + 120 Steel + 40 Alloy + 15 Void Cores |
| Heavy Transport | Dry goods only | 3,600 units | 90 RF | 6,500 CR + 250 Steel + 80 Alloy + 20 Void Cores |

**Cargo class rules:**
- Liquid cargo (gas canisters, Bio-Resin, compressed chemicals): requires Liquid Tanker or pressurized drone pods
- Bulk dry cargo (ore, steel bars, alloy rods, plates): Bulk Freighter or standard drone crates
- Containerized goods (Fabricator outputs, Assembly Complex outputs, rocket components): Container Ships only

Wrong ship type = cannot load manifest. Players must build a fleet with the right composition for their actual cargo mix.

**Key ship properties:**
- Fuel consumed **per trip** — docked ships burn nothing
- Ships are **physical objects in transit**: visible as animated icons on Galaxy Map with progress bars
- Multiple ships can work the same route in parallel
- Ships run on Rocket Fuel — this creates a deliberate dependency: inter-planet logistics requires sustaining Rocket Fuel production (Planet B's high-PE gas becomes critically valuable at scale)

### Tier 2 — Automated Drone Freight Lanes (Phase 4 Unlock)

Medium-speed, continuous-flow inter-planet logistics. No crew required. Set up a lane between two planets, assign drones, and they run indefinitely.

- **Setup:** Open Logistics Panel → New Lane → set source planet, destination planet, cargo class, drone count
- **Throughput:** Each drone carries 20 units/trip (Cargo Drone carry capacity — see `04_drone_swarm.md`), continuous flow. Lane capacity = up to 20 units/trip per drone, per trip interval of 4–8 min depending on planet distance
- **Crew:** None required — drones are autonomous
- **Downside:** Lower per-trip capacity than Cargo Ships; not suitable for large burst deliveries
- **Best for:** Continuous ore flow from A1 to Planet B factories; gas supply from Planet B to A3

### Tier 3 — Jump Relays (Phase 5 Unlock)

Instant inter-planet transfer with limited throughput. Expensive to build (requires Warp Capacitor from Assembly Complex). Best for high-value goods that bottleneck late-game chains.

- **Build cost:** 2 Jump Relay Modules (one per planet end) + 500 CR/relay installation
- **Throughput:** 200 units/min maximum, regardless of cargo class
- **Latency:** Instant — goods appear at destination the moment they enter the source relay
- **Restriction:** Cannot relay liquid cargo (use Liquid Tankers even at Phase 5)
- **Power draw:** 20 Power/sec per relay while active

---

## 3. Trade Routes

A Trade Route is a player-defined supply link between two planets with a specified cargo manifest.

**Defining a route (via Logistics Panel — accessible from Galaxy Map [L]):**
1. Select SOURCE planet and DESTINATION planet
2. Define the **Outbound Manifest**: which materials to carry, and how many units per trip
3. Define the **Return Manifest** (optional): what the ship brings back
4. Assign a Cargo Ship to the route
5. Set dispatch condition: **Manual** / **Auto — hold 80% full** / **Auto — schedule every N minutes**

**Example Route:**
```
Route:    A1 → Planet B
Outbound: 800 Steel Plates + 200 Alloy Rods
Return:   600 Crystal Lattices + 100 Energy Cells
Dispatch: Auto when hold 80% full
Ship:     Medium Freighter "ISV Carver"
```

**Trip times (real time):**
- A1 ↔ Planet B: 3–4 minutes
- A1 ↔ Planet C: 8–10 minutes
- Planet B ↔ Planet C: 6–7 minutes

During transit, the ship is unavailable for reassignment. A mid-route emergency cannot be instantly fixed — this tension is by design.

### Dispatch Automation Progression

| Phase | Dispatch Capability |
|---|---|
| Phase 3 | Manual dispatch only — player opens Logistics Panel and clicks "SEND" |
| Phase 4 | Auto-dispatch by fill threshold (80% hold full) — unlocked via tech node 3.Q |
| Phase 5 | Full schedule automation + emergency repair integration |

---

## 3.5 Planet B Water Logistics Note

Planet B has no Ice Ore — Water cannot be produced via the Ice Melter there. Players have two options:
1. Run a Liquid Tanker route from A1 to Planet B carrying Water
2. Build the **Atmospheric Water Extractor** on Planet B (Planet B-exclusive building, 1 Industrial Site slot) which produces Water locally from the atmosphere — reducing or eliminating the need for a Water import route

The Atmospheric Water Extractor reduces logistics pressure on the A1→Planet B Liquid Tanker route. See `06_consumption.md` for Water demand rates and `09_planets.md` for the building spec.

---

## 4. Stockpile Buffers

Each planet's Storage Depot has a designated **Export Buffer** and **Import Buffer** for logistics.

**Export Buffer:** Materials reserved for loading onto outbound ships. Other production systems (refineries, crafting stations) draw from the main storage, not the export buffer — preventing a refinery from accidentally consuming ore meant for a departing ship.

**Import Buffer:** Incoming cargo from arriving ships offloads here first. Local production chains pull from the import buffer as needed.

**Buffer Management Rules:**
- Player sets the buffer target per route in the Logistics Panel (e.g., "Reserve 800 Steel Plates per A1→Planet B trip")
- If the export buffer falls below the minimum trip load when a ship arrives to depart, the ship enters **LOADING** state and waits
- A partial ship will not depart unless the player manually overrides — prevents "ghost shipments" that arrive with 40% of expected material
- Buffer thresholds can be adjusted at any time without canceling the route

---

## 5. Route Health and Stall Cascades

The Logistics Panel route list and Galaxy Map LOGISTICS overlay surface route status at a glance:

| Status | Meaning |
|---|---|
| **ACTIVE** | Ship en route or dispatching normally on schedule |
| **LOADING** | Ship is docked and waiting for export buffer to reach threshold |
| **DELAYED** | Dispatch interval exceeded by 50% — buffer filling slowly |
| **STALLED** | No dispatch in 2× expected cycle time — needs player attention |
| **BREAKDOWN** | Ship suffered mid-route malfunction — cargo held, repair needed |

**Common stall causes:**
- Export buffer not filling (upstream harvesters stalled for fuel or full hoppers)
- Dispatch threshold too high for current production rate (buffer never reaches 80%)
- Destination depot at capacity (no room to offload — consume locally or expand storage)
- Ship accidentally reassigned or docked for maintenance

**Cascade effect:** When a route stalls, the destination planet's import buffer empties. Any production chain requiring the imported material then halts. A stalled Steel Plate route to Planet B freezes every schematic requiring Steel Plates there. Amber/red status indicators are the player's early warning.

---

## 6. Ship Maintenance

Ships degrade with use. After every 20 trips, a Cargo Ship has a 5% chance of a mid-route malfunction (BREAKDOWN status): it halts at its last map position and holds its cargo until repaired.

**Repair options:**
- Phase 3–4: Player dispatches a **Repair Drone** manually from the Fleet Panel. The Repair Drone (see `04_drone_swarm.md` roster — Speed 90 px/s, REPAIR task only, unlocked at tech node 2.S) travels to the ship's position, repairs it (requires 5 Alloy Rods carried by the drone), and the ship resumes.
- Phase 5: The "Emergency Repair Protocol" tech node enables automatic Repair Drone dispatch when any ship enters BREAKDOWN status.

**Preventive maintenance:** Interact with a docked ship + 5 Alloy Rods → reset degradation counter to 0. A MAINTAIN FLEET drone task (Phase 5, Fleet Strategy tier) automates this for all docked ships.

---

## 7. Ship Naming and Fleet Management

Ships receive default names (ISV Carver, ISV Morrow, ISV Drift, ISV Vance, ISV Rook…) and can be renamed by the player.

Each ship entry in the Fleet Panel shows:
- Assigned route and current leg (outbound / return / docked)
- Current position and progress bar during transit
- Current cargo manifest
- Fuel remaining (while docked)
- Trip count and last successful delivery timestamp
- Degradation level (percentage toward next breakdown roll)

**Fleet size:** No hard cap, but each additional active ship increases Rocket Fuel consumption. Optimizing fleet size vs. fuel supply is a late-game balancing act.

---

## 8. Galaxy Map Logistics Overlay

Press [L] while Galaxy Map is open to switch to LOGISTICS mode:
- **Route lines** between planets, color-coded by status (green = active, amber = loading/delayed, red = stalled or breakdown)
- **Animated ship icons** mid-route with a cargo progress indicator (fill %)
- **Per-route tooltip:** hover shows cargo manifest, estimated arrival, last trip time, trip count
- **Planet buffer health:** small fill indicator per planet showing import/export buffer levels relative to route demands
- **Fleet summary bar:** total active ships, trips completed this session, Rocket Fuel consumed by fleet today

---

## 9. Cargo Ship Bay Building

- **Cost:** 5,000 CR + 100 Steel Plates + 30 Void Cores
- **Industrial Site slots:** 2
- **Power draw:** 10 Power/sec (active)
- **Function:** Required building to load and dispatch Cargo Ships (which are **built at the Launchpad** using the Ship Assembly panel). At full automation (Phase 4+), auto-dispatches ships every 5 minutes on a configurable manifest. Ships visible on Galaxy Map during transit.
- **Phase note:** Auto-dispatch is a Phase 4 capability unlocked via tech node 3.Q. In Phase 3, dispatch is manual — the player opens the Logistics Panel and clicks "SEND." See §3 (Dispatch Automation Progression) above.
- **Upgrade — Expanded Hold:** +50 capacity per level, max 3 levels, 2,000 CR + 20 Alloy Rods each

The Cargo Ship Bay is required to load and dispatch Cargo Ships. One per planet minimum for inter-planet routes.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/logistics/
  cargo_ship_bay.gd       # Building: ship assembly, route assignment, dispatch logic
  cargo_ship.gd           # Ship instance: position, route, cargo manifest, degradation, state machine
  trade_route.gd          # Data class: source, destination, manifest, dispatch condition
  logistics_manager.gd    # Autoload: all routes, fleet roster, buffer tracking, stall detection
  jump_relay.gd           # Phase 5 instant transfer building
scenes/buildings/
  cargo_ship_bay.tscn
  jump_relay.tscn
scenes/world/
  cargo_ship.tscn         # Visible ship object — appears at planet, flies arc to destination
ui/
  logistics_panel.tscn    # Route list, buffer settings, dispatch controls, fleet overview
  galaxy_map_logistics_overlay.tscn  # [L] overlay layer on GalaxyMapPanel
data/
  ship_types.json         # Ship class definitions: cargo class, hold capacity, fuel/trip, build cost
```

### Key Signals

```gdscript
# cargo_ship.gd
signal departed(ship_id: String, route_id: String, manifest: Dictionary)
signal arrived(ship_id: String, destination_planet: String)
signal breakdown_occurred(ship_id: String, position: Vector2)
signal repaired(ship_id: String)

# logistics_manager.gd
signal route_status_changed(route_id: String, old_status: String, new_status: String)
signal buffer_critical(planet_id: String, resource: String, buffer_pct: float)
signal fleet_fuel_warning(total_rf_consumed_today: float)
```

### Relevant Existing Scaffolding

- `scenes/ui/GalaxyMapPanel.gd` — extend with route animations, logistics overlay toggle ([L])
- `autoloads/game_state.gd` — extend with `cargo_routes[]`, `ship_fleet[]`, `planet_buffers{}`
- `scripts/interactable.gd` — Cargo Ship Bay is interactable for route configuration

### Implementation Order

1. `cargo_ship_bay.gd` building — place, wire to Launchpad ship assembly
2. `ship_types.json` data file — all four ship class definitions
3. `trade_route.gd` data class — source, destination, manifest, dispatch condition
4. `cargo_ship.gd` state machine: DOCKED → LOADING → IN_TRANSIT → ARRIVING → UNLOADING → DOCKED
5. Export Buffer and Import Buffer implementation in StorageDepot — separate from production storage
6. `logistics_manager.gd` autoload — route list, buffer fill tracking, status calculation
7. Logistics Panel UI — route list with status badges, manifest editor, buffer threshold sliders
8. Galaxy Map logistics overlay — route lines (color by status), ship icons with progress bars
9. Ship degradation: 20-trip counter, 5% breakdown chance, repair drone integration
10. Manual dispatch (Phase 3) → auto-dispatch by threshold (Phase 4) → scheduled automation (Phase 5)
11. `jump_relay.gd` — Phase 5, requires Warp Capacitor from Assembly Complex
12. Automated Drone Freight Lanes — Phase 4, coordinate with `04_drone_swarm.md` (Cargo Drone type)
