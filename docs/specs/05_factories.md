# Spec 05 — Factory Production System

**Context:** Factories are the mid-to-late game transformation layer — they take raw ore and produce refined materials, intermediate components, and finished goods. Production is not a single crafting bench; it is a tiered industrial network. Three factory tiers occupy different numbers of Industrial Site slots, which forces planet specialization. Quality flows from deposit through every stage and emerges in final product stats. The factory floor is where good survey decisions become a measurable gameplay advantage.

Visual mockup: `design_mocks/26_factory_floor.svg` — top-down Industrial Site view: Processing Plant → Fabricator → Assembly Complex chain with input/output arrows, slot badges, drone mid-path.
Visual mockup: `design_mocks/27_production_dashboard.svg` — full Production Rate Dashboard showing factory-side consumption breakdown.

---

## Dependencies

- `01_resource_quality.md` — quality lot system; quality flows through every factory tier; attribute weighting in schematics
- `06_consumption.md` — Power Cell demand: factories consume Power Cells daily; crew also consumes Power Cells, creating total demand tension
- `07_logistics.md` — factory outputs become export cargo; logistics routes pull from Storage Depot export buffer
- `09_planets.md` — Industrial Site slot counts per planet (A1: 6, Planet B: 14, Planet C: 18); slot scarcity forces specialization
- `04_drone_swarm.md` — Builder Drones construct factory buildings; Refinery Drones carry inputs/outputs between buildings

---

## 1. Philosophy

Every factory placement involves three decisions:
1. **What recipe** — which of this factory's recipes to run. Retooling costs time and credits. Fabricators especially require commitment.
2. **What quality inputs** — which deposit's ore feeds this factory. Route deliberately: high-OQ ore to the Sensor Array Fabricator; high-UT ore to the Drill Head Fabricator.
3. **Where** — which planet's Industrial Site slots to spend. A slot on A1 (6 slots total) is far more precious than a slot on Planet C (18 slots).

The manual Crafting Station (player-operated, single-item production) remains available as a **personal workbench** for one-off crafts and early-game equipment upgrades. All bulk production flows through the factory tier system. The Crafting Station's quality preview mechanic is preserved inside the Fabricator and Assembly Complex UI, but now the factory runs automatically.

---

## 2. Tier 1 — Processing Plants (1 Industrial Site Slot)

Processing Plants run a single conversion recipe continuously. One input stream, one output stream. No operator input required once placed and supplied.

**Available recipes (one active per plant, retooling free):**

| Plant Name | Input | Output | Rate | Notes |
|---|---|---|---|---|
| Ore Smelter | Vorax Ore | Steel Bars | 12/min | Foundation of all construction |
| Plate Press | Steel Bars | Steel Plates | 8/min | Finished structural material |
| Alloy Refinery | Krysite | Alloy Rods | 6/min | Precision components |
| Gas Compressor | Raw Gas | Compressed Gas Canisters | 10/min | Crew heating + harvester fuel |
| Crystal Processor | Aethite | Crystal Lattice | 4/min | Research + electronics |
| Bio-Extractor | Bio-Resin | Processed Resin | 5/min | Insulation + bio-circuits |
| Food Processor | Raw Crops | Processed Rations | 8/min | Colonist basic need |
| Ice Melter | Ice Ore | Water | 15/min | Pioneer basic need |

**Quality passthrough:** Processing Plants preserve ore lot quality attributes in their output. Steel Bars from a high-MA Vorax deposit retain that MA value in the batch metadata. Quality is never lost — only transformed.

**Power consumption:** 3 Power/sec while running.
**Power Cell daily consumption:** 1 Power Cell/day (see § 6 below).

---

## 3. Tier 2 — Fabricators (2 Industrial Site Slots)

Fabricators accept two inputs and produce one output. Recipe is selectable; retooling costs 500 CR and 30 minutes of downtime. The player must think carefully about which recipe each Fabricator runs on a given planet, since slot pressure prevents running all recipes everywhere.

