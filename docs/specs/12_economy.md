# Spec 12 — Economy Model & Key Numbers

**Context:** This spec is the balance reference sheet. It contains harvester income projections, CR/min benchmarks by phase, rocket construction cost models, and gas economy sizing. Use this document when tuning harvester BER values, ore prices, factory throughput, or pacing decisions. All numbers here are based on the BER formula in `03_harvesters.md` and the quality system in `01_resource_quality.md`.

---

## Dependencies

- `03_harvesters.md` — the BER formula this spec builds on; harvester tier stats (BER, gas/hr, hopper size)
- `01_resource_quality.md` — ore sell prices; deposit concentration and ER attribute ranges
- `05_factories.md` — refinery ratios (3 Vorax → 1 Steel Plate; 2 Krysite → 1 Alloy Rod); factory throughput numbers

---

## 1. Sell Prices (Raw and Refined)

Vorax processing is a **two-step chain** requiring two separate buildings:

| Step | Input | Building | Output | CR/unit output | Notes |
|---|---|---|---|---|---|
| Raw | Vorax Ore (1 CR/unit) | — | — | 1 | Sell raw (poor value) |
| Step 1 | 3 Vorax Ore | Ore Smelter (Processing Plant) | Steel Bars | — | Intermediate only; not sold directly |
| Step 2 | 1 Steel Bar | Plate Press (Processing Plant) | Steel Plate | 5 | Final sellable product |

The Plate Press runs at 8/min. To keep it supplied 1:1, the Ore Smelter must run at ≥ 8 Steel Bars/min (it runs at 12/min, so a single Ore Smelter can feed a single Plate Press with headroom). **The Plate Press is required to produce Steel Plates** — Steel Bars are an intermediate material, not the finished product.

| Resource | Raw CR/unit | Final Refined form | Refined CR/unit | Full chain |
|---|---|---|---|---|
| Vorax Ore | 1 | Steel Plate | 5 | Ore Smelter → Steel Bars → Plate Press → Steel Plates (3 Vorax → 1 Plate, 2 buildings) |
| Krysite | 5 | Alloy Rod | 20 | Alloy Refinery → 2 Krysite → 1 Rod |
| Aethite | 8 | Crystal Lattice | 30 | Crystal Processor → 2 Aethite → 1 Lattice |
| Voidstone | 15 | Void Core | 60 | 1 Voidstone → 1 Core |
| Gas | 0.5 | (primarily consumed, not sold) | — | — |
| Shards | 3 | Energy Cell | 10 | 3 Shards → 1 Cell |

**Refining is always worth it** for Vorax: raw value is 0.33 CR/unit of ore; refined value (Steel Plate) is 1.67 CR/unit of ore. Refining gives a 5× multiplier on effective value — but requires BOTH the Ore Smelter AND the Plate Press to be running.

---

## 2. Harvester Income Projections

### BER Formula Reminder
```
Units/min = BER × (Concentration / 100) × (ER / 1000) × Upgrade_Multiplier
```

### Personal Mineral Harvester (BER 5) — Examples

| Concentration | ER | Units/min | Units/hr | Raw CR/hr | Refined CR/hr (Steel Plates) |
|---|---|---|---|---|---|
| 30% | 300 | 0.45 | 27 | 27 | 45 |
| 50% | 500 | 1.25 | 75 | 75 | 125 |
| 75% | 700 | 2.63 | 158 | 158 | 263 |

### Medium Mineral Harvester (BER 11) — Examples

| Concentration | ER | Units/min | Units/hr | Raw CR/hr | Refined CR/hr |
|---|---|---|---|---|---|
| 50% | 500 | 2.75 | 165 | 165 | 275 |
| 72% | 640 | 5.07 | 304 | 304 | 507 |
| 95% | 850 | 8.87 | 532 | 532 | 887 |

### Heavy Mineral Harvester (BER 20) — Examples

| Concentration | ER | Units/min | Units/hr | Raw CR/hr | Refined CR/hr |
|---|---|---|---|---|---|
| 50% | 500 | 5.00 | 300 | 300 | 500 |
| 75% | 700 | 10.50 | 630 | 630 | 1,050 |
| 90% | 850 | 15.30 | 918 | 918 | 1,530 |

**The survey dividend:** The excellent deposit (90% concentration, ER 850) produces 45% more than the good one (75%, ER 700). Survey quality is the most effective "upgrade" in the game — worth more than most tech tree nodes.

---

## 3. CR/min Benchmarks by Phase

