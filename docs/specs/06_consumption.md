# Spec 06 — Consumption & Crew System

**Context:** The Consumption & Crew system is the demand side of VoidYield's economy. From Phase 1 onward, the player must supply population needs continuously — not just maximize production output. Five population tiers advance as the player meets escalating requirements. Productivity is a multiplier that applies to everything on the planet: a supply crisis in Processed Rations doesn't just slow the Food Processor — it halves the BER of every harvester, the output of every factory, and the RP generation of every Research Lab. Understanding the chain and designing supply buffers that break cascade failures is the core intellectual challenge of mid-to-late VoidYield.

---

## Dependencies

- `05_factories.md` — Power Cell production rate; factory self-consumption of Power Cells; factory buildings consume cells daily
- `03_harvesters.md` — productivity multiplier applies to harvester BER
- `04_drone_swarm.md` — productivity multiplier applies to drone work speed
- `09_planets.md` — Habitation Module slots (1 slot per module, 30 crew capacity each); planet slot counts
- `11_tech_tree.md` — no direct unlock dependencies, but research rate (RP/min) is affected by productivity multiplier

---

## 1. Design Intent

Every resource VoidYield produces has two potential destinations: export (sell or ship) and consumption (feed the crew). Crew productivity directly gates automation capability:
- A well-fed colony of Technicians enables Fabricators.
- A well-supplied colony of Engineers enables Assembly Complexes.
- Starving a tier's basic needs causes a productivity cascade that reaches every system on the planet.

**The cascade:** A harvester stall causes a factory stall causes a crew shortage causes lower harvester efficiency, which deepens the stall. Understanding the chain — and designing supply buffers that break it — is the core intellectual challenge of mid-to-late VoidYield.

---

## 2. Population Tiers

Each planet's colony advances through tiers as the player meets upgrade conditions. Tier advancement requires: (1) current tier's luxury needs met at 100% for 10 consecutive in-game minutes, and (2) sufficient Habitation Module capacity for the new tier's population count.

| Tier | Phase | Typical Count | Enables |
|---|---|---|---|
| Pioneers | Phase 0–1 | 5–15 | Basic mining, surface operations |
| Colonists | Phase 1–2 | 20–60 | Research Lab, Storage Silos, Trade Hub |
| Technicians | Phase 2–3 | 60–200 | Fabricators, full Drone Bay operations |
| Engineers | Phase 3–4 | 200–500 | Assembly Complexes, Cargo Ship Bay |
| Directors | Phase 4–5 | 500–1,200 | Inter-planet logistics management, Galactic Hub |

---

## 3. Population Growth Mechanics

**Starting population:** 4 Pioneers arrive with the player on first landing at each new planet.

**Automatic growth:** When ALL of the following conditions are met simultaneously, 1 new Pioneer is added every 90 real-time seconds — no manual action needed:
- Current tier's Basic Needs are satisfied at 100%
- Habitation Module has spare capacity (current population < module capacity)

**Tier advancement:** When ALL of the following conditions are met, ALL eligible Pioneers upgrade to the next tier simultaneously (not one at a time):
- Current tier's Luxury Needs are satisfied at 100% for 10 consecutive in-game minutes
- Habitation Module has spare capacity for the new tier's expected headcount

**Maximum population per Habitation Module tier:**
- Basic Habitation Module: 8 population per module
- Standard Habitation Module: 16 population per module
- Advanced Habitation Module: 30 population per module

Each Habitation Module houses crew of any tier (not tier-specific). The "Basic / Standard / Advanced" distinction reflects upgrade levels of the same building type — upgrades cost additional materials and unlock higher per-module capacity.

**Population cap:** Number of Habitation Modules × capacity per module (by tier). Build more modules or upgrade existing ones to grow the colony.

---

## 4. The Escalating Needs Ladder

**Critical design principle:** One tier's luxury becomes the next tier's basic need.