**Unlock:** Tech tree node 2.X (Fabricator Unlock, 800 RP). Requires node 2.1 (Metallurgy I) as prerequisite.

**Available recipes:**

| Fabricator Recipe | Input A | Input B | Output | Rate |
|---|---|---|---|---|
| Drill Head | Steel Bars | Alloy Rods | Drill Head | 3/hr |
| Sensor Array | Alloy Rods | Crystal Lattice | Sensor Array | 2/hr |
| Hull Plating | Steel Bars | Processed Resin | Hull Plating | 4/hr |
| Power Cell | Energy Shards | Crystal Lattice | Power Cell | 5/hr |
| Fuel Injector | Compressed Gas | Alloy Rods | Fuel Injector | 4/hr |
| Bio-Circuit Board | Alloy Rods | Processed Resin | Bio-Circuit Board | 3/hr |
| Combustion Housing | Steel Plates | Alloy Rods | Combustion Housing | 2/hr |
| Refined Alloy | Alloy Rods | Crystal Lattice | Refined Alloy | 6/hr |

**Quality in Fabricators:** Each recipe specifies which attributes it draws from each input. Example — Drill Head schematic weights:
- UT from Alloy Rod input: 60%
- MA from Steel Bars: 25%
- OQ from both: 15%

The lot with the best matching attribute profile produces the strongest output. Players who route high-UT Krysite ore specifically to the Drill Head Fabricator — rather than mixing into general storage — get measurably better Drill Heads.

**Power consumption:** 8 Power/sec while running.
**Power Cell daily consumption:** 3 Power Cells/day.

---

## 4. Tier 3 — Assembly Complexes (3 Industrial Site Slots)

**Unlock:** Tech tree node 2.Z (Advanced Fabrication, Processing & Crafting branch, 1,200 RP + 2,000 CR). Requires node 2.X (Fabricator Unlock) as prerequisite. Assembly Complexes cannot be built until this node is researched.

Assembly Complexes produce finished high-value goods requiring multiple Fabricator outputs plus Processing Plant outputs. They are the apex of the production chain and require *all upstream factories to be running*. One supply gap stalls the entire complex.

**Available recipes:**

| Assembly Recipe | Input A | Input B | Input C | Output |
|---|---|---|---|---|
| Rocket Engine | Combustion Housing | Fuel Injector | Refined Alloy | Rocket Engine |
| Navigation Core | Sensor Array | Crystal Lattice | Void Core | Navigation Core |
| Warp Capacitor | Void Core | Power Cell | Resonance Shard | Warp Capacitor |
| Advanced Drone Frame | Hull Plating | Sensor Array | Power Cell | Elite Drone Frame |
| Jump Relay Module | Warp Capacitor | Sensor Array | Refined Alloy | Jump Relay Module |

**Quality in Assembly Complexes:** Output stat quality is the weighted composite of all three inputs' relevant attributes. A Rocket Engine with high thrust requires:
- Combustion Housing: high HR (heat resistance from good Steel Plates)
- Fuel Injector: high PE (potential energy from good Alloy Rods)
- Refined Alloy: high UT and MA

Chasing that perfect engine means optimizing the ore deposits feeding every factory upstream of the Complex.

**Proximity bonus:** Assembly Complex receives a throughput efficiency bonus (+10%) if all three of its input-source Fabricators are placed within 80px. The game shows a "PROXIMITY BONUS: ACTIVE" indicator on the Complex when this is satisfied.

**Power consumption:** 15 Power/sec while running.
**Power Cell daily consumption:** 8 Power Cells/day.

---

## 5. Quality Flow Through the Full Chain

The same quality propagation formula applies at every stage:

```
Deposit attribute (e.g. UT: 880 on Krysite deposit)
  → Processing Plant output: Alloy Rods carry UT:880 in lot metadata
    → Fabricator: Drill Head schematic reads UT(60%) × 880 = 528 contribution
      → Output Drill Head: mine_speed_bonus = f(528/600_max) → +35% mine speed
```

