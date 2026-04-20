# Spec 01 — Resource Quality & Deposit System

**Context:** This is the foundational layer of VoidYield's economy. Every ore deposit on every planet has a unique quality profile. Quality flows from deposit → refined material → crafted component → finished product, making every survey decision permanently visible in the player's output stats. This system is active from the first minute and never stops mattering. All other systems — harvesting, crafting, factories, spacecraft — depend on it.

---

## Dependencies

This spec stands alone as the root system. All other specs depend on this one. If you are also implementing:
- `02_surveying.md` — how quality profiles are discovered
- `03_harvesters.md` — how the ER attribute and deposit concentration affect extraction rate
- `05_factories.md` — how quality flows through the production chain

---

## 1. Quality Attributes

Inspired directly by Star Wars Galaxies' resource attribute system. Each deposit instance has a random value (1–1000) for each applicable attribute, within class-specific caps. Not all attributes apply to all ore types.

| Abbrev | Name | Meaning | Primary Uses |
|---|---|---|---|
| **OQ** | Overall Quality | General material purity and integrity | Almost all schematics — the baseline |
| **CR** | Crystal Resonance | Energy conduction potential | Power cells, engines, electronics, energy conduits |
| **CD** | Charge Density | Electrical conductivity at the molecular level | Avionics, navigation cores, sensor arrays |
| **DR** | Density Rating | Mass-to-volume structural ratio | Hull framing, pressure vessels, structural members |
| **FL** | Fragment Load | Ore yield per extraction cycle | Added as a flat per-cycle bonus AFTER the BER multiplier chain (see `03_harvesters.md` §1 for the full formula) |
| **HR** | Heat Resistance | Thermal tolerance under sustained heat | Engine casings, thruster nozzles, re-entry shields |
| **MA** | Malleability | Workability and ductility | Any component requiring precise shaping |
| **PE** | Potential Energy | Energy density per unit mass | Fuel cells, batteries, power cores, rocket propellant |
| **SR** | Shock Resistance | Impact and vibration resistance | Hull plating, landing gear, impact-rated components |
| **UT** | Unit Toughness | Hardness and wear resistance | Drill bits, cutting surfaces, bearing races |
| **ER** | Extraction Rate | How readily the deposit yields to mechanical extraction | Multiplies Harvester BER directly |

**Attribute value rules:**
- All values 1–1000
- Each ore class has caps: minimum and maximum possible values per attribute
- A deposit's values are fixed on world generation (or planet arrival for new planets) and do not change
- Missing attributes (e.g., FL on Voidstone) are absent from the deposit card — schematics that call for FL and receive ore without FL treat the missing attribute as 1000 (irrelevant / not limiting)

## 2. Quality Grades (Player-Facing Abstraction)

The raw numerical value is revealed by Research Lab analysis. Before analysis, the Survey Tool shows only a letter grade derived from OQ:

| Grade | OQ Range | Meaning |
|---|---|---|
| F | 1–199 | Poor — workable for bulk needs, not for precision crafting |
| D | 200–399 | Below average — useful for early structures |
| C | 400–599 | Average — the baseline for most functional items |
| B | 600–799 | Good — noticeably better results in most schematics |
| A | 800–949 | Excellent — premium quality, highly sought |
| S | 950–1000 | Near-perfect — extremely rare, drive the economy |

**Important:** OQ grade is the first indicator, but specific schematics care about specific attributes. A deposit graded B on OQ might have SR 950 (S-tier for hull plating) but PE 120 (F-tier for fuel). You can't know until you analyze.

---

## 3. Ore Types — Attribute Profiles

### Vorax (Common Mineral, A1)
- **Sell price:** 1 CR/unit raw, 5 CR/unit refined to Steel Plate (3 Vorax → 1 Plate)
- **Relevant attributes:** OQ, MA, SR, DR, UT, FL
- **Unique role:** Steel Plates are the **construction material**. Buildings, structural frames, and drone chassis all require them. High-MA Vorax makes more workable Steel Plates (components crafted from them get a fabrication quality bonus). High-FL Vorax yields more Steel Plates per batch.
- **OQ caps:** 50–900 (always available in some quality)
- **Availability:** ~70% of mineral deposits on A1

### Krysite (Rare Crystal, A1)
- **Sell price:** 5 CR/unit raw, 20 CR/unit refined to Alloy Rod (2 Krysite → 1 Rod)
- **Relevant attributes:** OQ, CR, CD, PE, HR
- **Unique role:** Alloy Rods gate ship construction AND advanced buildings. High-CR Krysite makes Alloy Rods that conduct energy more efficiently — engines using these rods produce more thrust per unit fuel. High-CD Krysite produces better avionics. High-PE Krysite improves fuel cell energy density.
- **OQ caps:** 100–850
- **Availability:** ~20% of mineral deposits on A1, slow respawn (60s surface nodes, 5-day deposit lifespan)