| Tier | Basic Needs (must be 100%) | Luxury Needs (enable tier advancement) |
|---|---|---|
| Pioneers | Compressed Gas (heating), Water | Processed Rations |
| Colonists | Processed Rations, Compressed Gas, Water | Power Cells |
| Technicians | Power Cells, Processed Rations, Compressed Gas | Bio-Circuit Boards |
| Engineers | Bio-Circuit Boards, Power Cells, Processed Rations | Warp Components |
| Directors | Warp Components, Bio-Circuit Boards, Power Cells | — |

**Example chain read:** A Colonist colony needs Processed Rations as a basic need. To advance to Technicians, it must also supply Power Cells as a luxury. Once Technicians are established, Power Cells become *their* basic need — meaning the player can no longer treat Power Cell supply as optional.

---

## 4. Consumption Rates

Per person per in-game day (1 day = 20 real minutes):

| Resource | Per Pioneer | Per Colonist | Per Technician | Per Engineer | Per Director |
|---|---|---|---|---|---|
| Compressed Gas | 2 units | 3 units | 4 units | 4 units | 5 units |
| Water | 1 unit | 1.5 units | 1.5 units | 2 units | 2 units |
| Processed Rations | — | 5 units | 5 units | 6 units | 6 units |
| Power Cells | — | — | 3 units | 4 units | 5 units |
| Bio-Circuit Boards | — | — | — | 2 units | 3 units |
| Warp Components | — | — | — | — | 1 unit |

**Example — 150 Technicians need per day:**
- Compressed Gas: 4 × 150 = 600 units/day
- Water: 1.5 × 150 = 225 units/day
- Processed Rations: 5 × 150 = 750 units/day
- Power Cells: 3 × 150 = 450 units/day

Power Cell total demand for this colony running a 4-Processing Plant + 3-Fabricator + 1-Assembly Complex factory:
- Factory self-consumption: 4 + 9 + 8 = 21 Power Cells/day
- Crew consumption: 450 Power Cells/day
- **Total: 471 Power Cells/day**

The Power Cell Fabricator produces 5/hr = 120/day — far below demand. The player needs multiple Power Cell Fabricators at the cost of other factory slots.

---

## 5. Productivity Effects

Basic need supply is tracked as a percentage (current supply rate vs. required consumption rate).

| Supply % | Productivity Multiplier |
|---|---|
| 100% | 1.00× (full rate) |
| 75% | 0.85× |
| 50% | 0.65× |
| 25% | 0.40× |
| 0% | 0.15× (minimal — crew can't work but won't leave) |

**Productivity multiplier applies to:**
- Harvester BER (effective extraction rate)
- Processing Plant output rate
- Fabricator output rate
- Drone work speed
- Research Lab RP generation

**The cascade mechanics:** If Processed Rations supply drops to 50%, the 0.65× multiplier applies to everything. Harvesters extract 35% less ore. Factories produce 35% slower. Drones move 35% slower. Research generates 35% fewer RP. This compounds quickly: less ore → less factory input → less consumables → worse supply → lower multiplier.

**Recovery:** Restoring supply to 100% restores the multiplier immediately (no gradual recovery delay). The urgency is real-time.

---

## 6. Habitation Modules

Each **Habitation Module** (1 Industrial Site slot, 800 CR + 20 Steel Plates + 10 Alloy Rods) houses 30 crew of any tier.

**Population cap:** Number of Habitation Modules × 30. The player must expand housing to grow the colony.

**Comfort radius:** Habitation Modules project a comfort radius (150px). Crew in range receive a +5% productivity bonus from proximity to amenities — a small but meaningful nudge toward building crew quarters near the factory core.

---

## 7. Production Dashboard Integration

The Consumption & Crew panel is a tab within the Production Dashboard ([P] key). It shows:
- Per-tier population count
- Per-resource supply % (with color: green ≥ 100%, yellow 50–99%, red < 50%)
- Projected days to shortage (current stockpile ÷ deficit rate)
- Current productivity multiplier

A red bar on any tier's basic need is the player's immediate action signal. See `14_ui_systems.md` for the full Production Dashboard design.

