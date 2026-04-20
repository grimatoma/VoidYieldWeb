# Spec 10 — Spacecraft Construction

**Context:** Getting to space is not a cost gate — it is a construction project. The player builds every component, carries it to the Launchpad, and assembles the rocket piece by piece. The rocket should be visible in the world throughout, partially assembled and growing. This is the game's Phase 3 graduation event: completing the rocket marks the transition from a single-planet operation to a multi-planet empire.

Visual mockup: `design_mocks/05_rocket_assembly_sequence.svg` — horizontal timeline: Hull Assembly → Engine → Fuel Tank + Fill → Avionics Core → Landing Gear → Carry to Launchpad → Launch.
Visual mockup: `design_mocks/19_ship_bay.svg` — Launchpad with assembled rocket, pre-launch checklist UI.
Visual mockup: `design_mocks/24_launch_transition.svg` — launch sequence: camera pullback, countdown, ignition, galaxy map cut.

---

## Dependencies

- `01_resource_quality.md` — component quality (SR, PE, CD, HR, MA) determines flight characteristics; quality lot selection is critical for rocket performance
- `05_factories.md` — all 5 components are crafted at Fabricator or Crafting Station; require specific recipes; fuel_synthesizer converts gas to Rocket Fuel
- `09_planets.md` — Launchpad occupies 3 Industrial Site slots (scarce on A1); stranding is resolved by producing ≥100 Rocket Fuel; Planet B arrival conditions
- `03_harvesters.md` — Avionics Core requires Void Cores (from Voidstone, Planet B exclusive) OR a fallback recipe; Fuel Tank fill requires Fuel Synthesizer (gas → Rocket Fuel)

---

## 1. Philosophy

Getting to space is a construction project. The player builds every component, carries it to the Launchpad, and assembles the rocket piece by piece. The rocket should be **visible** in the world throughout, partially assembled and growing. Every component added is a milestone moment.

Target scope: a focused player should spend 30–60 minutes on spacecraft construction. This is a meaningful investment, not a checkbox.

---

## 2. Prerequisite: Build the Launchpad

The Launchpad is the first step. It's a building — not a pre-existing object in the world.

- **Cost:** 500 CR + 80 Steel Plates + 30 Alloy Rods + 20 Energy Cells
- **Industrial Site slots:** 3
- **Placement:** Requires a flat open zone (a designated area on the map, clearly visible as a viable landing pad location)
- **Construction:** Builder Drone or manual (interact with blueprint)
- **Build time:** 2 minutes

Once built, the Launchpad shows a rocket silhouette in the world — a ghost outline of the fully assembled spacecraft. As components are added, the ghost fills in with real assets. This ghost is visible from a distance; the player can glance at it from across the map and see their progress.

The Launchpad replaces the existing Spaceship node. The existing `spaceship.gd` and `spaceship_panel.gd` are redesigned as `launchpad.gd` and `rocket_assembly_panel.gd`.

---

## 3. Rocket Components

Five components, each a separate crafting project. All must be physically carried to the Launchpad and assembled there.

### Component 1: Hull Assembly
- **Schematic:** 120 Steel Plates + 10 Alloy Rods
- **Craft time:** 3 minutes at Fabricator
- **Carry weight:** Heavy — player can only carry 1 Hull Assembly (takes full inventory)
- **Assembly at Launchpad:** Interact [E] to attach. Visual: hull plates appear on the ghost silhouette.
- **Quality impact:** Hull quality determines re-entry heat tolerance and structural integrity
- **Minimum quality for safe launch:** SR ≥ 300 effective (poor hull = chance of launch failure)

### Component 2: Engine Assembly
- **Schematic:** 50 Steel Plates + 20 Alloy Rods + 10 Crystal Lattices (requires Planet B Aethite)
- **Craft time:** 4 minutes at Fabricator
- **Carry weight:** Medium — 5 carry slots
- **Assembly at Launchpad:** Interact to attach. Visual: engine nozzles appear, glow faintly.
- **Quality impact:** Thrust power determines launch window speed; fuel efficiency determines Rocket Fuel consumed per trip

