# Spec 03 — Harvester System

**Context:** Harvesters are the backbone of the mid-to-late game economy. They sit between surveying (which finds deposits) and storage/refining (which processes ore). The maintenance loop — gas fuel runs out, hoppers fill up — is intentionally friction before drones take it over. That friction makes automation feel like liberation. Harvesters connect directly to the deposit system (BER × concentration × ER), the drone system (FUEL and EMPTY tasks), and the logistics system (ore flows to Storage Depot).

Visual mockup: `design_mocks/02_harvester_gas_loop.svg` — top-down base layout showing Gas Collector → Mineral Harvester → Refinery Drone circuit → Storage Depot.

---

## Dependencies

- `01_resource_quality.md` — deposit attributes, especially ER (multiplies BER directly) and concentration; quality lot preservation
- `02_surveying.md` — harvester placement requires a survey marker within 20px of intended location
- `04_drone_swarm.md` — FUEL and EMPTY drone task types; AUTO-HARVEST-SUPPORT zone behavior
- `07_logistics.md` — ore output flows to Storage Depot, which feeds export buffers for inter-planet routes

---

## 1. Core Extraction Formula

```
Units per minute = BER × (Concentration / 100) × (ER / 1000) × Upgrade_Multiplier
                  + (FL / 1000 × BER × 0.5)
```

Where:
- **BER** = Base Extraction Rate (set by harvester tier)
- **Concentration** = % at placement point (from survey, 1–100)
- **ER** = Extraction Rate attribute of the target deposit (1–1000)
- **Upgrade_Multiplier** = from tech tree or harvester upgrades (default 1.0)
- **FL** = Fragment Load attribute of the target deposit (1–1000); applied as a flat per-cycle bonus AFTER the multiplier chain. FL is absent from some deposit types (e.g. Voidstone) — if absent, treat FL as 0 in the formula.

**FL bonus explained:** FL adds a flat bonus on top of the multiplied result. A deposit with FL = 1000 adds +50% of BER as additional units per minute (0.5 × BER). A deposit with FL = 500 adds +25% of BER. This makes high-FL deposits meaningfully more productive independent of concentration and ER.

**Example — Medium Mineral Harvester (BER 11) at 72% concentration, ER 640, FL 800:**
- Multiplier chain: `11 × 0.72 × 0.64 × 1.0 = 5.07`
- FL bonus: `(800 / 1000) × 11 × 0.5 = 4.40`
- **Total: 9.47 units/min**

**Example — same harvester at same deposit, FL 0 (e.g. Voidstone type):**
`11 × 0.72 × 0.64 = 5.07 units/min` (no FL term added)

**Example — same harvester at 95% concentration, ER 850, FL 0:**
`11 × 0.95 × 0.85 = 8.87 units/min`

The contrast illustrates why survey precision and deposit quality both matter: optimal placement produces 75% more ore than mediocre placement. High-FL Vorax deposits get an additional bonus on top of concentration and ER.

---

## 2. Deposit Slots — Harvester Concurrency Limits

Each deposit supports a limited number of harvesters placed over it, determined by deposit size:

| Deposit Size | Harvester Slots | Notes |
|---|---|---|
| Small | 1 | One harvester only |
| Medium | 2 | Two harvesters can work the same deposit concurrently |
| Large | 3 | Three harvesters |
| Motherlode | 3 (Heavy only) | Accepts one Heavy Harvester as the single slot (the formation is too dense for multiple standard harvesters) |

Slot limits are enforced at placement time — the harvester ghost turns red if a deposit is already at capacity. Players cannot stack harvesters beyond the slot limit. Choosing the right harvester tier for a deposit's size is part of the placement decision.

See `09_planets.md` §2 for deposit slot context within the Industrial Site system.

---

## 3. Harvester Types and Stats

### Mineral Harvester (extracts Vorax, Krysite, mixed mineral deposits)

| Tier | Name | BER | Hopper | Gas/hr | Cost |
|---|---|---|---|---|---|
| Personal | Personal Mineral Extractor | 5 | 500 units | 3 gas/hr | 150 CR + 10 Steel Plates |
| Medium | Mineral Mining Installation | 11 | 1,500 units | 8 gas/hr | 500 CR + 25 Steel Plates + 5 Alloy Rods |
| Heavy | Heavy Mining Installation | 20 | 4,000 units | 18 gas/hr | 1,500 CR + 60 Steel Plates + 15 Alloy Rods |
| Elite | Elite Mining Installation | 44 | 12,000 units | 45 gas/hr | 6,000 CR + 150 Steel Plates + 50 Alloy Rods |

### Crystal Harvester (extracts Krysite, Aethite, Voidstone — crystal-type deposits)

