# Core Loop — Design Review & Working Doc

**Status:** Working design discussion, not a spec. Once we converge, the outcome becomes `docs/specs/18_core_loop.md`.

**Purpose:** Refocus the game on a single cohesive Phase 1 loop — an outpost on an asteroid where spatial layout, drone allocation, and road networks are first-class constraints. Supersedes the aspects of the existing GDD that assume uncapped building placement and an unlimited drone fleet.

---

## 1. The Design Vision (as proposed)

**The opening 15 minutes.** The player starts at an outpost on an asteroid. Three surface deposits are visible: iron ore, copper ore, water. The outpost has two buildings on the ground: a storage depot and a furnace. A fabricator sits on the map as a usable machine.

**The manual loop.** The player walks to deposits, mines by hand, carries ore to the furnace, smelts it into bars, carries bars to the fabricator, and uses the fabricator to construct a marketplace and a drone depot.

**The automation loop.** The drone depot spawns two kinds of drones:

- **Miner drones** — gather resources from deposits.
- **Logistics drones** — move resources between buildings (ore from storage to furnace, bars back to storage, etc.).

The player allocates a finite drone budget between the two roles. Scaling mining means fewer logistics; scaling logistics means slower ore intake.

**The long-term pillars.**

- The base is **space-constrained** inside a perimeter fence. Buildings take tiles. The player can reposition them and eventually expand the fence.
- **Drones are a limited resource**, capped by drone bays that themselves cost real estate.
- **Logistics drones require roads.** Roads are placed on tiles.
- Water → hydrolox fuel (electrolysis) → rocket fuel → next area. That's the Phase 2 off-ramp, not Phase 1 content.

---

## 2. Design Clarifications Locked In

| Question | Answer |
|---|---|
| What is water for? | Electrolysis → hydrolox rocket fuel. Deferred to Phase 2, but the deposit exists in Phase 1. |
| What is the fabricator? | A factory that consumes processed materials (bars, etc.) to craft deployable buildings (market, drone depot) and items. |
| Do miners need roads too? | Yes — everything requires roads. |
| What's Phase 1's end? | Launching a rocket to a new area. Focus is on Phase 1 only for now. |
| How does the drone budget bite? | Drone bays take real estate. Each bay holds ~4 drones. More drones = less space for production buildings. |
| Grid shape? | Squares (recommended over hexes — see §3). |
| Perimeter? | The outpost fence bounds where buildings can be placed. Expandable later. |
| Is the game "spatial puzzle" or "idle swarm"? | **Both.** Tight puzzle early, sprawling swarm late. |

---

## 3. Recommendations

### 3.1 Squares, not hexes
Squares win on every practical axis: pixel-art cost at 960×540, pathfinding simplicity, UI alignment, multi-tile building footprints, and road aesthetics. Hexes suit strategy games with combat adjacency; we have none of that. Every successful base-builder in this genre (Factorio, Rimworld, ONI, Mindustry) uses squares.

### 3.2 Deposits sit *outside* the perimeter
This is the killer idea implied but not stated. Make it intentional:

- The fence defines **where buildings may be placed**.
- Deposits sit on the **asteroid surface, outside the fence**.
- Roads may extend past the fence to reach deposits.
- Miner drones travel out along roads, extract, haul back in.

This creates a clean three-way spatial tension:

1. Interior real estate (buildings vs drone bays vs roads)
2. Road length from perimeter to deposits (longer = more drones needed for the same throughput)
3. Perimeter expansion (unlocks more interior but costs resources)

### 3.3 Clean drone role split
Propose a hard boundary between the two roles:

- **Miner drones** — leave the perimeter along roads, travel to a deposit, extract, haul back to the nearest storage, return to bay. Full round trip. One miner slot per deposit at a time.
- **Logistics drones** — **never leave the perimeter**. They only shuttle between buildings inside the base (storage → furnace → storage → fabricator).

Legible allocation: "ore intake too low → more miners; stuff piling up at storage → more logistics."

This lets us **skip stationary harvesters in Phase 1**. Miners *are* the harvesters. Harvester buildings come back later as an upgrade tier (higher throughput, but require a dedicated logistics drone to empty — which itself costs logistics allocation).

### 3.4 Drone bay mechanics
- **Footprint:** 2×2 tiles. Big enough to feel.
- **Capacity:** 4 drones per bay. Unused slots are dead real estate.
- **No power/upkeep** in Phase 1. Real-estate cost only.
- **Must touch a road.**
- **Optional lever (hold in reserve):** adjacency to storage reduces logistics round-trip time. Turns "park bays next to storage" into a layout micro-decision.