The chain makes every deposit survey decision visible in the final output. A player who surveys well and routes deliberately will always outperform one who mixes everything into undifferentiated storage.

---

## 6. Power Cell Loop

Power Cells are produced by Fabricators (Energy Shards + Crystal Lattice, 5/hr) and consumed by the factory network itself. This creates an internal supply chain tension: factories consume Power Cells to run, which means production rate is partly self-limiting.

**Factory Power Cell consumption (per in-game day, 1 day = 20 real minutes):**
- Processing Plant: 1 Power Cell/day
- Fabricator: 3 Power Cells/day
- Assembly Complex: 8 Power Cells/day

**Example calculation:** A planet running 4 Processing Plants + 3 Fabricators + 1 Assembly Complex:
4 + 9 + 8 = **21 Power Cells/day** from factories alone.

If the Power Cell Fabricator is one of those 3 Fabricators, it must produce faster than the network consumes. Sizing this correctly is a mid-game optimization challenge.

**Total Power Cell demand:** Factory consumption + crew consumption (see `06_consumption.md`).

Example — a colony of 150 Technicians with the factory above:
- Factory: 21 Power Cells/day
- Crew (Technicians, 3 cells/person/day × 150): 450 Power Cells/day
- **Total: 471 Power Cells/day**

The Power Cell Fabricator at 5/hr = 120/day — far below demand. The player needs multiple Power Cell Fabricators, which consumes more slots, which reduces room for other Fabricators. This is the deliberate economic tension.

---

## 7. Supporting Buildings

### Ore Refinery (Tier 2)
- **Cost:** 800 CR + 25 Steel Plates + 10 Alloy Rods
- **Power draw:** 5 Power/sec
- **Function:** Converts raw ore → refined materials per the production chain. Throughput: 1 batch per 12–20 seconds. Preserves quality attributes from input ore. Player can set priority (process high-OQ lots first).

### Fuel Synthesizer (Tier 2)
- **Cost:** 600 CR + 15 Steel Plates + 8 Alloy Rods
- **Power draw:** 3 Power/sec
- **Function:** Converts Gas units into Rocket Fuel (3 Gas → 1 Rocket Fuel unit). Essential on any planet where spacecraft is built or refueled.

### Solar Panel / Battery Bank
- **Solar Panel:** 80 CR + 5 Steel Plates + 3 Energy Cells → 2 Power/sec (max 10 per zone)
- **Battery Bank:** 250 CR + 10 Steel Plates → stores 300 Power; load Energy Cells for +50 Power each

### Trade Hub (Tier 3)
- **Cost:** 3,000 CR + 40 Alloy Rods + 20 Crystal Lattices
- **Power draw:** 4 Power/sec
- **Function:** Auto-sells configured ore types at market rate every 60 seconds. Configurable per-resource thresholds.

---

## 8. Industrial Site Slots — Full Reference

| Building | Slots | Notes |
|---|---|---|
| Processing Plant | 1 | Each recipe is a separate plant |
| Fabricator | 2 | Recipe retooling costs 500 CR + 30 min |
| Assembly Complex | 3 | Requires all input factories running; unlock via tech node 2.Z |
| Research Lab | 2 | |
| Drone Bay | 1 | Has service radius |
| Habitation Module | 1 | 30 crew capacity each (upgradeable) |
| Gas Collector (installed) | 1 | Must be near gas vent/deposit |
| Heavy Harvester | 1 | Deposit-adjacent |
| Cargo Ship Bay | 2 | One per planet for inter-planet routes |
| Launchpad | 3 | Required for spacecraft assembly AND ship construction |
| Atmospheric Water Extractor | 1 | Planet B only; no input required |
| **Crafting Station** | **0** | **Player-operated workbench — NOT placed at an Industrial Site. Placed anywhere in the world; requires player to physically interact with it. Does not consume any Industrial Site slot.** |