| Tier | Name | BER | Hopper | Gas/hr | Cost |
|---|---|---|---|---|---|
| Personal | Crystal Core Extractor | 4 | 400 units | 4 gas/hr | 200 CR + 10 Steel Plates + 5 Alloy Rods |
| Medium | Crystal Mining Array | 9 | 1,200 units | 10 gas/hr | 700 CR + 30 Steel Plates + 10 Alloy Rods |
| Heavy | Deep Crystal Array | 18 | 3,500 units | 22 gas/hr | 2,200 CR + 80 Steel Plates + 25 Alloy Rods |
| Elite | Elite Crystal Array | 40 | 10,000 units | 50 gas/hr | 8,000 CR + 200 Steel Plates + 60 Alloy Rods + 10 Void Cores |

### Gas Collector (extracts Gas deposits — the harvester for harvester fuel)

| Tier | Name | BER | Tank Capacity | Self-powered? | Cost |
|---|---|---|---|---|---|
| Personal | Atmospheric Collector | 6 | 200 gas units | Yes (wind-powered) | 100 CR + 8 Steel Plates |
| Medium | Gas Processing Station | 14 | 600 gas units | Yes (wind-powered) | 400 CR + 20 Steel Plates + 5 Alloy Rods |
| Heavy | Deep Gas Platform | 28 | 2,000 gas units | Yes + 5 solar backup | 1,200 CR + 50 Steel Plates + 15 Alloy Rods |

**Critical:** Gas Collectors are self-powered (wind and solar). They do NOT consume gas. They are the only self-sustaining harvester type. Place one near a gas deposit and it runs indefinitely (only needs hopper emptying). This is the foundation of the entire fuel supply chain.

---

## 3. The Fuel System

Every mineral and crystal harvester consumes **gas** continuously while running. Gas is stored in the harvester's **fuel tank** (separate from the ore hopper).

### Fuel Tank Capacities

| Tier | Tank Capacity | Approx. Runtime at Base Consumption |
|---|---|---|
| Personal | 50 gas units | ~17 hrs |
| Medium | 150 gas units | ~19 hrs |
| Heavy | 400 gas units | ~22 hrs |
| Elite | 1,000 gas units | ~22 hrs |

### What Happens When Fuel Runs Out

The harvester halts. The hopper retains all ore already extracted. A warning icon appears above the harvester in-world. The harvester does not resume until refueled.

**Warning feedback:** Warning SFX (brief alarm). In-world: harvester dims and shows a fuel can icon. On minimap: icon pulses yellow. HUD: notification "HARVESTER STOPPED: No Fuel" in alert area.

### Refueling Methods

- **Manual:** Player carries a Gas Canister (craftable item, holds 50 gas units) and interacts with harvester
- **Drone:** Refinery Drone assigned to FUEL task carries gas from Gas Collector hopper to target harvester

**Gas Canister:** Craftable at Crafting Station (5 Steel Plates + 2 Alloy Rods). Holds 50 gas units. Player carries up to 3 in inventory. Alternative recipe: 5 Scrap + 5 Steel Plates → 1 Canister (if Alloy Rods are scarce).

**Gas Canister Rack building** (60 CR + 5 Steel Plates): Storage rack for 10 Gas Canisters. Drones assigned to FUEL tasks draw from the nearest Canister Rack. This is the logistics node for gas distribution.

---

## 4. The Hopper System

Every harvester has a hopper — internal storage for extracted ore. When the hopper fills, extraction halts.

**What happens when hopper fills:** Extraction halts. Warning icon appears (distinct tone from fuel warning). Ore already in hopper is not lost.

### Emptying the Hopper

- **Manual:** Player interacts with harvester → "Retrieve [N] units of [Ore Type]" → ore added to player's carried inventory → player carries to Storage Depot
- **Drone:** Refinery Drone assigned to EMPTY task hauls hopper contents directly to Storage Depot

**Hopper strategy:** A high-BER Elite Harvester at a good deposit fills its 12,000-unit hopper in roughly 22 hours at full speed. A Personal Harvester might fill in 6–12 hours. Players in early game must check hoppers more frequently.

---

## 5. Harvester Placement Rules

1. A survey marker must exist within 20px of the intended placement location
2. Player selects the harvester building from the Trade Terminal's BUILDINGS tab → enters blueprint placement mode
3. The harvester ghost highlights green when positioned over a valid deposit, red otherwise
4. Placement must be within 15px of the concentration peak for optimal rate. Placement indicator shows current efficiency: "87% efficiency — move closer to survey marker"
5. Harvesters cannot overlap with other buildings or be placed in blocked terrain

---

## 6. Harvester Degradation (Optional Complexity)

Harvesters lose 1% extraction efficiency per 12 hours of operation. This is visible as a declining efficiency stat on the harvester UI.