### Component 3: Fuel Tank
- **Schematic:** 40 Steel Plates + 15 Alloy Rods + 5 Energy Cells
- **Craft time:** 2 minutes at Crafting Station
- **Carry weight:** Medium — 4 carry slots
- **Assembly:** Attach, then **fill with Rocket Fuel** (100 units needed for launch to Planet B). Fuel is produced by Fuel Synthesizer: 3 Gas → 1 Rocket Fuel unit.
- **Quality impact:** Tank PE attribute increases fuel capacity (more PE ore → more fuel per unit volume → longer range or more efficient return)

### Component 4: Avionics Core
- **Schematic:** 15 Crystal Lattices + 10 Alloy Rods + 5 Void Cores (requires Voidstone from Planet B)
- **Fallback schematic:** If Void Cores are unavailable, schematic falls back to 20 Alloy Rods (worse quality outcome, but functional). This allows a minimum-viable first launch without requiring Planet B ores, while rewarding players who secure Void Cores before launch.
- **Craft time:** 5 minutes at Fabricator
- **Carry weight:** Light — 1 carry slot
- **Assembly:** Attach. Visual: antenna array rises from the ship.
- **Quality impact:** Navigation precision (landing accuracy on arrival), sensor range. Minimum for first launch: CD ≥ 200 effective (enough to get to Planet B, just with poor landing precision).

### Component 5: Landing Gear
- **Schematic:** 20 Steel Plates + 8 Alloy Rods
- **Craft time:** 90 seconds at Crafting Station
- **Carry weight:** Medium — 3 carry slots
- **Assembly:** Final component. Visual: landing struts fold out. The rocket is now complete. It fully illuminates — color, glow, launch indicator activates.
- **Quality impact:** Landing shock absorption. High-SR gear = safe landings on rough terrain; low-SR = chance of damage on landing.

---

## 4. Pre-Launch Checklist

After all 5 components are assembled, the Launchpad shows the Fuel Gauge. Player needs 100 units of Rocket Fuel in the launchpad's tank (separate from the Fuel Tank component — the component affects efficiency; the launchpad's tank holds the actual propellant).

Filling the tank: interact with Launchpad → "Load Fuel" → transfers Rocket Fuel from Storage Depot.

**Pre-launch checklist (Launchpad UI):**
```
✓ Hull Assembly .............. INSTALLED (SR: 724)
✓ Engine Assembly ............ INSTALLED (Thrust: 1.6×, Efficiency: 81%)
✓ Fuel Tank ................. INSTALLED (Capacity: 140 units)
✓ Avionics Core ............. INSTALLED (Precision: ±8km, Sensors: 180km)
✓ Landing Gear .............. INSTALLED (Shock Rating: Good)
◐ Rocket Fuel ............... 87/100 units
□ Launch Destination ........ NOT SET
```

When all boxes are checked: **LAUNCH** button activates.

---

## 5. Launch Sequence

**The launch moment:** Camera pulls back to show the Launchpad. Launch SFX (countdown, ignition, blast). Rocket rises off the pad with particle effects. Galaxy Map opens. Player selects destination. Transition to new planet.

**Detailed sequence:**
- 3-second countdown audio
- Rocket engine ignites: particle burst, screen shake
- Rocket rises off pad and disappears upward
- Cut to Galaxy Map
- Player selects destination planet
- Travel animation (heat-shield glow on approach)
- Camera slow pan across new planet terrain before settling on player

---

## 6. Quality Consequences

**Minimum-quality rocket (all components at C-grade or below):**
- Fuel consumption 30% higher (may run short on longer trips)
- Landing precision poor (lands 10–40km from target outpost)
- Hull may suffer minor damage on re-entry (requires Scrap Metal repair on landing)

**High-quality rocket (A-grade or above across all components):**
- Fuel consumption at 80% base rate (more efficient)
- Landing precision within 2km of target
- No damage on standard re-entry

This makes building quality components worthwhile beyond bragging rights — it genuinely changes the travel experience.

---

## 7. Economy Reference

