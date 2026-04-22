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

## 4. Open Questions (reply inline)

> Answer these and the spec is writable. Add your thoughts directly under each question.

### Q1 — Outpost grid size
Proposed: **20×15 interior tiles**, inside a 1-tile perimeter fence, on a ~40×30 asteroid surface. Deposits hand-placed at 3 fixed spots outside the fence.

- Is that tight enough to bite but roomy enough for a 30-minute Phase 1?
- Should the 3 deposits be close together or spread out to force road sprawl?

**Your reply:**

---

### Q2 — Building footprints
Proposed:

| Building | Footprint | Notes |
|---|---|---|
| Storage | 2×2 | Expandable via add-on tiles? |
| Furnace | 2×2 | |
| Fabricator | 2×3 | Bigger because it's the crafter |
| Drone bay | 2×2 | Holds 4 drones |
| Marketplace | 2×2 | |
| Road | 1×1 | |

- Do the sizes feel right?
- Should multi-tile buildings have a specific input/output tile (belt-style), or accept connections on any side?

**Your reply:**

---

### Q3 — Drone count gating
At game start, how many drones does the initial drone bay give you? Proposal: the first bay gives **2 drones** (one miner + one logistics, or both of one type at the player's choice). Subsequent bays give 4.

- Feel right?
- Should the player *choose* each drone's role at bay purchase, or swap freely?

**Your reply:**

---

### Q4 — Road rules
Proposed:

- One road type in Phase 1. Flat cost per tile (e.g. 1 iron bar).
- Drones travel at 1 tile/sec on road, cannot leave road.
- Roads may be placed inside and outside the perimeter.
- No intersections logic — just "is this tile a road tile." Pathfinding is A* over road tiles.

- Agree, or do we want a cheap-dirt / fast-paved tier split even in Phase 1?

**Your reply:**

---

### Q5 — Win condition for Phase 1
What makes the player feel "done" with Phase 1? Proposals:

- **A)** Base runs autonomously for 2 minutes producing net credit surplus at the market.
- **B)** Player builds a rocket (requires hydrolox fuel) and launches to Phase 2.
- **C)** Both: (A) is the graduation feel, (B) is the content gate.

**Your reply:**

---

### Q6 — What happens when the player picks up a building?
Repositioning is a stated pillar. Details:

- Does the building work while being moved, or does it pause?
- Does moving it cost resources (partial refund / full refund)?
- Can logistics drones re-path mid-trip if a road moves, or do they stall?

**Your reply:**

---

### Q7 — Perimeter expansion
How does the player grow the fence?

- Triggered by fabricator-crafted "perimeter segment" items?
- Costs a ramp of resources per expansion?
- Any cap in Phase 1, or is it unlocked only in Phase 2?

**Your reply:**

---

### Q8 — Existing services to reuse vs. rewrite
Current codebase has `FleetManager`, `LogisticsManager`, `HarvesterManager`, `MiningService`, `SectorManager`, a tech tree, and save/load. For Phase 1, proposal:

- **Reuse:** `GameState`, `SaveManager`, `SettingsManager`, `EventBus`, `InputManager`, `MiningService` (simplify), `LogisticsManager` (rewire around roads).
- **New:** `BaseGrid` / `PlacementService` (tile grid, building footprints, fence), `RoadNetwork` (connectivity + pathfinding), `DroneAllocator` (caps, role split).
- **Dormant:** `HarvesterManager`, `SectorManager`, `TechTree`, `ConsumptionManager`, `StrandingManager` — kept in repo, not wired into the new Phase 1 scene.

Agree with that split, or do you want a harder reset?

**Your reply:**

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

*Fill in as we converge. Each decision here becomes binding for the spec.*

| # | Decision | Status |
|---|---|---|
| 1 | Squares, not hexes | **Locked** |
| 2 | Everything requires roads | **Locked** |
| 3 | Deposits outside the perimeter | Proposed |
| 4 | Hard split: miners leave perimeter, logistics stay inside | Proposed |
| 5 | Drone bay 2×2, 4 drones, must touch road | Proposed |
| 6 | Bars are building currency; market is overflow sink | Proposed |
| 7 | Phase 1 ends at rocket launch; Phase 2 = second outpost | Proposed |
| 8 | Harvester buildings deferred to post-Phase-1 | Proposed |

---

*When the Open Questions are answered and the Decision Log is fully locked, this doc becomes `docs/specs/18_core_loop.md` with the discussion prose trimmed out.*