---

## 8. Supply Chain Design Guidance

**The water problem:** Water (Pioneer basic need) requires Ice Ore → Ice Melter (Processing Plant). On planets without Ice Ore, water must be imported or extracted locally from the atmosphere.

**Planet B water substitute:** Planet B has no Ice Ore deposits. Water can be obtained in two ways:
1. Import from A1 via Cargo Ship (Liquid Tanker required)
2. Build an **Atmospheric Water Extractor** (Planet B only, 1 Industrial Site slot): produces 2 Water/cycle (12s cycle), no input required — extracts moisture from Planet B's dense atmosphere. No CR purchase cost; built like other buildings at a cost of 600 CR + 10 Steel Plates + 5 Alloy Rods. This building exists only on Planet B and significantly reduces the need to import Water from A1. See `09_planets.md` for Planet B building list.

**Compressed Gas compression:** Gas Compressor (Processing Plant recipe) converts Raw Gas → Compressed Gas Canisters. The Gas Collector produces raw gas; the Compressor upgrades it for crew heating. This means gas serves two purposes (harvester fuel as raw gas, crew heating as compressed) and the player must size both pathways.

**Bio-Circuit Boards:** Required by Technician luxury and Engineer basic need. Bio-Resin is Planet B exclusive (HARVEST FLORA drone behavior). Planet A1 cannot produce Bio-Circuit Boards locally. This is a designed cross-planet dependency.

---

## Implementation Notes

### Godot Node / Scene Structure

```
autoloads/
  consumption_manager.gd   # Tracks population tiers, need supply %, productivity multiplier per planet
scripts/buildings/
  habitation_module.gd     # 30-crew capacity, comfort radius, productivity bonus
scenes/buildings/
  habitation_module.tscn
ui/
  crew_panel.tscn          # Tab inside Production Dashboard: tier list, supply bars, multiplier readout
data/
  consumption_rates.json   # Per-tier per-resource consumption rates
  tier_unlock_conditions.json  # Luxury need thresholds, housing requirements per tier
```

### Key Signals

```gdscript
# consumption_manager.gd
signal tier_advanced(planet_id: String, old_tier: String, new_tier: String)
signal productivity_changed(planet_id: String, new_multiplier: float)
signal supply_critical(planet_id: String, resource: String, supply_pct: float)
signal population_cap_reached(planet_id: String, tier: String)
```

### Data File Location

`data/consumption_rates.json`:
```json
{
  "pioneer": {
    "compressed_gas": {"per_person_per_day": 2},
    "water": {"per_person_per_day": 1}
  },
  "colonist": {
    "processed_rations": {"per_person_per_day": 5},
    "compressed_gas": {"per_person_per_day": 3},
    "water": {"per_person_per_day": 1.5}
  }
}
```

### Relevant Existing Scaffolding

- `autoloads/game_state.gd` — extend with `population_data` per planet; `productivity_multiplier` per planet
- All production systems must read `consumption_manager.gd.get_productivity(planet_id)` and apply to their output rate
- The productivity multiplier should be a global autoload value queried at production tick time, not baked in per-building

### Implementation Order

1. `consumption_manager.gd` autoload: population tier tracking, supply percentage calculation
2. `data/consumption_rates.json` and `data/tier_unlock_conditions.json` data files
3. Productivity multiplier calculation: supply % → multiplier table lookup
4. Wire multiplier to harvester BER in `harvester_base.gd`
5. Wire multiplier to factory output rates in `processing_plant.gd` and `fabricator.gd`
6. Wire multiplier to drone speed in `drone_base.gd`
7. Wire multiplier to Research Lab RP in `research_lab.gd`
8. `habitation_module.gd` — housing capacity tracking; comfort radius (+5% bonus)
9. Tier advancement check: luxury need 100% for 10 consecutive in-game minutes + housing cap
10. Crew panel UI tab in Production Dashboard
11. Supply alert system: emit `supply_critical` signal when any basic need drops below 50%
