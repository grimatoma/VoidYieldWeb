# Spec 09 — Planets, Stranding & Sector System

**Context:** This spec covers three interrelated systems: the identity and constraints of each planet (what you can extract, where, and how), the stranding mechanic that makes each first landing a commitment, and the Industrial Site slot system that forces planet specialization without locking it. Also covers the prestige/sector system that resets the run with stacked bonuses.

Visual mockups: `design_mocks/07_planet_stranding_loop.svg`, `design_mocks/10_planet_comparison.svg`, `design_mocks/20_galaxy_map.svg`, `design_mocks/22_asteroid_b_world.svg`.

---

## Dependencies

- `01_resource_quality.md` — planet-specific ore types and their attribute caps
- `03_harvesters.md` — unique harvesting methods per planet (Cave Drill, Gas Trap, Resonance Charge Cracking, HARVEST FLORA)
- `05_factories.md` — Industrial Site slot costs per building; planet slot counts constrain factory configuration
- `10_spacecraft.md` — stranding resolved only by producing ≥100 units Rocket Fuel; Launchpad occupies 3 slots
- `07_logistics.md` — cross-planet resource dependencies create the logistics network

---

## 1. Planet Identities

Each planet has a distinct resource vocabulary — a biome identity that determines what you can extract, how you extract it, and what you need from other planets to make use of it. No planet is self-sufficient for endgame crafting.

---

### A1 — Iron Rock (Asteroid Field, Starting Zone)

| Resource | Rarity | Deposit Depth | Harvester Type |
|---|---|---|---|
| Vorax Ore | Common | Surface / Shallow | Mineral Harvester |
| Krysite | Uncommon | Shallow / Mid | Crystal Harvester |
| Raw Crystal Formations | Rare | Surface clusters | Hand-harvest only (until Crystal Bore upgrade) |

**Vorax Ore** — the backbone of the industrial chain. Typical OQ 400–700, MA 450–750. Steel Plates refined from Vorax are the most-consumed material in the game. Deposit density is higher on A1 than anywhere else — bulk extraction is this planet's defining strength.

**Krysite** — alloy-grade mineral with high MA and SR values. Found in vein clusters extending deeper than Vorax seams. Yield is slower but quality is consistent. The primary source of Alloy Rods.

**Raw Crystal Formations** — small clusters of exposed crystal. In Phase 1–2, players chisel these by hand (5–20 Crystal Shards per node, no quality attributes). Tech Tree node **1.Z Crystal Bore** (Extraction branch, 400 RP + 1,500 CR, requires 1.C Drone Drill III) is required to place automated Crystal Bore extractors on these formations. See `11_tech_tree.md` Branch 1 for the unlock node.

**Surface Characteristics:**
- Lowest gravity → fastest player movement on foot
- Full Survey Tool range — no atmospheric interference; 100% scan range
- Shallow deposits exhaust in 6–20 hrs at medium BER (fastest depletion of any planet)
- Excellent ER values (ER 550–850 typical) — high extraction speed compensates for shorter lifespan
- Concentration peaks usually within 30px of the initial reading — easiest planet to survey precisely

**What only exists here:** Vorax in bulk. Other planets have trace Vorax deposits but nowhere near sufficient density for Steel Plate production at scale. A1 remains a critical export source throughout the entire game.

**Cross-planet dependency:** Alloy Rods (refined from Krysite) are needed on every other planet for construction and crafting. A1 must keep running for the supply chain to function.

---

### Planet B — Vortex Drift (First Destination)

| Resource | Rarity | Deposit Depth | Harvester Type |
|---|---|---|---|
| Shards | Common | Mid-depth | Mineral Harvester |
| Aethite | Uncommon | Deep | Crystal Harvester |
| Voidstone | Rare | Deep cave systems | Cave Drill (required) |
| Bio-Resin | Unique | Living flora (surface) | HARVEST FLORA drone behavior |

**Shards** — energy-conductive mineral with naturally high CR and CD values (typical CR 600–900, CD 550–850). No other planet produces Shards in usable quantity. Refined into Crystal Lattices and Energy Cells.

**Aethite** — crystalline ore with extreme CD and high OQ. The primary research material. Crystal Lattices from Aethite feed Research Labs for RP generation. Deposits are deep and long-lived (40–80 hrs at medium BER).

