# Spec 08 — Vehicle System

**Context:** Vehicles solve three things: traversal speed, cargo hauling, and region access. As the planet fills with harvesters and the deposit map extends to its edges, a player on foot spending 45 seconds per distant harvester becomes a pacing problem. Vehicles address this while also gating content — some high-quality deposits are region-locked and require a specific vehicle tier to reach. Vehicles are not luxury; they gate real progression. The Speeder + Vehicle Survey Mount transforms systematic planet surveying from an hour of footwork to a 15-minute sweep.

Visual mockup: `design_mocks/06_vehicle_roster.svg` — three-column comparison for Rover, Speeder, and Shuttle with stat bars, unlock phase, and costs.

---

## Dependencies

- `02_surveying.md` — Vehicle Survey Mount (Speeder upgrade) enables Full Scans while driving at ≤50 px/sec; survey still requires stopping for Deep Scans
- `09_planets.md` — Region-locked deposits require specific vehicle tiers; atmospheric zones on Planet B and far continent on A3 are Shuttle-only
- `10_spacecraft.md` — Shuttle uses Rocket Fuel (same as spacecraft); Shuttle's large carry capacity makes it ideal for hauling assembled rocket components to Launchpad

---

## 1. Why Vehicles Exist

As the player discovers deposits across the full map, and as the planet becomes dotted with harvesters, walking everywhere creates a pacing problem. Vehicles solve traversal speed (the Speeder covers ground in a fraction of the time), cargo hauling (the Shuttle's +40-unit carry makes component transport practical), and region access (some deposits are behind terrain features that require specific vehicle capabilities).

The connection to surveying: once the player has a Speeder with a Vehicle Survey Mount, surveying a full planet's deposit map goes from an hour of careful footwork to a 15-minute sweep. This is a meaningful quality-of-life upgrade that still requires intentional investment.

---

## 2. Vehicle Roster

| | Rover | Speeder | Shuttle |
|---|---|---|---|
| **Speed** | 280 px/sec | 520 px/sec | 200 px/sec |
| **Carry Bonus** | +15 units | +10 units | +40 units |
| **Fuel Type** | Gas | Gas | Rocket Fuel |
| **Fuel Tank** | 30 gas units | 20 gas units | 15 RF units |
| **Terrain** | All ground terrain | All ground terrain | All terrain incl. restricted zones |
| **Unlock Phase** | Phase 1 | Phase 2 | Phase 3 |
| **Purchase Cost** | 300 CR | 1,200 CR | — (craft only) |
| **Craft Cost** | 30 Steel Plates + 10 Alloy Rods | 20 Steel + 15 Alloy + 5 Crystal Lattices | 50 Steel + 30 Alloy + 15 Crystal Lattices + 10 Void Cores |
| **Crafted At** | Crafting Station | Fabricator | Fabricator |

**Rover:** The first vehicle. Slow enough that the player doesn't feel the world shrink, fast enough to meaningfully reduce travel to distant harvesters. Workmanlike. Feels like a mining truck — that's intentional.

**Speeder:** The exploration vehicle. High speed makes systematic survey grids practical. The Speeder is how the player maps a whole planet's deposit network in one focused session. Vehicle-mounted Survey Tool is most effective here.

**Shuttle:** Not faster than the Speeder for ground travel, but crosses terrain that ground vehicles cannot — elevated zones, protected atmospheric regions on Planet B, and the region boundary to A3's far continent. The Shuttle's large cargo capacity makes it the preferred vehicle for hauling assembled rocket components to the Launchpad.

---

## 3. Driving and Interaction

**Entering/Exiting:** Walk to vehicle, press [E]. Camera shifts to a slightly elevated follow angle. Player's normal carry inventory remains accessible; vehicle cargo hold is additional.

**Fuel consumption:** Vehicles consume gas (or Rocket Fuel for Shuttle) while moving. Stationary vehicles do not consume fuel. The vehicle's fuel gauge is visible on the HUD when driving.

**Refueling:** Drive near a Gas Collector hopper or a Gas Canister Rack and interact. Drones will **NOT** refuel player vehicles — the player manages their own vehicle fuel. This is intentional; it keeps vehicle ownership personal.

### Survey While Driving

When the Survey Tool is equipped while in a Rover or Speeder, the Quick Read (passive ping) is active. The player **cannot** hold still for a Full Scan while in a vehicle (engine vibration interferes). To perform a Full Scan: exit vehicle, stand still, scan.

**Exception — Vehicle Survey Mount upgrade** (unlocked via tech tree node 3.S, Survey Tool Mk.II, 400 RP + 200 CR; costs 600 CR + 5 Alloy Rods to install):
- Can be installed on the Speeder only
- Enables Full Scans while driving at ≤50 px/sec (move slowly while scanning)
- Deep Scans (15s) still require a complete stop
- The mid-game survey optimization: covering ground quickly while passively getting full concentration readings

---

## 4. Region-Locked Deposits

Each planet has 5–10% of deposits marked REGION-LOCKED on the Survey Journal. These cannot be reached on foot — they appear on the survey minimap with a lock icon. The journal entry shows which vehicle tier unlocks access.

| Region Type | Required Vehicle | Typical Reward |
|---|---|---|
| Rocky Ravine | Rover (can navigate rough terrain) | Often high-DR Vorax deposits |
| High-Altitude Zone | Speeder (enough speed to maintain momentum) | Often high-PE Krysite |
| Atmospheric Pocket (Planet B) | Shuttle only | Highest-OQ Voidstone deposits |
| Far Continent (A3) | Shuttle only | Ferrovoid deposits + S-tier anything |

This creates a natural pull toward vehicle upgrades: "I can see there's a Grade A Voidstone deposit in the atmospheric pocket — I need a Shuttle to get there."

---

## 5. Vehicle Garage Building

Vehicles are stored in a **Garage** — a small, cheap building.

- **Cost:** 80 CR + 10 Steel Plates
- **Function:** Stores up to 2 vehicles. Vehicles "park" here when not in use. Garage tracks ownership and enables fuel topping-off from connected Gas Canister Rack.
- **Upgrade — Multi-Bay Garage:** 300 CR + 25 Steel Plates → stores up to 5 vehicles

The Garage is a slot-free building (no Industrial Site slot required).

---

## 6. Vehicle Upgrades

Each vehicle has two upgrade slots. Upgrades are installed at the Garage.

| Upgrade | Effect | Cost | Compatible Vehicles |
|---|---|---|---|
| Cargo Expansion Mk.I | +5 carry capacity | 200 CR + 5 Alloy Rods | Rover, Speeder |
| Cargo Expansion Mk.II | +10 carry capacity | 500 CR + 10 Alloy Rods | Rover, Speeder, Shuttle |
| Speed Boost Mk.I | +15% speed | 300 CR + 5 Crystal Lattices | Rover, Speeder |
| Speed Boost Mk.II | +20% speed | 800 CR + 10 Crystal Lattices | Speeder only |
| Vehicle Survey Mount | Enables Full Scan while moving ≤50 px/sec | 600 CR + 5 Alloy Rods | Speeder |
| Extended Fuel Tank | +50% fuel capacity | 400 CR + 8 Alloy Rods | All |
| Jump Jets | Rover can traverse Ravine terrain | 500 CR + 8 Crystal Lattices | Rover |

---

## 7. Vehicle–Deposit Connection

Core design intent: vehicles gate content. A player who skips the Rover cannot efficiently survey the outer field. A player without a Shuttle cannot access the highest-tier deposits on Planet B. This creates a natural pull toward vehicle investment without making vehicles feel mandatory for basic play.

The region-lock system means the first Shuttle is never just a cargo upgrade — it's access to S-tier Voidstone and Ferrovoid, which are required for late-game crafting. Players who prioritize vehicle investment pull ahead on deposit quality.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/vehicles/
  vehicle_base.gd         # Base class: speed, carry capacity, fuel consumption, enter/exit
  rover.gd
  speeder.gd              # Includes Vehicle Survey Mount logic (reduced-speed scan capability)
  shuttle.gd              # Rocket Fuel consumption; restricted zone traversal flag
scenes/vehicles/
  rover.tscn
  speeder.tscn
  shuttle.tscn
scenes/buildings/
  garage.tscn
scripts/buildings/
  garage.gd               # 2-vehicle capacity, fuel top-off from Canister Rack
ui/
  vehicle_hud.tscn        # Fuel gauge, carry capacity overlay while driving
data/
  vehicles.json           # Speed, carry, fuel type, tank capacity, upgrade slots, craft cost
```

### Key Signals

```gdscript
# vehicle_base.gd
signal player_entered(vehicle_id: String)
signal player_exited(vehicle_id: String)
signal fuel_low(vehicle_id: String, fuel_remaining: float)
signal fuel_empty(vehicle_id: String)
signal region_lock_encountered(vehicle_id: String, region_type: String)
signal region_unlocked(vehicle_id: String, region_type: String)

# speeder.gd
signal survey_mount_scan_started()
signal survey_mount_scan_completed(deposit_id: String)
```

### Relevant Existing Scaffolding

- `scripts/player/Player.gd` — player enters/exits vehicle; camera angle change; carry inventory accessible from vehicle
- `scripts/survey/survey_tool.gd` — Quick Read active while in vehicle; Full Scan blocked unless Vehicle Survey Mount + speed ≤50

### Implementation Order

1. `vehicle_base.gd` — enter/exit [E], camera follow, fuel consumption while moving, HUD fuel gauge
2. `rover.gd` — basic ground traversal, +15 carry, gas fuel, Phase 1 purchasable at 300 CR
3. Region lock system — terrain flag on certain deposit approaches; REGION-LOCKED status in Survey Journal
4. `garage.gd` and `garage.tscn` — vehicle storage building, fuel top-off from Canister Rack
5. `speeder.gd` — higher speed, Phase 2 craft, survey tool integration (Quick Read active while driving)
6. Vehicle Survey Mount upgrade — speed ≤50 detection, unlock Full Scan capability while moving
7. `shuttle.gd` — Rocket Fuel consumption, restricted zone traversal, +40 carry, Phase 3 craft
8. Vehicle upgrade system — two upgrade slots per vehicle, install at Garage
9. Jump Jets upgrade for Rover — enables Rocky Ravine region access
10. Wire all region types to vehicle capability checks (Rover: ravines; Speeder: altitude; Shuttle: atmospheric/far continent)
