# VoidYield — Game Design Document (Master)
**Version:** 0.4 (Audit Patch — 20 fixes applied, 4 new specs added)
**Date:** 2026-04-18

This is the **master reference document**. It contains vision, pillars, the progression arc, and a system map. Every system's detailed rules, balance numbers, and implementation notes live in the individual spec files under `docs/specs/`. Read this document first; read the relevant specs when implementing a specific system.

**Spec count: 18 spec files** (specs 00, 01–17; spec 12 exists as economy reference). An audit was performed on this version resolving 9 contradictions, filling 7 design gaps, and adding 4 new specs: `00_a2_transit`, `15_save_load`, `16_input_map`, `17_world_generation`.

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [The 5-Phase Automation Arc](#2-the-5-phase-automation-arc)
3. [System Map](#3-system-map)
4. [Reading Guide](#4-reading-guide)
5. [Cross-Planet Dependency Table](#5-cross-planet-dependency-table)

---

## 1. Vision & Philosophy

VoidYield is an **automation incremental game** set in space. The player begins as a lone miner swinging a drill at surface rocks — and ends as the architect of a self-sustaining galactic mining empire operating across multiple planets without a single button press from its creator.

The core emotional arc: **discovery** → **relief** → **mastery** → **awe**.

- *Discovery* when the survey tool reveals a vein of Krysite with an Overall Quality of 847 in an unmapped corner of the asteroid field.
- *Relief* when the first harvester drone circuit runs automatically — fueling rigs, emptying hoppers, depositing to storage — while you're doing something else.
- *Mastery* when you build an avionics core from high-CD Crystal Lattice and the rocket's navigation system hits 94% precision.
- *Awe* when you open the galaxy map and see cargo routes, harvester networks, and drone swarms operating simultaneously across three worlds.

### Design Pillars

**1. Exploration earns automation.** You don't buy better ore — you find it. The survey tool is the player's most important instrument. A discovered high-quality deposit is a trophy that drives the entire economy.

**2. Every machine needs tending, until it doesn't.** Harvesters run out of gas. Hoppers fill up. Drones wear paths into the ground. The automation loop is not about making maintenance disappear — it's about making maintenance someone else's problem. Your drones handle it so you can go discover the next deposit.

**3. Resources have jobs, not just prices.** Each ore type and quality attribute unlocks things that others cannot. A high-PE Krysite deposit is worth more than its sell price because it makes better engine fuel cells. Hunting for the right quality for the right schematic is the game's deepest loop.

**4. The swarm is the spectacle.** The ultimate visual payoff of VoidYield is watching dozens of drones executing overlapping task queues simultaneously — some fueling harvesters, some carrying ore, some building structures, some flying cargo routes between planets. The drone swarm is both the mechanism and the reward.

**5. Each planet is a commitment.** Landing on a new world is exciting but not reversible without effort. You arrive with limited fuel, no established infrastructure, and unknown resource quality. The pressure to build before you can leave makes exploration feel consequential.

**6. Quality cascades through everything.** Ore quality attributes flow from deposit → refined material → crafted component → finished machine. Players hunt specific attribute combinations for specific builds. A deposit's quality profile is never just a number — it is a promise of what that ore will become.

---

## 2. The 5-Phase Automation Arc

Each phase is defined by what the player is *doing* and what *friction* drives them forward. The graduation event marks the threshold between phases.

### Phase 0: Bootstrapping (0 – 150 CR) | ~10–15 min
The player has no harvesters, no drones, no Survey Tool upgrades. They mine surface OreNodes by hand, carry ore to the depot, sell it, and immediately feel the friction of doing everything manually.

**Activities:** Manual mining (1.5s base), first survey walk with Field Scanner, carry-deposit-sell loop. Available purchases: Drill Bit Mk.II (50 CR), Cargo Pockets (75 CR), Thruster Boots (60 CR).

**Key friction:** Everything is manual. The survey result just sits there because they can't afford a harvester yet.

**Graduation event:** First Personal Mineral Harvester placed at a surveyed deposit and producing ore autonomously.

### Phase 1: First Harvesters (150 – 1,000 CR) | ~15–60 min
The player has 1–3 harvesters running. They personally refuel them and empty hoppers. The harvester loop is running but the player is the maintenance crew.

**Activities:** Place first harvester over surveyed Vorax deposit; carry gas canisters from Gas Collector; empty hoppers manually; survey for Krysite; deploy first Scout Drone on MINE task.

**Key friction:** The maintenance loop is the player's job. Harvesters run out of gas while they're doing other things. The hopper fills and the harvester stops.

**Graduation event:** First Refinery Drone assigned to a circuit: fuel harvester → empty hopper → carry to depot → loop. The player realizes they never have to check that harvester again.

### Phase 2: The Drone Circuit (1,000 – 5,000 CR) | ~1–3 hours
The maintenance loop is handed to drones. The player focuses on survey work and expanding the harvester network. Zone management opens. The Research Lab is built; the tech tree opens.

**Activities:** Assign Refinery Drones to FUEL and EMPTY circuits; draw mining zones; systematic planet survey; build Research Lab (requires Crystal Lattices from Krysite); first crafting (Drill Bit, Scout Drone).

**Key friction:** Research Lab requires Crystal Lattices — first time Planet B materials are needed (or bought at heavy markup). First crafting quality decisions arise.

**Graduation event:** Harvester network fully drone-maintained. Player steps back and watches the swarm work without touching anything.

### Phase 3: Quality Hunting (5,000 – 30,000 CR) | ~3–8 hours
Base automation is running. The game becomes about *quality*. Players hunt specific deposit attribute profiles to meet rocket component schematics. Spacecraft construction begins.

**Activities:** Systematic attribute survey; Research Lab sample analysis; match deposit qualities to schematic requirements; place Heavy Harvesters at high-quality deposits; build Launchpad; craft all 5 rocket components.

**Key friction:** The rocket requires specific attribute thresholds. A mediocre deposit won't meet the Navigation Core's CD requirement. The player must survey more aggressively.

**Graduation event:** Spacecraft launched. Planet B (Vortex Drift) unlocked. First experience of planet stranding.

### Phase 4: Multi-Planet Operations (30,000 – 200,000 CR) | ~8–20 hours
Two planets run simultaneously, each with their own deposit network, harvester grid, and drone swarm. Cargo Ships ferry materials between worlds. The drone fleet numbers in the dozens.

**Activities:** Systematic survey of Planet B; build second outpost; Cargo Ship Bay for inter-planet logistics; craft advanced components (Void Cores for Warp Gate); A3 unlock (visit A2 AND produce 10 Void Cores); fleet reaches 20–50 units.

**Graduation event:** Both planets fully automated. No manual maintenance on either world. A3 survey begins.

### Phase 5: Galactic Automation (200,000+ CR) | ~20+ hours
Three planets, each fully surveyed and drone-maintained. The player's job is macro strategy: which deposits to upgrade, which planets to export from, when to trigger prestige. The Galactic Hub on A3 enables the sector completion sequence.

**Graduation event:** Sector Complete triggered. Permanent bonus selected. New sector begins with bonuses stacked.

---

## 3. System Map

Each entry describes the system, its place in the game arc, and links to its full spec.

**[Resource Quality & Deposits](specs/01_resource_quality.md)** — The foundation of VoidYield's economy. Every ore deposit has a unique quality profile of up to 11 attributes (OQ, CR, CD, DR, FL, HR, MA, PE, SR, UT, ER) drawn from the SWG resource system. Quality flows from deposit → refined material → crafted component → final product. This system is active from the first survey scan and never stops mattering. All other systems depend on it.

**[Surveying System](specs/02_surveying.md)** — The player's primary instrument. Three tiers of Survey Tool reveal hidden deposits via concentration gradients. The survey ritual (walk, slow down, hold, mark) creates a deliberate exploration loop. The Survey Journal tracks all deposits. Late game: Survey Drones automate grid coverage. Sits at the entry point of the resource pipeline, before harvesters.

**[Harvester System](specs/03_harvesters.md)** — Stationary extraction buildings placed at surveyed deposit peaks. The BER × concentration × ER formula means both survey precision and deposit quality matter. Harvesters require gas fuel and hopper emptying — the maintenance loop that drones take over. Four tiers (Personal → Elite) plus specialized types: Crystal Harvester, Gas Collector, Cave Drill (Planet B), Gas Trap (Planet C), Resonance Charge Cracking (Planet C). Sits between surveying and storage.

**[Drone Swarm Management](specs/04_drone_swarm.md)** — The escalating automation engine. Six drone types (Scout, Heavy, Refinery, Survey, Builder, Cargo). Three control tiers: direct tasking (early), zone automation (mid), fleet presets and priority matrix (late). The drone swarm is both mechanism and visual spectacle. Connects to every other system — drones fuel harvesters, carry ore, build structures, survey deposits, and ship cargo.

**[Factory Production System](specs/05_factories.md)** — Three factory tiers transform ore into finished goods. Processing Plants (1 slot, single conversion), Fabricators (2 slots, two-input recipes), Assembly Complexes (3 slots, three-input, apex production). Quality flows through every tier. The Power Cell loop creates internal supply tension. Industrial Site slot scarcity forces planet specialization. Active from Phase 2 onward.

**[Consumption & Crew System](specs/06_consumption.md)** — The demand side of the economy. Five population tiers (Pioneers → Directors) each require a supply of goods as basic needs. One tier's luxury becomes the next tier's basic need. Productivity multiplier (0.15× to 1.0×) applies to harvesters, factories, drones, and research when needs go unmet. Binds every production loop together from mid-game.

**[Logistics System](specs/07_logistics.md)** — The inter-planet supply network. Three tiers: Cargo Ships (Phase 3, physical craft with crew and breakdown risk), Automated Drone Freight Lanes (Phase 4, continuous flow), Jump Relays (Phase 5, instant, limited throughput). Cargo class rules (Liquid Tanker for gas/Bio-Resin, Bulk Freighter for ore, Container Ship for components) require deliberate fleet composition. Route health indicators surface cascade failures before they compound.

**[Vehicle System](specs/08_vehicles.md)** — Three vehicles address traversal, hauling, and region access. Rover (Phase 1, ground terrain), Speeder (Phase 2, fast survey coverage, Vehicle Survey Mount upgrade), Shuttle (Phase 3, restricted zones and large cargo). Some high-quality deposits are region-locked and require a specific vehicle tier to reach. Vehicles are not luxury — they gate content.

**[Planets & Stranding](specs/09_planets.md)** — Each planet has a distinct ore identity, surface characteristics, and extraction quirks. A1 (Iron Rock): Vorax bulk, fast depletion. Planet B (Vortex Drift): Aethite, Voidstone, Bio-Resin, atmospheric interference. Planet C (Shattered Ring): Void-Touched Ore, Resonance Crystals, Dark Gas, shifting deposits. Planet stranding: every first landing depletes fuel below launch threshold, forcing immediate survey for gas. Industrial Site slot scarcity (6/14/18 slots) enforces planet specialization. Includes prestige/sector system.

**[Spacecraft Construction](specs/10_spacecraft.md)** — Getting to space is a construction project, not a cost gate. Five components (Hull, Engine, Fuel Tank, Avionics Core, Landing Gear) are crafted, carried to the Launchpad, and assembled piece by piece. The rocket is physically visible in the world throughout. Quality matters: component attributes determine fuel efficiency, landing precision, and re-entry safety. Target: 30–60 minutes of focused play for a first launch.

**[Tech Tree & Upgrades](specs/11_tech_tree.md)** — Three branches (Extraction, Processing & Crafting, Expansion) unlock drone capabilities, harvester BER boosts, crafting quality bonuses, fleet capacity, survey tool tiers, and prestige bonuses. Research Points generated by Research Labs (1 RP/min base). Crystal Lattices consumed for +10 RP instant. All upgrade costs and node dependencies documented in full.

**[Economy Model & Key Numbers](specs/12_economy.md)** — Harvester income projections, CR/min benchmarks by phase, rocket construction cost model, gas economy sizing. The reference sheet for balance decisions. Use this when tuning harvester BER, ore prices, or factory throughput.

**[Art Direction](specs/13_art_direction.md)** — Optimistic retro-futurism. Warm 1960s–70s space program palette on deep navy (#0D1B3E) rather than harsh amber-on-black. Each planet has a distinct ambient tint. Resource types are color-coded consistently (Vorax: rust orange; Krysite: silver-blue; Voidstone: deep violet). Animated crew figures, reactive factory buildings, drone light trails, and ship docking sequences. Overlay modes (Production, Traffic, Logistics) dim the world and surface information.

**[UI Systems & Feel](specs/14_ui_systems.md)** — Survey feedback (tone rising toward concentration peak, result card, waypoint placed). Harvester feedback (ambient SFX, color-coded warnings). Drone traffic overlay ([T] key, colored motion lines by type). Rocket construction feedback (ghost silhouette fills in as components are attached). Production Dashboard ([P] key): resource rows with production, consumption, net delta, days-to-empty. Production Overlay ([O] key): building status color-coding. Coverage Overlay ([B] key): Drone Bay radius circles. Offline Event Log: "Empire Dispatch" format — concrete numbers, opportunity costs, positive framing. Offline simulation uses 30-second stepwise simulation, capped at 8 hours.

**[A2 Transit Asteroid](specs/00_a2_transit.md)** — A2 is a transit pitstop, not a colonizable planet. No Industrial Sites, no population. Serves two roles: (1) mid-point waypoint for Cargo Ships on the A1 ↔ Planet C route (automated Gas Depot refuels passing ships, reduces fuel costs per trip); (2) required physical visit for the A3 unlock condition (player must land on A2 via Shuttle). Contains 2 hand-harvest ore deposits (Krysite + Vorax, Grade B), a one-time secret cache (500 CR + Grade A Krysite sample), and no hazards. Cargo Ship routing via A2 is optional but reduces fuel overhead on long routes.

**[Save / Load System](specs/15_save_load.md)** — Serializes the complete empire state to `user://savegame.json` (JSON format, mirrors existing `save_manager.gd` pattern). Full serialized state list: deposit map, survey waypoints, drone task queues, factory recipes + quality routes, research progress, harvester states (fuel + hopper), ship degradation, population tiers + need satisfaction timers, stockpile quantities, tech tree unlocks, last_save_timestamp, current_planet, active trade routes, phase flags. Autosave every 5 real-time minutes and on scene change. On load: runs offline simulation from `last_save_timestamp`. Prestige partial persistence defined: stockpiles/buildings/fleet/population/tech reset; sector bonuses/schematics/survey data (except Planet C)/one retained tech node persist.

**[Input Map](specs/16_input_map.md)** — The single source of truth for all key bindings. No two bindings may share a key. Complete binding list: WASD/Arrows (movement), E (interact), Q (survey), Z (zone paint), R (retool factory), T (fleet/traffic overlay), F (fleet dispatch), G (galaxy map), L (logistics overlay / offline log), P (production dashboard), O (production overlay), B (coverage overlay), I (inventory), J (journal), Tab (cycle panels), ESC (pause), F11 (fullscreen). Controller mapping included. Any new spec assigning a key must reference this file.

**[World Generation](specs/17_world_generation.md)** — Planet surface layout spec. All planets are hand-crafted .tscn files (not procedural). A1: 2,800 × 2,000 px, 3 ore zones (Inner Field / Mid Belt / Outer Ring), 6 Industrial Sites, Vorax guaranteed everywhere, Krysite in Mid Belt + Outer Ring, 3 fixed Raw Crystal Formation locations. Planet B: 3,200 × 2,400 px, 14 Industrial Sites, 4 cave entrances, 3 Flora Zones, Shards everywhere / Aethite in Northern Reaches + Deep Caverns / Voidstone in Deep Caverns only. Planet C: 4,000 × 3,000 px, 18 Industrial Sites, shattered pathfinding terrain, 6 fixed Resonance Crystal formations (finite), 8 geyser vents, Void-Touched Ore everywhere with concentration re-rolls every 2–4 in-game hours. Deposit quality rolls fresh each sector using concentration as quality weight floor.

---

## 4. Reading Guide

Use this section to quickly identify which specs to load before implementing a feature.

| If you are implementing... | Read these specs first |
|---|---|
| Ore deposit generation and quality | 01_resource_quality |
| Survey Tool (equip, scan stages, UI) | 02_surveying, 01_resource_quality |
| Harvester placement and extraction | 03_harvesters, 01_resource_quality, 02_surveying |
| Harvester fuel and hopper systems | 03_harvesters, 04_drone_swarm (FUEL/EMPTY tasks) |
| Drone task queue and zone system | 04_drone_swarm, 03_harvesters |
| Drone fleet scaling and Drone Fabricator | 04_drone_swarm, 11_tech_tree (Branch 1) |
| Processing Plants and Fabricators | 05_factories, 01_resource_quality (quality passthrough) |
| Assembly Complexes | 05_factories, 06_consumption (Power Cell loop) |
| Industrial Site slot system | 09_planets (§ Planet Constraints), 05_factories |
| Crew needs and productivity multiplier | 06_consumption, 05_factories (Power Cell demand) |
| Inter-planet cargo routes | 07_logistics, 09_planets (planet identities) |
| Vehicle traversal and region locks | 08_vehicles, 02_surveying (Vehicle Survey Mount) |
| Planet B first landing and stranding | 09_planets, 10_spacecraft (fuel system) |
| Planet C mechanics | 09_planets, 03_harvesters (Gas Trap, Resonance Cracking) |
| Spacecraft construction | 10_spacecraft, 01_resource_quality, 05_factories |
| Tech tree UI and RP economy | 11_tech_tree, 05_factories (Research Lab) |
| Economy tuning and harvester balance | 12_economy, 03_harvesters, 01_resource_quality |
| Visual assets and color palette | 13_art_direction |
| HUD, overlays, and Production Dashboard | 14_ui_systems |
| Offline Event Log and offline simulation method | 14_ui_systems (§5 Implementation Notes) |
| Prestige and sector system | 09_planets (§ Prestige), 11_tech_tree |
| Save / Load system | 15_save_load |
| Key bindings and input assignments | 16_input_map |
| Planet surface layout and deposit positions | 17_world_generation |
| A2 transit asteroid (routing + A3 unlock) | 00_a2_transit, 09_planets, 07_logistics |
| Warp Gate function and placement | 11_tech_tree (§5 Warp Gate), 09_planets (A3 section) |
| Repair Drone (ship and harvester repair) | 04_drone_swarm (roster), 07_logistics (§6), 11_tech_tree (2.S) |
| Assembly Complex unlock | 05_factories (§4), 11_tech_tree (2.Z) |
| Crystal Bore tech node | 11_tech_tree (1.Z), 09_planets (A1 section) |
| Population growth mechanics | 06_consumption (§3) |
| Deposit harvester slot limits | 03_harvesters (§2), 09_planets (§2) |
| Planet C survey staleness / prestige | 09_planets (§5 Prestige exception) |
| Planet B water supply (Atmospheric Water Extractor) | 06_consumption (§8), 09_planets (Planet B), 07_logistics (§3.5) |
| FL attribute in BER formula | 03_harvesters (§1), 01_resource_quality |

---

## 5. Cross-Planet Dependency Table

No planet is self-sufficient for endgame crafting. This table shows which resources flow between planets and why the flow cannot be eliminated.

### Planet Resource Identities

| Planet | Unique Ore Types | What It Exports | What It Imports |
|---|---|---|---|
| A1 — Iron Rock | Vorax (bulk), Krysite | Steel Plates, Alloy Rods, Drill Heads | Crystal Lattices (research), Void Cores (Warp Gate), Rocket Fuel |
| Planet B — Vortex Drift | Aethite, Voidstone, Bio-Resin, high-PE Gas | Crystal Lattices, Void Cores, Rocket Fuel, Bio-Circuit Boards | Steel Plates (construction), Alloy Rods (fabrication) |
| Planet C — Shattered Ring | Resonance Crystals, Dark Gas, Void-Touched Ore | Resonance Shards, Warp Capacitors, Navigation Cores | Steel Plates, Alloy Rods, Void Cores (for Warp Capacitors) |

### Cross-Planet Crafting Requirements

The best items always require materials from at least two planets:

| Item | From A1 | From Planet B | From Planet C |
|---|---|---|---|
| Avionics Core | Alloy Rods | Void Cores, Crystal Lattices | — |
| Warp Gate Module | Steel Plates | Void Cores | Resonance Shards |
| Advanced Research Array | Alloy Rods | Aethite Crystal Lattices | — |
| Bio-Circuit Board | Alloy Rods | Bio-Resin | — |
| Elite Drone Frame | Steel Plates | Crystal Lattices | Void-Touched Ore (high OQ) |
| Dark Fuel Cell | — | High-PE Gas | Dark Gas |
| Navigation Core | — | Crystal Lattice, Void Core | — (assembled on Planet C) |
| Jump Relay Module | Alloy Rods | — | Warp Capacitor, Resonance Shards |

### Endgame Resource Flow Target

```
A1:  Vorax deposits → Steel Plates → [export 40% to Planet B/C for construction]
A1:  Krysite deposits → Alloy Rods → [export to A3 Galactic Hub]

B:   Aethite deposits → Crystal Lattices → [export to A3 Hub + keep for Research]
B:   Voidstone deposits → Void Cores → [export to A1 for Warp Gates + A3 for Hub]
B:   High-PE Gas → Rocket Fuel → [export to all planets for inter-planet travel]

C:   All materials → Galactic Hub → maximum sell price (+20%) on everything
C:   Research passively completing all remaining tech nodes
```

This forces active inter-planet logistics — no planet can be "set and forget" because the receiving planet always needs something from the others.

---

*Detailed system rules, balance numbers, implementation notes, and Godot scaffolding guidance are in `docs/specs/`. The original v0.2 GDD content is fully preserved across the 18 spec files (00, 01–17) — nothing was cut, only reorganized and extended.*