**Voidstone** — dark matter-infused ore found only in Vortex Drift's cave networks. Survey Tool signal oscillates near caves rather than climbing steadily — a deliberate "something is different here" cue. Requires Cave Drill placed at a cave entrance. Produces Void Cores — essential for Avionics Core and Warp Gates.

**Bio-Resin** — secreted by Aethon Flora: alien plant organisms that glow faintly in Planet B's dim light. Drones assigned HARVEST FLORA behavior collect resin passively. Used in insulation components and bio-circuits. Cannot be synthesized — no Bio-Resin means no bio-circuits. The player is disincentivized from bulldozing flora zones for building space (flora does not regrow when displaced).

**Surface Characteristics:**
- Atmospheric interference reduces Survey Tool range by 40% (Speeder's Vehicle Survey Mount restores 20% of that reduction)
- Deposits are substantially deeper and longer-lived (30–80 hrs at medium BER)
- Gas deposits here have significantly higher PE (PE 650–900 vs. A1's PE 400–650) — Planet B gas makes 20–35% more efficient Rocket Fuel
- Low-light surface environment — drones have 15% reduced pathfinding speed without a Sensor Array upgrade

**What only exists here:** Bio-Resin (no substitute); Voidstone in useful quantities; high-PE gas for efficient Rocket Fuel.

**Planet B exclusive building — Atmospheric Water Extractor:** Since Planet B has no Ice Ore, Water must be produced locally via this building (1 Industrial Site slot, 600 CR + 10 Steel Plates + 5 Alloy Rods). Produces 2 Water/cycle (12s cycle), no input required — extracts from Planet B's atmosphere. Using this building substantially reduces the need to import Water from A1 via Cargo Ship. See `06_consumption.md` for Water demand rates.

**Cross-planet dependency:** Void Cores needed on A1 (Warp Gates) and A3 (Galactic Hub); Crystal Lattices exported to all planets; high-PE gas fuels the inter-planet fleet. Water is locally producible on Planet B (Atmospheric Water Extractor) or imported from A1.

---

### Planet C — Shattered Ring (Endgame)

| Resource | Rarity | Deposit Depth | Harvester Type |
|---|---|---|---|
| Void-Touched Ore | Common | Variable | Mineral or Crystal Harvester |
| Resonance Crystals | Unique | Surface formations | Resonance Charge Cracking |
| Dark Gas | Unique | Geyser vents | Gas Trap structure |

**Void-Touched Ore** — corrupted versions of basic ores warped by void radiation. Causes extreme quality variance: the same deposit yields batches with OQ 150 or OQ 950 with no predictable pattern. Survey readings are accurate for concentration and ER, but attribute quality is scrambled until refined. Planet C is gambling on premium ore: high ceiling, real risk of waste, impossible to pre-optimize.

**Resonance Crystals** — massive mineral formations. Cannot be mined with any harvester. Requires Resonance Charge cracking (see `03_harvesters.md`). Each formation supports only 3–5 crack cycles before depleting permanently — total supply is finite per sector run.

**Dark Gas** — erupts from unstable geyser vents. Requires Gas Trap structure (not Gas Collector). Required to fuel Elite-tier harvesters, Cave Drills, and the Warp Drive.

**Surface Characteristics:**
- Unstable terrain — deposits shift location over time. Survey markers go stale every 2–4 in-game hours. Resurveying is mandatory and ongoing.
- Highest potential reward deposits in the game
- Geyser fields are the only gas source on this planet
- High radiation interference — Shuttle is required to land (Cargo Ships offload to a Shuttle relay)

**What only exists here:** Resonance Crystals; Dark Gas; the high-quality ceiling of Void-Touched Ore.

**Cross-planet dependency:** Resonance Crystal Shards needed for Warp Gates and the Galactic Hub; Dark Gas fuels the endgame fleet.

---

### Planet A3 — Void Nexus

- All five ore types spawn in moderate quantities
- Quality distribution is wider — both very low and very high attribute values are more common (more variance = more hunting required, more rewards)
- Unique ore: **Ferrovoid** (A3 exclusive) — combines properties of Vorax and Voidstone; used only in the Galactic Hub construction schematic
- **Unlock condition:** Visit A2 AND have produced 10 Void Cores

**Warp Gate (A3 Primary Location):** Once built at A3 (requires tech node 3.P Warp Theory, build cost: 20,000 CR + 50 Void Cores + 100 Alloy Rods), the Warp Gate enables **instant player travel** between any two planets that each have a Warp Gate — minimum two gates required. Unlike Jump Relays (which move *goods*), Warp Gates move the **PLAYER** instantly, consuming no Rocket Fuel for the player character. The Warp Gate at A3 also serves as part of the Sector Complete unlock condition: when all three main planets (A1, Planet B, Planet C) are at Phase 4+ automation, the Warp Gate is built at A3, and the Galactic Hub is complete, the Sector Complete sequence triggers. See `11_tech_tree.md` §5 Warp Gate for full details.

---

## 2. Industrial Sites & Planet Constraints

### What Industrial Sites Are

Industrial Sites are designated construction zones on each planet — cleared, leveled areas with infrastructure hookups (power conduits, storage connections, drone pathfinding anchors). They are the scarce resource that forces planet specialization.

Harvesters placed at ore deposits use **Deposit Slots** (each deposit supports 1–3 harvesters based on deposit size). Surface infrastructure like Survey Markers and Relay Stations are slot-free. Industrial Sites are specifically for production buildings.

**Deposit Slot Table:**

| Deposit Size | Harvester Slots |
|---|---|
| Small | 1 |
| Medium | 2 |
| Large | 3 |
| Motherlode | 3 (accepts one Heavy Harvester as the single occupant — too dense for multiple standard harvesters) |

See `03_harvesters.md` §2 for full deposit slot rules and placement constraints.

### Slot Capacity by Planet

| Planet | Type | Industrial Site Slots |
|---|---|---|
| A1 — Iron Rock | Small Asteroid | 6 slots |
| Planet B — Vortex Drift | Planet | 14 slots |
| Planet C — Shattered Ring | Large Planet | 18 slots |
| (Future Sector) — varies | — | 6–18 slots |

### Optimal A1 Configuration (6-slot puzzle)

With only 6 slots, A1 can never run a full production chain:

**Raw processing focus (recommended Phase 1–2):**
- 4× Processing Plant (Ore Smelter × 2, Alloy Refinery, Gas Compressor) → 4 slots
- 1× Drone Bay → 1 slot
- 1× Habitation Module → 1 slot
- **Total: 6 slots.** No Fabricators. Exports Steel Bars + Alloy Rods to Planet B for fabrication.

**Partial Fabrication (Phase 3 upgrade):**
- 3× Processing Plant → 3 slots
- 1× Fabricator → 2 slots
- 1× Drone Bay → 1 slot
- **Total: 6 slots.** One Fabricator for Drill Heads (A1 specialization). Habitation Module offloaded.

A1 never gets a Launchpad (3 slots) unless the player sacrifices 3 other buildings.

### Natural Planet Roles

**A1 — Raw Processing Hub:** Runs Processing Plants and exports raw processed materials. Typically one Drill Head Fabricator as a specialty.

**Planet B — Exotic Materials & Research:** Research Lab + Crystal Processor + Bio-Extractor + Cave Drill operations + Fabricators for Sensor Arrays and Power Cells + Launchpad.

**Planet C — Endgame Manufacturing:** 2–3 Assembly Complexes (Warp Capacitors, Navigation Cores, Jump Relay Modules), Gas Traps, Resonance cracking operations. Planet C always requires active attention — shifting terrain means it never truly runs itself.

### Site Expansion (Late Game)

Tech tree node "Site Expansion" (Phase 4, Expansion branch): adds +2 Industrial Sites to one planet (player's choice). Can be researched once per sector. Rewards late-game tech investment without trivializing early slot scarcity.

---

## 3. Planet Stranding

### The Commitment Mechanic

Every landing on a new planet is a commitment. The rocket burns fuel to enter atmosphere, and you cannot leave until you have enough fuel to launch again. This is not a survival game — there is no health drain, no hostile environment. But you are **stuck** until you build your way out.

This is the "Astroneer feeling": the first minutes on a new world are exciting and slightly vertiginous. You have tools, a small supply cache, and a blank planet to read.

### First Landing on Planet B

**Arrival conditions:**
- Player lands with 100 units of Rocket Fuel in the Fuel Tank (consumed during transit)
- Atmospheric entry burns 80 units — leaving 20 units in the tank
- Launch back to A1 requires 100 units (or 75 with high-PE Fuel Tank)
- The player is stranded until they can produce ≥100 units of Rocket Fuel from local resources

**Starting supplies (in personal inventory on arrival):**
- 1 Survey Tool (Tier I)
- 5 Gas Canisters (pre-filled from A1, 250 gas units total)
- 1 Personal Gas Collector deed (buildable immediately)
- 1 Personal Mineral Extractor deed
- 1 Crafting Station deed (small portable version)
- 50 Steel Plates (pre-carried)
- 10 Alloy Rods (pre-carried)
- 200 CR

**The immediate goal:** Find a Gas deposit, place the Gas Collector, wait for it to fill, convert gas to Rocket Fuel (Fuel Synthesizer: 3 Gas → 1 Rocket Fuel; need 300 Gas units for 100 Rocket Fuel).

**Timeline of first landing (typical):**
- 0:00 — Land. Survey tool reveals nearby gas deposit at 52% concentration. HUD shows: "FUEL REMAINING: 20 units — INSUFFICIENT FOR LAUNCH"
- 2:00 — Walk to deposit, place Personal Gas Collector
- 5:00 — First 20 gas units collected. Begin scouting for ore.
- 15:00 — Gas Collector hopper at 100 units. Deploy Mineral Extractor on nearby Aethite deposit.
- 30:00 — 300 gas units accumulated. Craft 100 Rocket Fuel at portable station.
- 30:00 — **Stranding resolved.** Can return to A1 any time.
- 30:00+ — Begin proper survey of Planet B. Discover Voidstone deposits. Start building permanent outpost.

**Key design beat:** The 30-minute stranding window is not a punishment — it's an exploration motivator. The player *has to* survey immediately to find gas. While looking for gas, they discover the Aethite and Voidstone deposit map.

### Return Trip Logistics

**Return to A1 from B:**
- Requires 100 Rocket Fuel in the Launchpad tank
- Player builds Launchpad on Planet B (same process, same cost)
- Or: uses the original rocket if it landed safely — it remains at the landing site as a reusable vehicle

**After first return:** Planet B Launchpad is established. Subsequent trips are quick: arrive, fuel already waiting (if drones maintained the Fuel Synthesizer), launch within minutes.

**Long-term stranding:** Once per-planet infrastructure is established, the stranding feeling disappears. The point is only the *first* visit — committing to exploration, not punishing permanent operations.

---

## 4. Galaxy Map

The Galaxy Map communicates empire status at a glance:
- **Active Cargo Ship routes:** Animated dotted lines between planets when a ship is in transit
- **Planet automation status:** Color-coded icons (gray = manual, yellow = partial, green = full automation)
- **Per-planet stats overlay:** Hover for CR/min, active drone count, harvester count, fuel level
- **A3 discovery animation:** Scans in from static noise when unlocked
- **Route efficiency:** Shows travel time and cargo capacity on each route

Visual mockup: `design_mocks/20_galaxy_map.svg`.

---

## 5. Prestige & Sector System

### Sector Complete

When all three planets are automated AND the Galactic Hub is built on A3, the player unlocks **Sector Complete**. A transmission arrives: *"Survey complete. All deposits catalogued. Sector extraction at maximum efficiency. Reassignment coordinates locked."*

**What resets:**
- All credits, ore, materials in storage
- All buildings (except Galactic Hub ruins — give 10% build cost discount next run)
- All tech tree progress (except the one retained node selected at prestige)
- Drone fleet

**What persists:**
- Sector Bonuses (stackable, chosen at each prestige)
- Survey data (deposit maps carry over — skip re-surveying on prestige). **Exception: Planet C survey data does NOT persist across prestige** — Planet C deposits shift positions every 2–4 in-game hours, so carried-over survey data would be immediately stale. Planet C must be re-surveyed each sector. All other planet survey data persists normally.
- Crafting schematics (once learned, always known)
- Sector Records

### Sector Bonuses (Choose 1 per Prestige)

| Bonus | Effect |
|---|---|
| Veteran Miner | Start with Drill Bit Mk.II unlocked |
| Fleet Commander | Start with 2 Scout Drones already deployed |
| Survey Expert | Start with Tier II Survey Tool and all deposit locations pre-marked on minimap |
| Trade Connections | +10% sell price permanently (stacks) |
| Refined Tastes | Refinery ratios improve by 10% |
| Research Heritage | Research Labs +50% RP (stacks additively) |
| Harvester Legacy | All harvesters start at 110% BER |
| Fuel Surplus | Start with 200 Rocket Fuel and pre-built Fuel Synthesizer |
| Pioneer Spirit | A3 unlocked immediately on visiting A2 |
| Void Walker | Voidstone deposits 30% more frequent |

### New Sector per Prestige

Each prestige places the player in a new named sector with fresh deposit quality profiles:

| Sector | Planets | Quality Change | Cost Change |
|---|---|---|---|
| Sector 1 | 3 planets | Standard distribution | — |
| Sector 2 | 4 planets | Quality caps +5% | Building costs +5% |
| Sector 3 | 5 planets | Wider quality variance | Building costs +10% |
| Sector 4+ | 6 planets | Exotic ore variants | Building costs +15% |

---

## Implementation Notes

### Godot Node / Scene Structure

```
scenes/worlds/
  planet_a1.tscn
  planet_b.tscn
  planet_c.tscn
  planet_a3.tscn
scripts/planets/
  planet_manager.gd       # Per-planet state: Industrial Sites remaining, population, automation level
  stranding_manager.gd    # Tracks rocket_fuel_level; arrival conditions; stranding_resolved signal
  sector_manager.gd       # Prestige logic: what resets vs. persists; bonus storage; new sector generation
autoloads/
  game_state.gd           # Extend: active_planet, rocket_fuel_level per planet
ui/
  galaxy_map_panel.tscn   # Route animations, automation status icons, per-planet stat overlay
  prestige_panel.tscn     # Sector Complete screen + bonus selection
  sector_complete.tscn    # Transition animation
data/
  planets.json            # Planet definitions: slot count, resource types, surface characteristics
  sector_bonuses.json     # All bonus definitions
```

### Key Signals

```gdscript
# stranding_manager.gd
signal planet_stranded(planet_id: String, fuel_remaining: int)
signal stranding_resolved(planet_id: String)
signal arrival_fuel_warning_shown(planet_id: String, fuel: int)

# sector_manager.gd
signal sector_complete_triggered()
signal prestige_bonus_selected(bonus_id: String)
signal new_sector_started(sector_number: int, planet_count: int)

# planet_manager.gd
signal industrial_slot_used(planet_id: String, building_type: String, slots_remaining: int)
signal industrial_slot_freed(planet_id: String, building_type: String, slots_remaining: int)
signal automation_level_changed(planet_id: String, level: String)  # "manual"|"partial"|"full"
```

### Relevant Existing Scaffolding

- `autoloads/game_state.gd` — extend with `active_planet`, `rocket_fuel_level` per planet, `industrial_slots_used` per planet
- `scenes/ui/GalaxyMapPanel.gd` — extend with route animations, automation status, A3 discovery animation
- `scripts/main.gd` — extend travel handler with stranding check; deduct fuel on transit; apply arrival conditions

### Implementation Order

1. `planet_manager.gd` — Industrial Site slot tracking per planet; slot-used/freed signals; enforce slot limits at build time
2. `data/planets.json` — all planet definitions with slot counts, resource types, surface modifier values
3. `stranding_manager.gd` — `rocket_fuel_level` per planet; arrival fuel deduction; stranding resolved check
4. Arrival conditions: HUD fuel warning "INSUFFICIENT FOR LAUNCH"; first survey ping unique sound
5. Starting supply pack on first landing (inventory contents on Planet B arrival)
6. Planet scene creation: A1, Planet B, Planet C with correct terrain features and deposit zones
7. Galaxy Map visual upgrades: route animations, per-planet automation icons, A3 discovery animation
8. `sector_manager.gd` — what resets vs. persists at prestige; bonus storage; survey data carryover
9. Galactic Hub build trigger → Sector Complete screen → prestige panel
10. Bonus selection UI, prestige transition animation, new sector generation
11. Planet C: unstable terrain — deposit shift timer, survey marker staleness system
12. A3 scene: Ferrovoid deposits, Galactic Hub placement zone, wider quality variance
