# Spec 17 — World Generation & Planet Surface Layout

**Context:** VoidYield's planets are hand-crafted .tscn files, not procedurally generated. This spec defines the physical layout of each planet surface: map dimensions, zone composition, Industrial Site placement, deposit spawn rules, and fixed landmark positions. The deposit quality values are rolled fresh each sector using concentration as a quality weight (higher concentration = higher OQ floor), but the positions are fixed. Planet C is the exception — Void-Touched Ore quality attributes re-roll every 2–4 in-game hours.

---

## Dependencies

- `01_resource_quality.md` — ore types and their attribute caps; deposit sizes and yield ranges
- `03_harvesters.md` — harvester slot limits per deposit size
- `09_planets.md` — planet identities, Industrial Site slot counts, Planet C shifting deposit mechanic
- `02_surveying.md` — Survey Tool range per planet (atmospheric interference on Planet B/C)

---

## 1. Map Generation Approach

All planets are **hand-crafted .tscn files** — not procedurally generated. This gives full artistic and design control over terrain shape, zone placement, and landmark positions.

**Deposit seed values** are fixed per planet per sector: positions are always the same, but quality attribute rolls (OQ, ER, FL, etc.) are re-rolled fresh each new sector run, using the deposit's concentration value as a quality weight:

```
OQ_min_for_this_deposit = ore_class_oq_min + (concentration / 100) × (ore_class_oq_max - ore_class_oq_min) × 0.4
OQ_roll = random_range(OQ_min_for_this_deposit, ore_class_oq_max)
```

Higher-concentration deposits cannot roll the lowest quality values — this rewards survey precision not just with more ore, but with better ore.

**Quality lots:** All other attributes (ER, FL, MA, etc.) roll independently within the ore class caps. Quality is determined on planet arrival, not on world generation.

**Implementation:** Each planet is a separate .tscn file in `scenes/world/`. Deposit spawn positions are defined in JSON data files. Industrial Site markers are `IndustrialSite` nodes with an `is_occupied: bool` property and a `site_id: String`.

---

## 2. A1 — Iron Rock (Starting Asteroid)

**Map dimensions:** 2,800 × 2,000 px

### Zones

**Outpost Zone** (center-west of map, ~400 × 300 px cleared area):
Pre-placed buildings present at game start (cannot be removed, only interacted with):
- Shop / Trade Terminal
- Drone Bay (starter bay, radius 400 px)
- Storage Silo (starter, 500 unit capacity)
- Sell Terminal
- Launchpad (visible as a cleared landing pad — structure must be built by player)
- Spaceship (wreck or empty pad — replaced by Launchpad buildable)

**Ore Field Zones (3 named areas):**
- **Inner Field** (near Outpost, ~600 × 400 px): Vorax deposits only; 3–4 deposits; small to medium size; lowest ER values on A1 (ER 400–550)
- **Mid Belt** (center of map, ~800 × 500 px): Vorax + Krysite deposits; 5–6 deposits total (4 Vorax, 1–2 Krysite); medium to large size; standard ER values (ER 550–750)
- **Outer Ring** (map edges, wraps outer perimeter): Vorax + Krysite + Raw Crystal Formations; 6–8 deposits; medium to large Vorax; 1–2 Krysite; 3 fixed Raw Crystal Formation locations; highest ER values on A1 (ER 700–850)

### Industrial Sites

6 flat clearings, pre-marked with a foundation grid texture. Each is an `IndustrialSite` node:

| Site ID | Location | Notes |
|---|---|---|
| A1-S1 | Adjacent to Outpost (west) | Closest to starter area — first expansion |
| A1-S2 | Adjacent to Outpost (north) | |
| A1-S3 | Inner Field edge | Near first ore deposits |
| A1-S4 | Mid Belt center | Prime factory location |
| A1-S5 | Mid Belt east | |
| A1-S6 | Outer Ring south | Farthest from Outpost — high-ER deposits nearby |

### Deposit Spawn Rules

- **Vorax:** Guaranteed in all 3 zones. Total: 8–10 Vorax deposits across A1. OQ 50–900, typical 400–700.
- **Krysite:** Mid Belt + Outer Ring only. Total: 2–3 Krysite deposits. OQ 100–850, typical 500–750.
- **Raw Crystal Formations:** Outer Ring only, 3 fixed locations. Hand-harvest only until Crystal Bore tech node 1.Z.
- **Gas deposits:** Scattered across all zones; 4–5 gas deposits; PE 400–650 (lower than Planet B).

### Cave Entrances

None on A1 — no cave systems.

### Data File

`data/deposits_a1.json` — fixed deposit positions, ore types, size class, and concentration range per deposit.

---

## 3. Planet B — Vortex Drift

**Map dimensions:** 3,200 × 2,400 px

### Zones

**Landing Zone** (~300 × 200 px flat area near map center): The player arrives here on first landing. Small cleared area with no pre-placed buildings. Deliberately near mid-map so the player must choose which direction to explore.