### 3.5 Bars need a sink besides credits
As currently described, the loop is `mine → smelt → sell → repeat`. That's a pure money pump with no layout decisions attached. The market becomes a faucet, and smelting is ceremony.

**Fix:** bars are *required* to build drone bays, roads, storage expansion, the market itself, and future buildings. The marketplace is the **overflow sink**, not the primary one. The player sells only what they have surplus of.

### 3.6 Own the puzzle-to-swarm transition
If the game is both cramped-puzzle *and* drone-swarm spectacle, the transition between them is the riskiest design moment. Proposal:

- **Phase 1 ends** when the outpost is self-sustaining and producing rocket fuel / rocket parts.
- **Phase 2 begins** with a *second* outpost on a new asteroid — fresh perimeter, fresh drones.
- Spectacle comes from **multiple outposts running in parallel**, linked by cargo routes. Each one stays a tight spatial puzzle forever.

This preserves the cramped-puzzle feel across the whole game instead of letting it dissolve into one sprawling map.

---

## 4. Answered Questions

### Q1 — Outpost grid size
**Locked.** 20×15 interior tiles inside a 1-tile perimeter fence, on a ~40×30 asteroid surface. 3 deposits placed at spread corners/edges of the asteroid (iron, copper, water) to force road sprawl and create a "which deposit first" decision.

### Q2 — Building footprints
**Locked.** Sizes as proposed. Roads connect on any adjacent side — no specific I/O tiles in Phase 1.

| Building | Footprint |
|---|---|
| Storage | 2×2 |
| Furnace | 2×2 |
| Fabricator | 2×3 |
| Drone Bay | 2×2 |
| Marketplace | 2×2 |
| Road | 1×1 |

### Q3 — Drone count gating
**Locked.** First Drone Bay spawns **4 drones**. Subsequent bays also spawn 4. Player can swap each drone's role (miner ↔ logistics) freely at any time — no purchase-time commitment.

### Q4 — Road rules
**Locked.** Single road type. Flat cost: **1 iron bar per tile**. Drones move at 1 tile/sec on roads and cannot leave road tiles. A* pathfinding over the road graph. No dirt/paved tier split in Phase 1.

### Q5 — Phase 1 win condition
**Locked.** Both beats:

- **Graduation feel:** base runs 60–120s unattended with net credit surplus at the market.
- **Content gate:** player builds a rocket using hydrolox fuel and launches to Phase 2.

### Q6 — Picking up a building
**Locked.** Moving a building pauses production, returns its tiles to the empty pool, and grants a **full refund** of any tile resources. Drones in transit **re-path** using the current road network.

### Q7 — Perimeter expansion
**Locked.** Perimeter is fixed in Phase 1. Phase 2's "second outpost on a new asteroid" is the expansion answer — fresh perimeter, fresh drones — not fence extension on the starting asteroid.

### Q8 (reposed) — Remaining work priority
**Locked.** The original phrasing (reuse vs. dormant) was stale because significant Phase 1 mechanics are already shipped (see §7). Reposed answers:

- **Priority:** build the **tile grid + `PlacementService`** first. It's the foundation that unblocks roads, logistics routing between buildings, and pickup/move. Nothing else lands cleanly without it.
- **Drone role model:** add an explicit `DroneRole = 'miner' | 'logistics'` field on `DroneBase`, decoupled from `droneType` (scout / heavy / etc.). Future tiers can then have "elite logistics" or "elite miner" without conflating role and type.
- **Furnace:** build a new `Furnace` entity alongside the existing `ProcessingPlant` / Plate Press. Furnace handles iron_ore → iron_bars and copper_ore → copper_bars. Plate Press stays for the later bars → plates chain.
- **Logistics drone behavior** already exists in the codebase (`ZoneManager` CARRY tasks, `RefineryDrone` stub wiring) — Phase 1 wires it to intra-base shuttling between Storage, Furnace, Fabricator, and Marketplace on the new road network rather than to harvester fuel/empty circuits.

---

## 5. Proposed Vertical Slice

Lock the following as the first build target. If this is fun for 15 minutes, the design works.

- One asteroid, hand-authored 40×30 grid.
- Perimeter fence enclosing a 20×15 interior, fixed in Phase 1.
- 3 fixed deposits outside the perimeter (iron, copper, water).
- Starter buildings pre-placed: storage, furnace, fabricator. Player can pick them up and move them.
- Manual mining via `E` at deposit. Hand-carry to furnace, smelt, hand-carry to fabricator.
- Fabricator recipes: road batch, drone bay, marketplace.
- Drone bay spawns 2 drones; player assigns each to Miner or Logistics.
- Logistics drones move ore from storage to furnace and bars from furnace to storage, on roads.
- Miner drones travel outside the perimeter on roads to a deposit and haul back.
- Market accepts surplus bars for credits.
- Success feel: **"I walked away for 60 seconds and the base just worked."**