### Aethite (Common Crystal, Planet B)
- **Sell price:** 8 CR/unit raw, 30 CR/unit refined to Crystal Lattice (2 Aethite → 1 Lattice)
- **Relevant attributes:** OQ, CR, MA, PE, CD
- **Unique role:** Crystal Lattices fuel Research (consume for +10 RP) and are required for advanced computing components. High-CR Aethite Crystal Lattices make better navigation cores. High-PE Aethite improves power cores.
- **OQ caps:** 80–920
- **Availability:** ~65% of mineral deposits on Planet B

### Voidstone (Rare Crystal, Planet B)
- **Sell price:** 15 CR/unit raw, 60 CR/unit refined to Void Core (1 Voidstone → 1 Core)
- **Relevant attributes:** OQ, PE, HR, SR, ER
- **Unique role:** Void Cores are required for Warp Gates, Cargo Ship Bays, and the prestige trigger. High-PE Voidstone makes Void Cores with more raw energy — essential for Warp Gate efficiency. High-SR Voidstone produces more durable structural components.
- **OQ caps:** 200–980 (can be very high quality — deposits are rare but rewarding)
- **Availability:** 3–5 fixed deposit locations on Planet B only, very slow deposit depletion

### Gas (Atmospheric Resource, all planets)
- **Sell price:** 0.5 CR/unit raw (primarily used, not sold)
- **Relevant attributes:** PE, FL, CR
- **Unique role:** **Harvester fuel.** Every mineral/crystal harvester consumes gas over time. Without gas, harvesters stop. High-PE gas burns more efficiently (same energy from fewer units). A good gas deposit is almost as valuable as a good ore deposit.
- **OQ caps:** 20–700 (gas quality is generally lower — it's a utility resource)
- **Availability:** ~40% of all deposits are gas — plentiful, but must be actively managed

### Scrap Metal (Drop from Vorax, ~70% chance per mine)
- **Not tradeable**
- **Uses:** Building maintenance (1 Scrap/building/repair); emergency Steel Plate (2 Scrap → 1 Plate at Refinery); alternative Gas Canister recipe (5 Scrap + 5 Steel Plates → 1 Canister)

### Shards (Drop from Krysite/Aethite mining, ~50–60% chance)
- **Sell price:** 3 CR/unit, or process to Energy Cell (3 Shards → 1 Cell, 10 CR)
- **Uses:** Energy Cells power buildings and Battery Banks. A constant Shards → Energy Cells supply chain is needed for an advanced base.

---

## 4. Deposit System

The existing OreNode system (surface rocks, fixed locations, fast respawn) **is kept** for early-game manual mining. But the primary extraction system is **Deposits** — hidden resource concentrations found by surveying.

### OreNode vs. Deposit Comparison

| | OreNode (surface) | Deposit (subsurface) |
|---|---|---|
| Visibility | Always visible in world | Invisible — found by survey only |
| Access method | Player walk-up + held interaction | Harvester building placed over it |
| Respawn | Fast (30–120s) | Slow to never (limited total yield) |
| Attributes | None (just an ore type) | Full 11-attribute quality profile |
| Concentration | Not applicable | 1–100% at any given location |
| Spatial variation | Fixed node positions | Random concentration peaks across planet |
| Depletes? | No (respawns forever) | Yes — each deposit has a total yield cap |

### Deposit Yield Caps

Each deposit has a total unit count before exhaustion. Typical ranges:
- Small deposit: 500–2,000 units total
- Medium deposit: 2,000–8,000 units total
- Large deposit: 8,000–30,000 units total
- Massive deposit: 30,000–100,000 units total (very rare, found via Elite Survey Tool)

When a deposit exhausts, it's gone. A new deposit of the same ore class will eventually appear elsewhere on the planet (random location, fresh attributes), but the specific quality profile is never repeated.

**The temporal pressure:** A deposit with OQ 920 will not last forever. The player must decide: build an Elite Harvester to maximize extraction speed before it runs out, or milk it slowly with a Personal Harvester? This is one of the game's most interesting resource management decisions.

### Spatial Concentration Distribution

Each deposit has a bell-curve concentration distribution, with a peak at the center and lower concentrations radiating outward.

**Concentration falloff example:** At the exact peak, concentration might be 78%. 30px away: ~55%. 60px away: ~28%.

Placing a harvester even slightly off-peak loses extraction efficiency. A 78%-peak deposit misread as 55% and harvested at that point loses ~29% extraction rate compared to optimal placement. See `02_surveying.md` for the mechanics of finding the exact peak.

### Planet B — Void-Touched Ore (Planet C)

Void-Touched Ore is a corrupted version of basic ores (Vorax, Krysite, Aethite) warped by Planet C's void radiation. The corruption causes extreme quality variance: the same deposit yields batches with OQ 150 or OQ 950 with no predictable pattern. Survey readings are accurate for concentration and ER, but attribute quality is scrambled — you don't know what you're getting until you refine it.

### Ferrovoid (A3 — Void Nexus, exclusive)

Combines properties of Vorax and Voidstone. Used only in the Galactic Hub construction schematic. Found only on A3.

---

## 5. Quality Lot System (Storage)

When ore is extracted and stored, it retains its quality attributes as **lot metadata**. This is essential for routing high-quality ore to the right schematics.

A lot = a batch of ore from a specific deposit, preserving its attribute profile.

**Storage Silo lot tracking:** Each silo stores ore in quality lots: `{ore_type, quantity, attributes{}}`. The fill indicator shows a type breakdown. The player can set priority (process high-OQ lots first) in the Ore Refinery.

**Quality is never lost through production:** A Steel Plate refined from high-MA Vorax retains the MA value in the batch metadata. An Alloy Rod from high-CR Krysite carries that CR forward. The quality propagation formula applies at every stage:

```
Deposit attribute (e.g. UT: 880 on Krysite deposit)
  → Processing Plant output: Alloy Rods carry UT:880 in lot metadata
    → Fabricator: Drill Head schematic reads UT(60%) × 880 = 528 contribution
      → Output Drill Head: mine_speed_bonus = f(528/600_max) → +35% mine speed
```

---

## Implementation Notes

### Godot Node / Scene Structure

```
autoloads/
  deposit_map.gd         # Autoload — generates/persists deposit locations per planet
data/
  deposits.json          # Ore class definitions: attribute caps, availability weights
  ore_prices.json        # Sell prices per ore type and refined material
scenes/world/
  deposit.tscn           # Scene for a single deposit instance (invisible, data-only)
scripts/resources/
  deposit.gd             # Resource class: position, ore_type, attributes{}, concentration_map, total_yield, remaining_yield
  quality_lot.gd         # Data class: ore_type, quantity, attributes{} — stored in silos
```

### Key Signals

```gdscript
# deposit.gd
signal deposit_exhausted(deposit_id)
signal deposit_scanned(deposit_id, scan_depth)  # emitted when survey tool reads this deposit

# deposit_map.gd
signal new_deposit_spawned(planet_id, deposit_id)
signal deposit_removed(planet_id, deposit_id)
```

### GameState Integration

Extend `GameState.gd` with:
```gdscript
var deposit_data: Dictionary = {}         # planet_id → [deposit instances]
var resource_quality_lots: Dictionary = {} # storage_id → [quality_lot instances]
var storage_lots: Array = []              # Array of {ore_type, quantity, attributes{}}
```

`GameState.dump_inventory_to_storage()` must preserve quality metadata — do not flatten ore into a single untyped count.

### Data File Location

`data/deposits.json` — ore class definitions per planet:
```json
{
  "vorax": {
    "planet": "A1",
    "availability_weight": 0.70,
    "oq_min": 50, "oq_max": 900,
    "attributes": ["OQ", "MA", "SR", "DR", "UT", "FL"],
    "deposit_sizes": {"small": [500,2000], "medium": [2000,8000], "large": [8000,30000]}
  }
}
```

### Relevant Existing Scaffolding

- `autoloads/game_state.gd` — extend with deposit_data and quality_lot storage
- `scenes/world/` — add deposit.tscn as an invisible scene node, positioned at world coordinates
- `scripts/interactable.gd` — deposits are not directly interactable (only survey tool reads them), but harvesters placed over them will interact with `deposit.gd`

### Implementation Order

1. Define `deposit.gd` resource class with attributes dict and concentration formula
2. Implement `deposit_map.gd` autoload: planet generation, deposit placement, persistence
3. Add Gas as a resource type in `GameState` (ore_prices, inventory tracking)
4. Implement `quality_lot.gd` and extend `StorageDepot` to store lots rather than flat counts
5. Wire `deposit_map.gd` to world generation — deposits placed invisibly on scene load
6. Add sample item (physical collectible from deposit, carries lot attributes) for Research Lab
7. Test: generate a planet, verify deposit map, verify lot preservation through storage