See `09_planets.md` for planet-by-planet slot totals and example optimal configurations.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/factories/
  processing_plant.gd     # Single-recipe continuous conversion; quality lot passthrough
  fabricator.gd           # Two-input queue-based production; recipe retooling logic
  assembly_complex.gd     # Three-input apex production; proximity bonus detection
  ore_refinery.gd         # Batch refinery; lot priority setting
  fuel_synthesizer.gd     # Gas → Rocket Fuel conversion
  crafting_station.gd     # Personal workbench; single-item production; quality preview UI
  schematic.gd            # Data class: attribute weights, ingredient list, output stats formula
scenes/buildings/
  processing_plant.tscn
  fabricator.tscn
  assembly_complex.tscn
  ore_refinery.tscn
  fuel_synthesizer.tscn
  crafting_station.tscn
ui/
  crafting_panel.tscn     # Schematic selection, lot selection, quality preview
  fabricator_panel.tscn   # Recipe selector, input queue, quality preview
  assembly_panel.tscn     # Three-input recipe viewer, output stats projection
data/
  schematics.json         # All schematic definitions: inputs, attribute weights, output formula
  recipes.json            # Processing Plant and Fabricator recipe list
autoloads/
  power_grid.gd           # Autoload — tracks power generation vs. draw per planet
```

### Key Signals

```gdscript
# processing_plant.gd
signal batch_produced(recipe_id: String, output_lot: Dictionary)
signal input_depleted(recipe_id: String)
signal stalled_no_input(building_id: String)

# fabricator.gd
signal recipe_changed(old_recipe: String, new_recipe: String)
signal item_crafted(schematic_id: String, output_quality: Dictionary)
signal retooling_started(duration: float)

# assembly_complex.gd
signal proximity_bonus_state_changed(active: bool)
signal assembly_completed(recipe_id: String, output: Dictionary)
```

### Data File Location

`data/schematics.json`:
```json
{
  "drill_head": {
    "type": "fabricator",
    "inputs": [
      {"material": "steel_bars", "quantity": 5, "attribute_weights": {"MA": 0.25, "OQ": 0.075}},
      {"material": "alloy_rods", "quantity": 3, "attribute_weights": {"UT": 0.60, "OQ": 0.075}}
    ],
    "output": "drill_head",
    "rate_per_hour": 3,
    "output_stat": "mine_speed_bonus",
    "output_formula": "f(combined_weighted_score / 600)"
  }
}
```

### Relevant Existing Scaffolding

- `autoloads/game_state.gd` — extend with factory states, recipe assignments, production queue
- `scenes/world/` — all factory buildings are placed world objects using the building placement system
- `scripts/interactable.gd` — used as base for factory interaction (open panel)
- Extend `StorageDepot` to distinguish export buffer from production input buffer (see `07_logistics.md`)

### Implementation Order

1. `ore_refinery.gd` — batch conversion, quality lot preservation, lot priority setting
2. `processing_plant.gd` — single-recipe continuous conversion; wire to ore input from storage
3. `fuel_synthesizer.gd` — Gas → Rocket Fuel (needed for spacecraft spec)
4. `crafting_station.gd` and `crafting_panel.gd` — manual workbench, schematic selection, quality preview
5. `schematic.gd` data class and `data/schematics.json` — define first 3 schematics (Gas Canister, Scout Drone, Drill Bit Mk.III)
6. `power_grid.gd` autoload — power generation tracking, building power draw
7. `fabricator.gd` — two-input queue production, recipe retooling, unlock via tech tree 2.X
8. Fabricator UI panel — recipe selector, input queue, quality preview
9. `assembly_complex.gd` — three-input production, proximity bonus detection (80px check)
10. Full schematic library — implement all recipes from § 3 and § 4
11. Power Cell daily consumption tracking — tie to factory run time
12. Drone Fabricator — material-based drone production queue (coordinate with `04_drone_swarm.md`)