**Repair:** Interact with harvester + 2 Scrap Metal → restore to 100% efficiency.

**Drone repair:** A future drone task type (REPAIR) can automate this. In Phase 1-2, this is a manual check. In Phase 3+, Builder Drones handle it.

**Player toggle:** This mechanic can be disabled in settings for players who find it tedious rather than interesting.

---

## 7. Research Lab Integration

The **Research Lab** building (1,500 CR + 30 Crystal Lattices, 3 Power/sec) is directly tied to the harvester system:

- **Sample analysis:** Player brings a physical sample from a deposit → full 11-attribute breakdown in 2 minutes real time. This is the only way to know all attribute values before getting a Tier III scanner.
- **Research Point generation:** 1 RP/min. Crystal Lattices consumed: +10 RP instantly.
- **Sample intake radius:** 200px. Harvesters within range automatically send ore samples to the Lab at configurable intervals, triggering analysis without manual delivery. Harvesters outside the radius require a drone SAMPLE COURIER task.

Tech tree node 2.V (Sample Analysis I, 100 RP): reduces analysis time from 2 min → 1 min. Node 2.W (Sample Analysis II, 300 RP + 300 CR): 1 min → 30s; reveals 2 top attributes before full analysis.

---

## 8. Unique Harvesting Methods

Standard harvesters work only on standard deposit types. Planet-specific resources require specialized structures.

### Cave Drill (Planet B — Voidstone)

Voidstone deposits sit below Planet B's cave networks, unreachable by a surface harvester. The Cave Drill anchors at a cave entrance and extends a drill assembly into the deep formation below.

- **Placement:** Must be placed at a confirmed cave entrance (dark terrain features). Use the Speeder's Survey Mount at full scan to detect the subsurface concentration below.
- **BER:** 8 (lower than mineral harvesters — difficult access geometry)
- **Hopper:** 800 Voidstone units
- **Fuel:** Standard gas works; Dark Gas gives +20% BER bonus
- **Cost:** 1,800 CR + 60 Steel Plates + 20 Alloy Rods + 10 Crystal Lattices
- **Unlock:** Tech Tree Extraction branch — node "Deep Excavation" (Phase 3)
- **Signal behavior:** Survey Tool oscillates near cave systems rather than giving a steady rising tone — a deliberate "something is different here" cue.

### Gas Trap (Planet C — Dark Gas)

Dark Gas geysers vent intermittently from unstable fractures. A Gas Trap positioned over an active vent captures each eruption burst in a pressurized storage cylinder.

- **Placement:** Must be within 8px of an active geyser vent. Locating vents requires Full Scan or better — geyser signal is a distinct low rhythmic pulse, not the steady rising tone of a static deposit.
- **Cycle:** ~1 eruption per 8 minutes; 50–80 Dark Gas units per burst
- **Average yield:** ~50–60 units/hr (eruption-dependent, not constant)
- **Tank capacity:** 500 Dark Gas units
- **No fuel cost:** The geyser provides the pressure; the trap is entirely passive
- **Cost:** 2,400 CR + 80 Steel Plates + 30 Alloy Rods + 15 Shards
- **Unlock:** Tech Tree Extraction branch — node "Geyser Capture" (Phase 4)

### Resonance Charge Cracking (Planet C — Resonance Crystals)

Resonance Crystals cannot be mined with any harvester. They must be fractured with a controlled charge detonation.