| Phase | Typical Setup | CR/min |
|---|---|---|
| Phase 0 | Manual mining only | 10–20 CR/min |
| Phase 1 | 2× Personal Harvesters + manual carry | 30–60 CR/min |
| Phase 2 | 4× Medium Harvesters + drone circuit | 120–200 CR/min |
| Phase 3 | 2× Heavy Harvesters + Refinery + 10 drones | 350–600 CR/min |
| Phase 4 | A1 + Planet B fully automated | 1,000–2,000 CR/min |
| Phase 5 | A1 + Planet B + A3 + Galactic Hub | 4,000–8,000 CR/min |

**Phase gate check:** Each phase graduation event should feel like it unlocks access to the next CR/min tier. The Drone Circuit graduation (Phase 2) should roughly triple CR/min vs. Phase 1. The spacecraft launch graduation should get the player to Phase 4 rates within one play session on Planet B.

---

## 4. Rocket Construction Cost Model

| Component | Materials (approx CR equiv.) | Craft Time |
|---|---|---|
| Launchpad (prerequisite building) | ~1,400 CR | Build: 2 min |
| Hull Assembly | 120 Steel Plates (~600 CR raw ore equiv.) | 3 min fabricate |
| Engine Assembly | 50 Steel + 20 Alloy + 10 Crystal Lattices (~1,600 CR) | 4 min |
| Fuel Tank | 40 Steel + 15 Alloy + 5 Energy Cells (~950 CR) | 2 min |
| Avionics Core | 15 Crystal Lattices + 10 Alloy + 5 Void Cores (~2,200 CR) | 5 min |
| Landing Gear | 20 Steel + 8 Alloy (~340 CR) | 90 sec |
| Rocket Fuel (100 units) | 300 Gas units → ~150 CR of gas | — |
| **Total** | **~7,000–8,000 CR equivalent materials** | ~17 min craft time |

Compared to v0.1's ~2,655 CR total — the rocket is substantially more expensive and requires materials from Planet B (Aethite for Crystal Lattices, Voidstone for Void Cores). This is intentional. The 30-60 minute construction window is the design target for a focused session at Phase 3 income rates (350–600 CR/min).

**Void Core fallback note:** The Avionics Core requires 5 Void Cores, which are Planet B exclusive. If unavailable, the schematic falls back to 20 Alloy Rods (worse quality outcome, functional). This allows a minimum-viable first launch without Planet B materials.

---

## 5. Gas Economy

### Gas Consumption Rates

| Setup | Gas/hr consumed |
|---|---|
| 2× Personal Mineral Harvesters | 6 gas/hr |
| 5× Medium Mineral Harvesters | 40 gas/hr |
| 3× Heavy Crystal Harvesters | 66 gas/hr |
| Full Phase 3 setup (~10 harvesters mixed) | ~150 gas/hr |

### Gas Production

**Personal Gas Collector (BER 6) at 50% concentration, PE 500:**
```
6 × 0.50 × 0.50 = 1.5 units/min = 90 gas/hr
```

For Phase 3 consumption of ~150 gas/hr: need approximately 2× Medium Gas Collectors (each ~200 gas/hr at average concentrations).

**Gas balance guideline:** Always maintain ~2× hourly consumption in gas production capacity. Gas shortage kills harvester networks; over-investing in gas production wastes deposit slots.

### Gas Quality Impact on Fuel

Planet B gas PE values (PE 650–900) vs. A1's PE (400–650). When converted to Rocket Fuel via Fuel Synthesizer (3 Gas → 1 Rocket Fuel), high-PE gas produces fuel that burns 20–35% more efficiently. This makes Planet B's gas deposits critically valuable for inter-planet operations.

---

## 6. Research Point Economy

| Milestone | RP/min Required | Approximate Time to Key Nodes |
|---|---|---|
| Phase 2 start | 1.0 RP/min (1 Research Lab) | 1.A Drone Drill I (50 RP) = 50 min |
| Phase 3 | 1.5 RP/min (2 Labs) | 2.X Fabricator Unlock (800 RP) = ~9 hr from scratch |
| Phase 4 | 1.75 RP/min (3 Labs) | 3.P Warp Theory (2,000 RP) = ~19 hr from scratch |

**Crystal Lattice acceleration:** Consuming 1 Crystal Lattice = +10 RP instant. At Phase 3 production rates of ~4 Lattices/min (Crystal Processor), burning Lattices for RP vs. selling them is a meaningful trade-off decision.

---

## 7. Power Economy

**Power generation:** Solar Panel = 2 Power/sec. Battery Bank = 300 Power stored.

**Power consumption benchmarks:**
- Early base (3× Processing Plants, 1× Drone Bay, 1× Research Lab): 3(3) + 0 + 3 = 12 Power/sec
- Mid base (same + 2× Fabricators + Ore Refinery): 12 + 8(2) + 5 = 33 Power/sec
- Late base (add Assembly Complex, Trade Hub, Cargo Ship Bay): 33 + 15 + 4 + 10 = 62 Power/sec