**Ore Field Areas:**
- **Surface Plains** (center-north, large): Shards deposits; 5–6 deposits; medium to large; lowest cave depth
- **Northern Reaches** (north edge): Aethite deposits (2–3) + occasional Shards; long-lived deep deposits
- **Deep Caverns** (south portion — underground zone, cave terrain): Voidstone (3 deposits at fixed cave entrances) + Aethite (1–2 additional)

**Bio-Resin Flora Zones (3 pre-placed patches):**
- Zone 1 (west of landing zone, ~200 × 150 px): 8–12 Aethon Flora organisms
- Zone 2 (north of Northern Reaches, ~250 × 200 px): 10–15 organisms; partially obscured by cave entrance terrain
- Zone 3 (east edge, ~180 × 120 px): 6–8 organisms; smaller but accessible early

**Atmospheric Interference:** Full planet. Survey Tool range reduced 40%. Speeder with Vehicle Survey Mount upgrade restores 20% of that reduction. No survey exemption zones on Planet B.

### Industrial Sites

14 clearings:

| Group | Count | Location | Notes |
|---|---|---|---|
| Near Landing | 4 sites | Within 400 px of landing zone | First accessible — early outpost expansion |
| Distributed | 10 sites | Across planet (3 north, 3 mid, 4 south near caverns) | Some require Speeder to reach efficiently |

### Deposit Spawn Rules

- **Shards:** Everywhere (Surface Plains + mid zones). Total: 6–8 Shards deposits. CR 600–900, CD 550–850.
- **Aethite:** Northern Reaches + Deep Caverns only. Total: 3–5 Aethite deposits. OQ 80–920. Long-lived (40–80 hrs at medium BER).
- **Voidstone:** Deep Caverns only. 3 fixed deposit locations (one per cave entrance). Requires Cave Drill. OQ 200–980.
- **Bio-Resin:** 3 pre-placed Flora Zones (surface only). Cannot be harvested with mineral harvesters — HARVEST FLORA drone behavior only.
- **Gas deposits:** Surface and cave zones; 4–5 gas deposits; PE 650–900 (high-PE — best Rocket Fuel source in game).

### Cave Entrances

4 pre-placed cave entrance locations. Each entrance is a `CaveEntrance` node and is the only valid placement point for a Cave Drill. Cave entrances are visually distinct (dark terrain recess + subtle glow).

| Entrance ID | Location | Voidstone Below? |
|---|---|---|
| B-CAVE-1 | South-west Deep Caverns | Yes |
| B-CAVE-2 | South Deep Caverns | Yes |
| B-CAVE-3 | South-east Deep Caverns | Yes |
| B-CAVE-4 | Far south (hidden) | No — but has bonus Aethite |

### Data File

`data/deposits_planet_b.json` — fixed deposit positions, ore types, size class, and concentration range. Cave entrances and Flora Zone polygons are defined in `data/planet_b_landmarks.json`.

---

## 4. Planet C — Shattered Ring (Endgame)

**Map dimensions:** 4,000 × 3,000 px

### Terrain

Shattered terrain (broken tile pattern — fragmented rock slabs with gaps and irregular surfaces). Pathfinding between Industrial Sites is deliberately challenging: drones and the player cannot take straight-line paths, increasing travel times and adding difficulty vs. the other planets. Shortest-path routing matters more here than anywhere else.

### Zones

**No defined outpost zone** — Planet C has no pre-built structures. Player arrives via Shuttle from Cargo Ship relay (see note on High Radiation Interference in `09_planets.md`).

**Ore Field Areas:**
- **Shattered Flats** (west half): Void-Touched Ore deposits; 6–8 deposits; quality variance is extreme (OQ 150–950 on same deposit across batches)
- **Rift Zone** (center): Void-Touched Ore (higher concentration) + 3 Resonance Crystal formations (fixed locations, finite cracking cycles)
- **Geyser Fields** (east half): Dark Gas geyser vents (8 fixed locations) + additional Void-Touched Ore

### Industrial Sites

18 clearings:

| Group | Count | Location | Notes |
|---|---|---|---|
| Western Access | 6 sites | West edge (Shattered Flats) | Easier pathfinding — closer together |
| Rift Zone | 6 sites | Center of map | Near Resonance Crystal formations |
| Eastern Reach | 6 sites | East near Geyser Fields | Hardest to connect — most isolated |

Pathfinding between site groups is intentionally non-trivial. Relay Stations are especially valuable on Planet C to extend drone service radius across terrain gaps.

### Deposit Spawn Rules

- **Void-Touched Ore:** Everywhere on Planet C. 10–12 deposits. Quality scrambled per batch (OQ 150–950, no pattern). Survey reads concentration and ER accurately, but attribute quality is unknown until refined.
- **Resonance Crystal Formations:** 6 fixed locations (3 in Rift Zone, 2 in Shattered Flats, 1 near east Geyser Fields). Finite — each supports 3–5 crack cycles before permanent depletion. Do not respawn.
- **Dark Gas Geyser Vents:** 8 fixed locations (Geyser Fields, east half). Gas Trap placement only. ~1 eruption per 8 min, 50–80 Dark Gas units/burst.
- **No standard Gas deposits:** All gas on Planet C is Dark Gas from geysers. No Gas Collectors.