| Component | Materials (approx CR equiv.) | Craft Time |
|---|---|---|
| Launchpad (prerequisite) | ~1,400 CR | Build: 2 min |
| Hull Assembly | 120 Steel Plates (~600 CR raw equiv.) | 3 min fabricate |
| Engine Assembly | 50 Steel + 20 Alloy + 10 Crystal Lattices (~1,600 CR) | 4 min |
| Fuel Tank | 40 Steel + 15 Alloy + 5 Energy Cells (~950 CR) | 2 min |
| Avionics Core | 15 Crystal Lattices + 10 Alloy + 5 Void Cores (~2,200 CR) | 5 min |
| Landing Gear | 20 Steel + 8 Alloy (~340 CR) | 90 sec |
| Rocket Fuel (100 units) | 300 Gas units → ~150 CR of gas | — |
| **Total** | **~7,000–8,000 CR equivalent materials** | ~17 min total craft time |

---

## 8. Cargo Ships (Built at Launchpad)

Cargo Ships are built at the Launchpad using the Ship Assembly panel (separate from Rocket Assembly). See `07_logistics.md` for full Cargo Ship rules. The Launchpad is dual-purpose: rocket construction and ship assembly.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/spacecraft/
  launchpad.gd              # Buildable structure: component slots, fuel gauge, launch sequence trigger
  rocket_assembly_panel.gd  # Checklist UI: component status, quality display, fuel load button
  rocket_component.gd       # Carriable item type with embedded stats (quality attributes)
  rocket_component_ghost.gd # Visual ghost in world — fills in as components are attached
scenes/buildings/
  launchpad.tscn            # World object with ghost rocket child node
ui/
  rocket_assembly_panel.tscn
data/
  rocket_components.json    # 5 component definitions: schematic, carry weight, quality attributes, min requirements
```

### Key Signals

```gdscript
# launchpad.gd
signal component_attached(component_type: String, quality_stats: Dictionary)
signal fuel_loaded(amount: int, total: int)
signal launch_ready()
signal launch_initiated(destination_planet: String)
signal landing_completed(planet_id: String, distance_from_target_km: float)

# rocket_component.gd
signal crafted(component_type: String, quality_stats: Dictionary)
```

### Visual Implementation Notes

The ghost silhouette is the key visual. Implementation:
- `launchpad.tscn` has a child node `rocket_ghost` with 5 sub-nodes (one per component)
- Each component node starts invisible with a dim placeholder shape
- When a component is attached, its node transitions from dim placeholder → full colored asset (use a shader tween)
- Glow effect on complete rocket: all 5 nodes active → enable emission shader on rocket_ghost
- The ghost must be readable from ~500px camera distance (i.e., minimap range)

### Relevant Existing Scaffolding

- Retire `scenes/world/spaceship.gd` and `scenes/ui/spaceship_panel.gd` — replace with `launchpad.gd` and `rocket_assembly_panel.gd`
- Update `data/ship_parts.json` to new material recipes (Steel Plates, Alloy Rods, Crystal Lattices)
- `autoloads/game_state.gd` — track `rocket_fuel_level` per planet; component attachment state per launchpad instance

### Implementation Order

1. `launchpad.gd` — buildable structure with 5 component attachment slots; fuel gauge
2. `rocket_component.gd` — carriable item type; embedded quality stats from crafting lot
3. `rocket_component_ghost.gd` — world-space ghost: starts as dim silhouette, fills in per component
4. Component attachment interaction: player walks to launchpad with component in inventory → [E] prompt → attach → ghost fills in → SFX + light flash
5. `rocket_assembly_panel.gd` — checklist UI with component status, SR/efficiency/precision stats per slot
6. Fuel Synthesizer recipe (Gas → Rocket Fuel) — implement in `fuel_synthesizer.gd` (see `05_factories.md`)
7. Fuel loading: interact with Launchpad → "Load Fuel" → transfer from Storage Depot
8. Pre-launch checklist validation — all components + fuel ≥ 100 units → LAUNCH button activates
9. Launch sequence: camera pullback, countdown, particle FX, galaxy map transition
10. Quality consequence system: calculate fuel multiplier, landing precision, re-entry damage chance
11. Cargo Ship assembly at Launchpad (second use of the panel — see `07_logistics.md`)