**Process:**
1. Craft Resonance Charges at the Fabricator (2 Shards + 1 Void Core → 1 Charge; 5 min craft time)
2. Travel to a Resonance Crystal formation (tall pale formations visible on Planet C's surface)
3. Place 2 charges at the crystal base with [E] — charges must be placed simultaneously (one drone trip does not work; requires two drones or the player placing both)
4. Wait 90 seconds for the fracture sequence to complete (audio and visual cues mark progress)
5. Harvest Resonance Shards with [E] from the broken pieces

**Output:** 40–80 Resonance Shards per crack event (CD 780–980, SR 700–950).

**Automation:** Builder Drones can carry and place charges autonomously when assigned a CRACK CRYSTAL task targeting a specific formation. A second drone handles the HARVEST task after fracture. Full automation requires two drones per formation to avoid idle time.

**Supply is finite:** Each crystal formation supports 3–5 crack cycles before depleting permanently. Formations do not respawn. Total Resonance Shard supply per Sector run is limited — plan allocations carefully.

### HARVEST FLORA Drone Behavior (Planet B — Bio-Resin)

Bio-Resin is secreted by Aethon Flora — alien plant organisms on Planet B's surface. No harvester can extract it. Drones assigned the HARVEST FLORA behavior collect resin from living plants on a timed cycle.

**Setup:** Player designates a Flora Zone polygon (same zone tool used for mining zones). Any Aethon Flora organisms within the zone become harvest targets.

**Drone behavior:** Drone travels to each flora organism in sequence, waits ~3 seconds for the resin draw animation, then moves to the next organism. On completing the zone, drone returns to Storage Depot to offload, then loops.

**Yield:** 2–5 Bio-Resin units per organism per collection cycle (~12 in-game minutes between collections). A well-populated zone of 20 organisms yields approximately 60–100 Bio-Resin units/hr.

**Flora health mechanic:** Building footprints placed inside a Flora Zone reduce organism density — displaced plants don't return. The game warns in build mode if a placed building overlaps a Flora Zone. Players who pack buildings too densely near flora permanently reduce Bio-Resin capacity.

---

## 9. Industrial Site Slots

Heavy Harvesters (and Cave Drills, Gas Traps) occupy 1 Industrial Site slot each when placed at ore deposits (they count toward the industrial footprint even though they're not at a building site). Standard Personal and Medium harvesters at ore deposits use Deposit Slots, not Industrial Site slots.

See `09_planets.md` for the full Industrial Site slot system and planet slot counts.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scripts/harvesters/
  harvester_base.gd       # Base class: hopper, fuel tank, BER formula, running/stopped states, degradation
  mineral_harvester.gd    # Mineral Harvester: Vorax/Krysite
  crystal_harvester.gd    # Crystal Harvester: Krysite/Aethite/Voidstone
  gas_collector.gd        # Self-powered, no fuel drain, wind-driven
  cave_drill.gd           # Planet B only; cave entrance placement check
  gas_trap.gd             # Planet C only; geyser pulse collection
scenes/buildings/
  personal_mineral_harvester.tscn
  medium_mineral_harvester.tscn
  heavy_mineral_harvester.tscn
  elite_mineral_harvester.tscn
  gas_collector.tscn
  cave_drill.tscn
  gas_trap.tscn
ui/
  harvester_panel.tscn    # In-world UI: fuel gauge, hopper bar, efficiency %, warning states
data/
  harvesters.json         # All tier definitions: BER, hopper, gas/hr, cost, slot usage
```

### Key Signals

```gdscript
# harvester_base.gd
signal hopper_full(harvester_id: String)
signal hopper_emptied(harvester_id: String)
signal fuel_empty(harvester_id: String)
signal fuel_refilled(harvester_id: String)
signal extraction_halted(harvester_id: String, reason: String)  # "no_fuel" | "hopper_full"
signal extraction_resumed(harvester_id: String)
signal ore_extracted(harvester_id: String, ore_type: String, amount: int, quality_lot: Dictionary)
```

### Data File Location

`data/harvesters.json`:
```json
{
  "personal_mineral": {
    "type": "mineral",
    "bер": 5,
    "hopper_capacity": 500,
    "gas_per_hour": 3,
    "fuel_tank": 50,
    "cost_cr": 150,
    "cost_materials": {"steel_plate": 10},
    "industrial_slots": 0
  }
}
```

### Relevant Existing Scaffolding

- `scripts/interactable.gd` — base class works for harvesters; extend for fuel/hopper interactions
- `autoloads/game_state.gd` — extend with `harvester_states[]` array
- `scenes/world/` — harvesters are placed world objects; use the existing building placement system
- `scripts/player/Player.gd` — manual refuel (carry Gas Canister + interact) and hopper emptying interactions

### Implementation Order

1. `harvester_base.gd` — base class: hopper tracking, fuel tank, BER formula, running/stopped state machine
2. `mineral_harvester.gd` — Personal and Medium tiers first (most common in Phase 1-2)
3. `gas_collector.gd` — self-powered, hopper-only (no fuel drain) — required before any harvesters can sustain
4. Harvester blueprint placement: deposit proximity check, placement efficiency indicator (% of optimal BER)
5. In-world harvester UI panel: fuel gauge, hopper bar, efficiency %, warning states
6. Manual refuel interaction: Gas Canister item + harvester interact → fuel transfer
7. Manual hopper empty: interact → retrieve [N] units → add to player carry inventory
8. Wire drone FUEL and EMPTY task hooks (stubs; full implementation in `04_drone_swarm.md`)
9. `crystal_harvester.gd` — same pattern as mineral, different ore types
10. Heavy and Elite tier harvesters
11. Research Lab: `research_lab.gd`, `sample_analysis.gd` — sample item intake, 2-min analysis timer, attribute reveal
12. Harvester degradation system (optional — implement behind settings toggle)
13. `cave_drill.gd` (Planet B), `gas_trap.gd` (Planet C) — after base system is stable
14. HARVEST FLORA behavior (Planet B) — coordinate with drone zone system in `04_drone_swarm.md`