Not in the slice: water use, tech tree, multiple drone tiers, building upgrades, perimeter expansion, rocket, saves. Each of those is its own follow-up once the slice is proved.

---

## 6. Decision Log

*All decisions below are binding for `docs/specs/18_core_loop.md`.*

| # | Decision | Status |
|---|---|---|
| 1 | Squares, not hexes | **Locked** |
| 2 | Everything requires roads | **Locked** |
| 3 | Deposits outside the perimeter | **Locked** |
| 4 | Hard split: miners leave perimeter, logistics stay inside | **Locked** |
| 5 | Drone Bay 2×2, 4 drones per bay, must touch road | **Locked** |
| 6 | Bars are building currency; market is overflow sink | **Locked** |
| 7 | Phase 1 ends at rocket launch + 60–120s autonomy beat | **Locked** |
| 8 | Harvester buildings deferred to post-Phase-1 | **Locked** |
| 9 | 20×15 interior, deposits spread on ~40×30 asteroid | **Locked** |
| 10 | Footprints: Storage/Furnace/Drone Bay/Market 2×2, Fabricator 2×3, Road 1×1; any-side connect | **Locked** |
| 11 | First Drone Bay spawns 4 drones; roles swappable freely | **Locked** |
| 12 | Single road tier: 1 iron bar/tile, 1 tile/sec, A* pathfinding | **Locked** |
| 13 | Picking up a building: pause + full refund + drones re-path | **Locked** |
| 14 | Perimeter fixed in Phase 1; Phase 2 expansion = second outpost | **Locked** |
| 15 | Drone role = explicit `DroneRole` enum on `DroneBase`, decoupled from `droneType` | **Locked** |
| 16 | New `Furnace` entity alongside existing Plate Press (ProcessingPlant) | **Locked** |
| 17 | Next engineering priority: tile grid + `PlacementService` | **Locked** |

---

## 7. Current Implementation Status (as of 2026-04-23)

Snapshot of which Phase 1 pillars are already live in the codebase vs. still to build. Correcting earlier reviews that undercounted recent work.

### Already shipped

| Pillar | Evidence |
|---|---|
| Miner drone behavior | `MiningCircuitManager` — IDLE → find deposit → MINE → CARRY → deposit → loop |
| Drone Bay as a building with roster + cap | `src/entities/DroneBay.ts`, `DroneBayPanel` shows IDLE / MINING / HAULING / RETURNING / OFF |
| Bay-slot cap events | `fleet:roster_changed`, `drone:bay_cap_changed` |
| Logistics drone primitives | `ZoneManager` CARRY tasks + `RefineryDrone` stub (needs rewire to in-base routes) |
| Marketplace sell/buy | `MarketplaceService` — `sell()` at fixed prices, `buy()` at 1.5× markup |
| Fabricator engine | Two-input recipe machine with input/output depots and state machine |
| Plate Press (proto-furnace) | `ProcessingPlant` schematic: steel_bars → steel_plates |
| Perimeter walls block movement | `ObstacleManager` + `PlanetA1Scene` gate routing |
| Tap-to-move + touch controls | Mobile-ready input layer |

### Still to build for Phase 1

| Pillar | What's needed |
|---|---|
| Tile grid + `PlacementService` | Grid coords, building footprints, perimeter-enforced placement, pickup/move. **Top priority.** |
| Road entity + `RoadNetwork` service | Road tile, connectivity graph, A* over road tiles for drones |
| Perimeter as a *placement* boundary | Walls block movement today; need to also block building placement outside them |
| `DroneRole` enum | Explicit miner / logistics role on `DroneBase`, UI toggle in `DroneBayPanel` |
| Logistics drone in-base routes | Rewire existing CARRY primitives to Storage ↔ Furnace ↔ Fabricator ↔ Market on roads |
| Iron ore + copper ore resources | `OreType` entries, `deposits_a1.ts` (or new file) places 3 spread deposits |
| `Furnace` entity | New building: iron_ore → iron_bars, copper_ore → copper_bars |
| Phase 1 Fabricator recipes | Drone Bay, Road (batch), Marketplace, Storage expansion (future) |
| Rocket-launch Phase 1 terminus | Wire existing Launchpad + hydrolox fuel chain as the Phase 1 "you win" moment |
| Water → hydrolox chain | Electrolysis building + hydrolox as a new `OreType` |

---

*This doc's decisions are now fully locked. Next deliverable: `docs/specs/18_core_loop.md` distilling the decisions above into an implementation spec, then engineering work in priority order per §7.*