To sustain 62 Power/sec: 31 Solar Panels needed. Max 10 per zone → need 4 zones of solar panels. Battery Banks buffer night cycles or peak demand spikes.

**Energy Efficiency I/II tech nodes** (2.A/2.B): 15% + 15% power reduction = 27.75% less total draw. Significant late-game value.

---

## 8. Building Cost Summary

Quick reference for all building costs in the game:

| Building | CR Cost | Material Cost | Slots |
|---|---|---|---|
| Gas Canister Rack | 60 | 5 Steel Plates | — |
| Storage Silo | 200 | 15 Steel Plates | — |
| Storage Silo → Pressurized Silo upgrade | 600 | 30 Steel Plates | — |
| Storage Silo → Industrial Silo upgrade | 2,000 | 80 Steel Plates + 20 Alloy Rods | — |
| Solar Panel | 80 | 5 Steel Plates + 3 Energy Cells | — |
| Battery Bank | 250 | 10 Steel Plates | — |
| Crafting Station | 400 | 20 Steel Plates + 10 Alloy Rods | 0 slots (not placed at Industrial Site — player workbench, placed anywhere in world, requires physical player interaction) |
| Ore Refinery | 800 | 25 Steel Plates + 10 Alloy Rods | — |
| Research Lab | 1,500 | 30 Crystal Lattices | 2 |
| Fuel Synthesizer | 600 | 15 Steel Plates + 8 Alloy Rods | — |
| Fabricator | 2,000 | 50 Steel Plates + 25 Alloy Rods | 2 |
| Drone Bay | — (included w/ first drone purchase) | — | 1 |
| Habitation Module | 800 | 20 Steel Plates + 10 Alloy Rods | 1 |
| Relay Station | 500 | 15 Alloy Rods | — |
| Launchpad | 500 | 80 Steel Plates + 30 Alloy Rods + 20 Energy Cells | 3 |
| Cargo Ship Bay | 5,000 | 100 Steel Plates + 30 Void Cores | 2 |
| Trade Hub | 3,000 | 40 Alloy Rods + 20 Crystal Lattices | — |
| Drone Fabricator | 8,000 | 60 Steel Plates + 40 Alloy Rods + 20 Crystal Lattices | — |
| Warp Gate | 20,000 | 50 Void Cores + 100 Alloy Rods | — |
| Galactic Hub | 30,000 | 200 Steel Plates + 100 Alloy Rods + 50 Void Cores + 30 Crystal Lattices | — |

---

## Implementation Notes

### Data File Location

`data/ore_prices.json`:
```json
{
  "vorax_raw": 1,
  "vorax_steel_plate": 5,
  "krysite_raw": 5,
  "krysite_alloy_rod": 20,
  "aethite_raw": 8,
  "aethite_crystal_lattice": 30,
  "voidstone_raw": 15,
  "voidstone_void_core": 60,
  "gas_raw": 0.5,
  "shards_raw": 3,
  "shards_energy_cell": 10
}
```

`data/buildings.json` — building definitions including CR cost, material cost, slot count, power draw.

### Relevant Existing Scaffolding

- `autoloads/game_state.gd` — `ore_prices` dictionary; `credits` float; extend with per-resource storage tracking
- `scenes/ui/SellTerminal.gd` — existing sell terminal uses ore_prices; extend to read updated prices
- Trade Hub building (when built): auto-sell configured ore types using the same price lookup

### Balance Notes for Tuning

1. **Phase pacing:** If Phase 2 income (120–200 CR/min) is reached too early, drones unlock before the harvester maintenance friction has been felt long enough. Tune Phase 1 costs upward or Phase 2 drone prices slightly higher if this happens.

2. **Rocket cost gate:** The rocket must feel like a significant undertaking at Phase 3 income. At 350 CR/min, the 7,000–8,000 CR material equivalent represents ~20–23 minutes of income. This is appropriate — players should supplement with active selling of refined materials to accelerate.

3. **Gas balance:** If harvesters are running dry frequently in playtests, the Gas Collector BER may need to be higher, or Personal Harvester gas/hr reduced. The design intent is that players are gas-positive with 1 Gas Collector per 2 Personal Harvesters.

4. **RP pacing:** If the tech tree feels too slow, Crystal Lattice consumption is the primary accelerator. Ensure Crystal Lattices are available at a reasonable rate before gating nodes like 2.X Fabricator Unlock (800 RP) behind 9 hours of RP grind.