### Shifting Deposits — Void-Touched Ore Concentration Re-roll

Every 2–4 in-game hours (randomized per deposit), Void-Touched Ore deposits re-roll their concentration maps ±30%:
- The deposit does not move (position is fixed)
- The concentration gradient shifts — the previous peak location may no longer be the peak
- Quality attribute values re-roll independently of concentration
- Survey markers placed before a re-roll event go stale (the concentration % shown is now wrong)
- A stale marker is flagged with an amber "STALE — RESURVEY" badge in-world and on minimap
- Planet C never truly runs itself — active resurveying is an ongoing task

The re-roll timer per deposit is stored in `GameState` and serialized in the save file. Planet C survey data does NOT persist across prestige (see `09_planets.md` §5).

### Resonance Crystal Formations — Fixed Positions

| Formation ID | Location | Crack Cycles Remaining (fresh sector) |
|---|---|---|
| C-XTAL-1 | Rift Zone north | 5 |
| C-XTAL-2 | Rift Zone center | 4 |
| C-XTAL-3 | Rift Zone south | 5 |
| C-XTAL-4 | Shattered Flats mid | 3 |
| C-XTAL-5 | Shattered Flats east | 4 |
| C-XTAL-6 | East near Geyser Field | 3 |

### Geyser Vent Positions

8 fixed geyser vent locations in the east Geyser Fields. All are valid Gas Trap placement sites. Vent eruption timers are independent per vent (not synchronized).

### Data File

`data/deposits_planet_c.json` — fixed deposit positions, ore types, size class, initial concentration ranges, and re-roll intervals. Resonance Crystal formation positions and crack cycle maximums in `data/planet_c_landmarks.json`. Geyser vent positions in `data/planet_c_landmarks.json`.

---

## 5. Implementation Notes

### Node Structure

```
scenes/world/
  planet_a1.tscn          # A1 full map (2,800 × 2,000)
  planet_b.tscn           # Planet B full map (3,200 × 2,400)
  planet_c.tscn           # Planet C full map (4,000 × 3,000)
  planet_a3.tscn          # A3 (future sector endpoint)
  planet_a2.tscn          # A2 transit asteroid (see 00_a2_transit.md)
```

### IndustrialSite Node

Each Industrial Site clearing is an `IndustrialSite` node in the planet .tscn:

```gdscript
# scripts/world/industrial_site.gd
class_name IndustrialSite
extends Area2D

@export var site_id: String = ""
@export var is_occupied: bool = false
@export var building_type: String = ""   # what's currently placed here

func occupy(building: String) -> void:
    is_occupied = true
    building_type = building

func free_site() -> void:
    is_occupied = false
    building_type = ""
```

### Deposit Spawn Data Format

`data/deposits_a1.json`:
```json
{
  "deposits": [
    {
      "deposit_id": "a1_vorax_001",
      "ore_type": "vorax",
      "position": {"x": 340, "y": 820},
      "size_class": "medium",
      "concentration_peak_range": [0.60, 0.82],
      "zone": "inner_field"
    },
    {
      "deposit_id": "a1_krysite_001",
      "ore_type": "krysite",
      "position": {"x": 1840, "y": 1100},
      "size_class": "large",
      "concentration_peak_range": [0.55, 0.78],
      "zone": "mid_belt"
    }
  ]
}
```

Quality attributes (OQ, ER, FL, etc.) are rolled fresh each sector at planet arrival using the concentration_peak as a quality weight floor.

### Implementation Order

1. Define `IndustrialSite` node class — `is_occupied` property, `occupy()` / `free_site()` methods
2. Build `planet_a1.tscn` — terrain, Outpost Zone buildings, 6 IndustrialSite nodes, deposit spawn positions from `data/deposits_a1.json`
3. Wire deposit spawn: on planet load, `DepositMap.generate_from_json(planet_id)` reads the JSON, rolls quality attributes, instantiates invisible `Deposit` nodes at positions
4. Build `planet_b.tscn` — terrain, landing zone, 14 IndustrialSite nodes, cave entrance nodes, Flora Zone polygons, deposit JSON
5. Build `planet_c.tscn` — shattered terrain, 18 IndustrialSite nodes, Crystal Formation nodes, Geyser Vent nodes, deposit JSON
6. Implement Planet C re-roll timer in `DepositMap` — per-deposit timer; on expiry, re-roll concentration and quality, flag stale survey markers
7. `planet_a3.tscn` — Void Nexus; Ferrovoid deposits; Warp Gate placement zone; Galactic Hub placement zone
8. `planet_a2.tscn` — transit asteroid (see `00_a2_transit.md`)
