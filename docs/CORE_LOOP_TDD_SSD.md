# VoidYield — Core Loop Technical Design Document & System Sequence Diagrams

**Classification:** TDD + SSD  
**Version:** 1.2  
**Date:** 2026-04-23  
**Based on:** `docs/CORE_LOOP_DESIGN_REVIEW.md` (decisions locked)  
**Status:** Design spec — see §7 of design review for implementation status  

---

## Document Purpose

This document provides two complementary views of VoidYield's Phase 1 core loop:

1. **TDD (Technical Design Document)** — Every screen, panel, and interactive surface the player sees and touches, annotated with ASCII wireframes, button labels, and behavioral rules.
2. **SSD (System Sequence Diagrams)** — Step-by-step traces of what happens inside the game engine when the player performs key actions.

**Scope:** Phase 1 only — the single asteroid outpost. Phase 2+ (multi-planet, cargo ships, tech tree) is explicitly out of scope for this document and is documented in other specs.

---

## 1. Phase 1 Core Loop Summary

### The premise

The player starts on a 40×30 asteroid surface. The outpost perimeter fence encloses a 20×15 tile interior. Three deposits sit **outside** the fence on the asteroid surface: iron ore, copper ore, and water. Two buildings are pre-placed inside: a Storage Depot and a Furnace. The Fabricator is also pre-placed and ready to use.

### The manual loop (first 5–10 minutes)

```
Walk to deposit → [E] hand-mine ore → ore goes straight to Storage
→ walk to Furnace → configure recipe → bars accumulate in output buffer
→ [E] at Fabricator → bars drawn from Storage → [CRAFT] Drone Bay or Roads → place it
```

### The automation loop (once Drone Bay is built)

```
Assign Miners → drones fetch ore from deposits along roads
Assign Logistics → drones move ore/bars between buildings inside fence
Player steps back → watches the base run itself
```

### Phase 1 win condition

1. **Autonomy beat:** base runs 60–120 seconds unattended with net credit surplus at the Marketplace.
2. **Content gate:** Rocket launched to Phase 2 (requires hydrolox fuel production).

### Key constraints driving all decisions

| Constraint | Consequence |
|---|---|
| 20×15 interior tiles | Buildings compete for the same finite tiles |
| Drone bays cost 2×2 tiles + take from building budget | More drones = less production space |
| Roads cost 1 iron bar/tile | Early expansion is expensive; path layout matters |
| Miners leave the perimeter; Logistics stay inside | Role allocation is legible |
| Bars are building currency | Smelting has a real purpose beyond just "sell" |

---

## 2. World Layout Reference

```
FULL ASTEROID SURFACE (40 × 30 tiles)
╔══════════════════════════════════════════════════════════════════════════════╗
║  ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░  ║
║  ░   [◉ IRON ORE]                                                        ░  ║
║  ░              ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░                  ░  ║
║  ░            ░                                       ░                  ░  ║
║  ░    road   ░                OUTPOST INTERIOR        ░  [◉ COPPER ORE]  ░  ║
║  ░   ─────  ░   (20×15 tiles — building placement)    ░                  ░  ║
║  ░          ░   ┌───────────────────────────────┐     ░                  ░  ║
║  ░          ░   │ [■] Storage  [▣] Furnace       │     ░    road ──────  ░  ║
║  ░          ░   │                               │     ░                  ░  ║
║  ░          ░   │ [✦] Fabricator               │     ░                  ░  ║
║  ░          ░   │                               │     ░                  ░  ║
║  ░          ░   │  ← player walks here →        │     ░                  ░  ║
║  ░          ░   └───────────────────────────────┘     ░                  ░  ║
║  ░            ░      PERIMETER FENCE              ░                      ░  ║
║  ░              ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░                      ░  ║
║  ░                              │ road down                               ░  ║
║  ░                              ▼                                         ░  ║
║  ░                        [◉ WATER DEPOSIT]                               ░  ║
║  ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░  ║
╚══════════════════════════════════════════════════════════════════════════════╝

KEY:
  ░ = asteroid surface (outside perimeter; buildings cannot be placed here)
  ═ = perimeter fence tiles (1-tile border)
  interior = white space — placeable building tiles
  ─ / │ = roads (1×1 tile each; extend outside perimeter to deposits)
  [◉] = ore deposit (outside perimeter)
  [■] = Storage Depot (2×2)
  [▣] = Furnace (2×2)
  [✦] = Fabricator (2×3)
```

### Building footprints (locked)

```
Storage Depot   Furnace         Fabricator      Drone Bay       Marketplace
  ┌──┐            ┌──┐            ┌──┐            ┌──┐            ┌──┐
  │■■│            │▣▣│            │✦✦│            │⬡⬡│            │$$ │
  │■■│            │▣▣│            │✦✦│            │⬡⬡│            │$$ │
  └──┘            └──┘            │✦✦│            └──┘            └──┘
  2×2             2×2             └──┘            2×2             2×2
                                  2×3

Road
  ┌─┐
  │=│  ← 1 iron bar per tile
  └─┘
  1×1
```

---

## 3. Screens & Wireframes

> **Layout Key**
> ```
> ╔══╗  double border = screen / major panel
> ┌──┐  single border = sub-panel / widget
> [KEY] = keyboard shortcut
> [BTN] = clickable button / action
> ░░░  = locked / unavailable
> ████ = bar/progress fill
> ─ ─  = road tiles
> ·    = open terrain tile
> ```

---

### 3.1 Main Menu

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                                                              ║
║                    V O I D Y I E L D                         ║
║              ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                   ║
║              Build. Mine. Automate. Launch.                  ║
║                                                              ║
║                                                              ║
║                   ┌──────────────────┐                       ║
║                   │  [NEW GAME]      │  ← Fresh run          ║
║                   └──────────────────┘                       ║
║                                                              ║
║                   ┌──────────────────┐                       ║
║                   │  [CONTINUE]      │  ← Load last save     ║
║                   └──────────────────┘                       ║
║                                                              ║
║                   ┌──────────────────┐                       ║
║                   │  [SETTINGS]      │  ← Audio / display    ║
║                   └──────────────────┘                       ║
║                                                              ║
║                                                              ║
║   v1.0.0-phase1                           © VoidYield 2026   ║
╚══════════════════════════════════════════════════════════════╝

BUTTON ACTIONS:
  [NEW GAME]   → Creates fresh game state → loads asteroid surface
  [CONTINUE]   → Loads last auto-save → resume at exact world state
  [SETTINGS]   → Opens Settings overlay (§3.10)
  ESC          → No effect at root menu
```

---

### 3.2 Outpost Surface — Base HUD

The core game view. The camera shows the 40×30 asteroid surface (scrollable) with the 20×15 interior perimeter visible. All interaction happens here.

```
╔══════════════════════════════════════════════════════════════╗
║  ┌──────────────────────────────────────────────────────┐   ║
║  │  CREDITS: 0  IRON BARS: 0  COPPER BARS: 0  DAY: 1   │   ║ ← top resource bar
║  └──────────────────────────────────────────────────────┘   ║
║                                                              ║
║  ┌──────────────────────────────────────────────────────┐   ║
║  │                                                      │   ║
║  │  · · · · · · · · · · · · · · · · · · · · · · · ·    │   ║
║  │  · · · [◉Fe] · · · · · · · · · · · · · · · · · ·    │   ║ ← iron deposit
║  │  · · · · ─ · · ╔══════════════════╗ · · · · · ·    │   ║
║  │  · · · · ─ · · ║  ■■  ▣▣  · · ·  ║ · · [◉Cu]· ·    │   ║ ← perimeter
║  │  · · · · ─ · · ║  ■■  ▣▣  · · ·  ║ · · · ─ · · ·    │   ║
║  │  · · · · = · · ║  · ✦✦✦ · [▲] ·  ║ · · · ─ · · ·    │   ║ ← player [▲]
║  │  · · · · = · · ║  · ✦✦✦ · · · ·  ║ · · · ─ · · ·    │   ║
║  │  · · · · ─ · · ║  · · · · · · ·  ║ · · · ─ · · ·    │   ║
║  │  · · · · ─ · · ╚══════════════════╝ · · · ─ · · ·    │   ║
║  │  · · · · ─ · · · · · · · │ · · · · · · · · · · ·    │   ║
║  │  · · · · ─ · · · · · · · ─ · · · · · · · · · · ·    │   ║
║  │  · · · · · · · · · · · · ─ · · · · · · · · · · ·    │   ║
║  │  · · · · · · · · · · [◉H₂O] · · · · · · · · · ·    │   ║ ← water deposit
║  │  · · · · · · · · · · · · · · · · · · · · · · · ·    │   ║
║  └──────────────────────────────────────────────────────┘   ║
║                                                              ║
║  [WASD] Move  [E] Interact  [B] Build  [R] Roads  [ESC] Menu║ ← key hints
╚══════════════════════════════════════════════════════════════╝

WORLD SYMBOLS:
  [▲]        = Player character (animated 16×16 sprite)
  ═ / ─ / │  = Road tiles (horizontal/diagonal/vertical)
  ╔ ╗ ╚ ╝ ║  = Perimeter fence (buildings cannot be placed outside)
  [◉Fe]      = Iron ore deposit (outside perimeter)
  [◉Cu]      = Copper ore deposit (outside perimeter)
  [◉H₂O]    = Water deposit (outside perimeter)
  [■■/■■]    = Storage Depot (2×2)
  [▣▣/▣▣]    = Furnace (2×2)
  [✦✦✦/✦✦✦] = Fabricator (2×3)
  [⬡⬡/⬡⬡]   = Drone Bay (2×2, when placed)
  [$$/$$ ]   = Marketplace (2×2, when crafted + placed)

TOP RESOURCE BAR:
  CREDITS     → Current credit balance from Marketplace sales
  IRON ORE    → Iron ore in Storage (all deposits flow here directly)
  IRON BARS   → Iron bars in Storage (smelted by Furnace)
  COPPER ORE  → Copper ore in Storage
  COPPER BARS → Copper bars in Storage
  DAY         → In-game day counter

NOTE: The player has no personal inventory. All mined ore and produced items
go directly into Storage. The player is an action-controller, not a carrier.
Drones are the only entities with inventory — they carry items between buildings.

KEY HINTS BAR:
  [WASD]  → Move player (or Arrow Keys)
  [E]     → Context-sensitive interact (deposit, building)
  [B]     → Open Build placement menu (§3.5)
  [R]     → Enter Road placement mode (§3.6)
  [ESC]   → Open pause / settings
```

---

### 3.3 Deposit Interaction [E near deposit]

```
╔══════════════════════════════════════════════════════════════╗
║  [WORLD VIEW — player stands at deposit; prompt shown]        ║
║                                                              ║
║  ╔═════════════════════════════════════════════════════╗     ║
║  ║  ◉ IRON ORE DEPOSIT                                 ║     ║
║  ║  ─────────────────────────────────────────────────  ║     ║
║  ║  Stock remaining:  ████████████░░░░░░  ~640 ore     ║     ║
║  ║  Road access:      ✓ Connected (road leads here)    ║     ║
║  ║  Drone miner:      None assigned                    ║     ║
║  ║                                                     ║     ║
║  ║  [HAND MINE]   ← Hold E to mine; ore → Storage      ║     ║
║  ║                  (+3–5 ore per 0.8s, direct to Depot)║     ║
║  ║                                                     ║     ║
║  ╚═════════════════════════════════════════════════════╝     ║
║  [E] Mine   [ESC] Close                                      ║
╚══════════════════════════════════════════════════════════════╝

HAND MINE behavior:
  Hold [E]       → Player plays swing animation; 3–5 ore added to nearest Storage per hit
  Storage full   → "STORAGE FULL" floats above player; mining stops
                   (need to wait for Logistics drones to consume ore, or build more Storage)
  Deposit dry    → "DEPLETED" shown on deposit; deposit darkens
  No road        → "NO ROAD — drones cannot reach this deposit"
                   (player can still hand-mine regardless; drones require roads)

PLAYER HAS NO PERSONAL INVENTORY:
  Mined ore goes directly into the outpost Storage system.
  No carry bar, no inventory panel, no "drop items" mechanic.
  Player role: trigger actions + configure buildings + place structures.
  Drones are the only entities with inventory — they haul between buildings.

DEPOSIT DETAIL WHEN DRONE IS ASSIGNED:
  ╔═════════════════════════════════════════════════════╗
  ║  ◉ IRON ORE DEPOSIT                                 ║
  ║  Drone Miner: D-01 — MINING (haul in 12s)           ║
  ║  Output rate: 4.8 ore/min                           ║
  ║  Road length: 8 tiles (8 iron bars spent)           ║
  ║  [RECALL DRONE]   [CLOSE]                           ║
  ╚═════════════════════════════════════════════════════╝
```

---

### 3.4 Furnace Interaction [E near Furnace]

```
╔══════════════════════════════════════════════════════════════╗
║  ╔═════════════════════════════════════════════════════╗     ║
║  ║  ▣ FURNACE                   STATUS: ▶ SMELTING     ║     ║
║  ║  ─────────────────────────────────────────────────  ║     ║
║  ║                                                     ║     ║
║  ║  RECIPES:                                           ║     ║
║  ║  ● Iron Ore × 2 → Iron Bar × 1    (active)          ║     ║
║  ║  ○ Copper Ore × 2 → Copper Bar × 1                  ║     ║
║  ║                                                     ║     ║
║  ║  INPUT BUFFER:                                      ║     ║
║  ║    Iron Ore:   ████████░░░░  14 / 20                ║     ║
║  ║                                                     ║     ║
║  ║  OUTPUT BUFFER:                                     ║     ║
║  ║    Iron Bars:  ██░░░░░░░░░░   3 / 20               ║     ║
║  ║    → Logistics drone hauls bars to Storage auto.   ║     ║
║  ║                                                     ║     ║
║  ║  SMELT RATE:  1 bar / 4 seconds                     ║     ║
║  ║                                                     ║     ║
║  ║  [SWITCH RECIPE: Copper]    [CLOSE]                 ║     ║
║  ╚═════════════════════════════════════════════════════╝     ║
╚══════════════════════════════════════════════════════════════╝

PLAYER ACTIONS (panel is read-mostly):
  [SWITCH RECIPE]  → Changes which ore type is smelted; clears input buffer
  [CLOSE]          → Closes panel; furnace keeps smelting

NO MANUAL TRANSFER:
  Input buffer is filled by Logistics drones (Storage → Furnace).
  Output buffer is emptied by Logistics drones (Furnace → Storage).
  Player never manually deposits or collects — that is always drone work.

FURNACE STALL CONDITIONS:
  Input empty  → STATUS shows IDLE (grey); no bars produced
               Fix: assign a Logistics drone (Storage → Furnace route) in Drone Bay
  Output full  → STATUS shows STALLED (orange); smelting pauses
               Fix: assign a Logistics drone (Furnace → Storage route) in Drone Bay
```

---

### 3.5 Fabricator Interaction [E near Fabricator]

```
╔══════════════════════════════════════════════════════════════╗
║  ╔════════════════════ FABRICATOR ════════════════════════╗  ║
║  ║  Craft buildings and items from processed materials.   ║  ║
║  ╠════════════════════════════════════════════════════════╣  ║
║  ║                                                        ║  ║
║  ║  RECIPES                 COST           CARRY / STOCK  ║  ║
║  ║  ──────────────────────────────────────────────────    ║  ║
║  ║  » Drone Bay             6 iron bars    [CRAFT]        ║  ║
║  ║    (2×2 building, 4 drones/bay)         You have: 3    ║  ║
║  ║                                         Need: 3 more   ║  ║
║  ║  » Road × 4 tiles        2 iron bars    [CRAFT]        ║  ║
║  ║    (lays 4 road tiles)                  You have: 3 ✓  ║  ║
║  ║                                                        ║  ║
║  ║  ░ Marketplace           4 iron bars    (need 4)       ║  ║
║  ║    (sell/buy surplus)    + 2 copper bars               ║  ║
║  ║                                                        ║  ║
║  ║  ░ Storage Expansion     8 iron bars    (need 8)       ║  ║
║  ║    (+2×2 storage tiles)                                ║  ║
║  ║                                                        ║  ║
║  ║  ░ Electrolysis Unit     6 iron bars    (need 6)       ║  ║
║  ║    (water → hydrolox)    + 4 copper bars               ║  ║
║  ║                                                        ║  ║
║  ║  STORAGE (nearby):  Iron Bars ×12 ✓  Copper Bars ×0   ║  ║
║  ║                                                        ║  ║
║  ║  [CRAFT — Road ×4]     Costs 2 iron bars               ║  ║
║  ║  Deducted from Storage. Road placement mode opens.     ║  ║
║  ╚════════════════════════════════════════════════════════╝  ║
╚══════════════════════════════════════════════════════════════╝

RECIPE STATES:
  [CRAFT]   → Affordable; button is amber and clickable
  (need X)  → Greyed out; shows shortfall vs. Storage stock
  ░ recipe  → Locked; not enough materials in Storage

CRAFTING BEHAVIOR:
  Clicking [CRAFT] → bars deducted from Storage; build mode opens immediately
  Crafted building → ghost follows cursor; player places via click (§3.6)
  Crafted Road ×4  → road paint mode opens automatically (§3.7)

MATERIAL SOURCING:
  Fabricator draws entirely from nearest Storage Depot.
  No player carry involved — player has no inventory.
```

---

### 3.6 Building Placement Mode [B]

```
╔══════════════════════════════════════════════════════════════╗
║  ┌──── BUILD MODE ─ press [B] or crafted item auto-opens ──┐  ║
║  │  [ESC] cancel placement                                  │  ║
║  └──────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [WORLD VIEW — ghost building follows cursor over tile grid]  ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                                                         │ ║
║  │  · · · · ╔══════════════════╗ · · · · · · · · ·        │ ║
║  │  · · · · ║                  ║ · · · · · · · · ·        │ ║
║  │  · · · · ║  ■■  ▣▣  · ·    ║ · · · · · · · · ·        │ ║
║  │  · · · · ║  ■■  ▣▣  · ·    ║ · · · · · · · · ·        │ ║
║  │  · · · · ║  ✦✦✦ · [⬡⬡]     ║ · · · · · · · · ·        │ ║
║  │  · · · · ║  ✦✦✦ · [⬡⬡]     ║ · · · · · · · · ·        │ ║
║  │  · · · · ║       GHOST      ║ · · · · · · · · ·        │ ║
║  │  · · · · ║    (yellow)      ║ · · · · · · · · ·        │ ║
║  │  · · · · ╚══════════════════╝ · · · · · · · · ·        │ ║
║  │                                                         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                              ║
║  ┌── SELECTED: Drone Bay (2×2) ────────────────────────────┐ ║
║  │  → VALID PLACEMENT (yellow ghost): inside perimeter,    │ ║
║  │    no overlap, tiles are free.                          │ ║
║  │  → Click to place. [ESC] to cancel.                     │ ║
║  └──────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════╝

PLACEMENT RULES:
  Green ghost  → Must touch a road tile to be valid (Drone Bay rule)
  Yellow ghost → Valid placement: inside perimeter, no overlap
  Red ghost    → Invalid: outside perimeter, overlaps another building, or no road touch

PLACEMENT FEEDBACK TEXT (at cursor):
  "Valid — click to place"
  "Outside perimeter — buildings must be inside the fence"
  "Occupied — tiles in use by [building name]"
  "Drone Bay must touch a road"

CLICK TO PLACE:
  Bars already deducted at Fabricator → building appears at grid position
  Building is immediately operational (drones assignable, furnace idle ready)
  No additional cost at placement time

MOVING AN EXISTING BUILDING:
  Click [PICK UP] on a placed building (via §3.7 building panel) 
  Building enters ghost-follow-cursor mode
  Full tile refund of any tile resources used during original placement
  Drones in transit automatically re-path via A*
```

---

### 3.7 Road Placement Mode [R]

```
╔══════════════════════════════════════════════════════════════╗
║  ┌──── ROAD MODE ─ drag to paint, [R] or [ESC] to exit ───┐  ║
║  │  Each tile costs 1 iron bar. Roads extend outside fence.│  ║
║  └──────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [WORLD VIEW — road tiles preview as you drag cursor]         ║
║                                                              ║
║  · · · · · · · [◉Fe] · · · ·    ← iron deposit             ║
║  · · · · ═══════════ · · · ·    ← road to deposit          ║
║  · · · · ╔═══════════════╗ · ·                              ║
║  · · · · ║  ■■  ▣▣  · ·  ║ · ·                              ║
║  · · · · ║  ■■  ▣▣  ─ ─  ╠═══════════════ [◉Cu]            ║
║  · · · · ║  ✦✦✦ · ·  · · ║                (copper road)    ║
║  · · · · ╚═══════════════╝ · ·                              ║
║                                                              ║
║  ┌──── ROAD BUDGET ────────────────────────────────────────┐ ║
║  │  Iron Bars available: 8  (from carry + nearby Storage)   │ ║
║  │  Tiles queued: 6 (preview)   Cost: 6 bars               │ ║
║  │                                                          │ ║
║  │  [CONFIRM — place 6 tiles for 6 iron bars]              │ ║
║  │  [CANCEL — discard preview]                             │ ║
║  └──────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════╝

ROAD RULES:
  Roads can be placed anywhere on the asteroid (inside or outside perimeter)
  Roads inside perimeter allow Logistics drones to travel between buildings
  Roads outside perimeter allow Miner drones to reach deposits
  Drones cannot leave road tiles — unconnected areas are unreachable

ROAD PREVIEW:
  Click-drag → paints road path preview (yellow tiles)
  Cursor shows tile-by-tile bar cost as preview grows
  [CONFIRM] → deducts bars; tiles become permanent roads
  [CANCEL]  → no bars spent; preview cleared

REMOVING ROADS:
  Hold [Shift] + click road tile → removes road, refunds 1 bar
  Drones on removed road segment → re-path or return to bay if no path exists
```

---

### 3.8 Building Info Panel [E near any building]

```
╔══════════════════════════════════════════════════════════════╗
║  ╔════════════════ STORAGE DEPOT ════════════════════════╗   ║
║  ║  STATUS: ▶ OPERATIONAL                                ║   ║
║  ║  ──────────────────────────────────────────────────   ║   ║
║  ║  INVENTORY:                                           ║   ║
║  ║    Iron Ore:    ████░░░░░░░  14 / 40                  ║   ║
║  ║    Iron Bars:   ██░░░░░░░░░   6 / 40                  ║   ║
║  ║    Copper Ore:  ░░░░░░░░░░░   0 / 40                  ║   ║
║  ║    Copper Bars: ░░░░░░░░░░░   0 / 40                  ║   ║
║  ║                                                        ║   ║
║  ║  [DEPOSIT CARRY]  → Move all carry items into Depot    ║   ║
║  ║  [TAKE ITEMS]     → Move items from Depot to carry     ║   ║
║  ║  [PICK UP DEPOT]  → Enter placement mode (full refund) ║   ║
║  ╚════════════════════════════════════════════════════════╝   ║
╚══════════════════════════════════════════════════════════════╝

DRONE BAY VARIANT:
╔════════════════ DRONE BAY #1 ══════════════════════════════╗
║  STATUS: ▶ 3 of 4 drones active                           ║
║  ────────────────────────────────────────────────────────  ║
║  DRONES:                                                   ║
║    D-01  [MINER]     ▶ MINING at Iron Deposit              ║
║    D-02  [LOGISTICS] ▶ HAULING  Storage → Furnace          ║
║    D-03  [LOGISTICS] ▶ HAULING  Furnace → Storage          ║
║    D-04  [IDLE]      ── not assigned                       ║
║                                                            ║
║  ROLE TOGGLE (click to swap role):                         ║
║    D-04: [SET AS MINER ▶]  [SET AS LOGISTICS ▶]            ║
║                                                            ║
║  [PICK UP BAY]   → Pauses all drones; enters placement mode║
╚════════════════════════════════════════════════════════════╝

ROLE TOGGLE DETAILS:
  Drone role can be swapped at any time (no cooldown, no cost)
  Swapping Miner → Logistics: drone finishes current haul then joins logistics circuit
  Swapping Logistics → Miner: drone finishes current trip then seeks a deposit to mine
  IDLE drones: assigned a role immediately when set

MARKETPLACE VARIANT:
╔═══════════════════ MARKETPLACE ══════════════════════════╗
║  STATUS: ▶ OPEN                                          ║
║  ─────────────────────────────────────────────────────   ║
║  SELL PRICES (surplus only):                             ║
║    Iron Bars:    20 CR each    Stock: 4    [SELL ALL: 80 CR]║
║    Copper Bars:  35 CR each    Stock: 0    ░ none         ║
║                                                          ║
║  BUY (1.5× markup):                                      ║
║    Iron Bars:    30 CR each    [BUY ×1]  [BUY ×5]        ║
║    Copper Bars:  52 CR each    [BUY ×1]  [BUY ×5]        ║
║                                                          ║
║  Current Credits: 0 CR                                   ║
║  [SELL ALL SURPLUS — 80 CR]    [CLOSE]                   ║
╚══════════════════════════════════════════════════════════╝
```

---

### 3.9 Drone Bay Assignment Flow

The primary way to allocate the drone budget (accessible from Building Info Panel, §3.8).

```
╔══════════════════════════════════════════════════════════════╗
║  ╔═══════════════ DRONE ASSIGNMENT ══════════════════════╗   ║
║  ║  Drone Bay #1 — 4 drones total   [3 active / 1 idle]  ║   ║
║  ╠════════════════════════════════════════════════════════╣   ║
║  ║                                                        ║   ║
║  ║  DRONE ROLES AT A GLANCE:                              ║   ║
║  ║                                                        ║   ║
║  ║  MINERS (leave perimeter):     2 ████████░░░░░░░░      ║   ║
║  ║  LOGISTICS (stay inside):      1 ████░░░░░░░░░░░░      ║   ║
║  ║  IDLE:                         1                       ║   ║
║  ║                                                        ║   ║
║  ║  ─────── ALLOCATION SLIDER ──────────────────────      ║   ║
║  ║                                                        ║   ║
║  ║  ◄  MINERS   [  2  ]  ──────────  [  2  ]  LOGISTICS ► ║   ║
║  ║              ▲ click -/+ or drag slider                ║   ║
║  ║                                                        ║   ║
║  ║  ─────── LIVE THROUGHPUT ESTIMATE ─────────────────    ║   ║
║  ║                                                        ║   ║
║  ║  Ore intake:   ~9.6 ore/min  (2 miners × 4.8)         ║   ║
║  ║  Logistics BW: ~8 units/min  (1 drone, 4 tile circuit) ║   ║
║  ║  Bottleneck:   ⚠ LOGISTICS — ore backing up at Storage ║   ║
║  ║                                                        ║   ║
║  ║  Suggested: add 1 more Logistics drone                 ║   ║
║  ║                                                        ║   ║
║  ╠═══ INDIVIDUAL CONTROL ═════════════════════════════════╣   ║
║  ║  D-01 [MINER]     ▶ Mining Iron Deposit (8 tile road)  ║   ║
║  ║  D-02 [MINER]     ▶ Mining Copper Deposit (6 tiles)    ║   ║
║  ║  D-03 [LOGISTICS] ▶ Hauling Storage → Furnace          ║   ║
║  ║  D-04 [IDLE]      ─ [SET MINER] [SET LOGISTICS]        ║   ║
║  ╚════════════════════════════════════════════════════════╝   ║
╚══════════════════════════════════════════════════════════════╝

ALLOCATION SLIDER:
  Drag left  → More Miners; fewer Logistics
  Drag right → More Logistics; fewer Miners
  Slider tooltip shows live throughput estimates as you drag
  "Bottleneck" line updates in real-time based on drone counts

THROUGHPUT ESTIMATE:
  Shows whether ore intake outpaces logistics capacity
  Shows whether furnace is starved or flooded
  This is the primary decision feedback loop for the player
```

---

### 3.10 Production Status Overlay [O]

A lightweight toggle that color-codes every building on the map surface.

```
╔══════════════════════════════════════════════════════════════╗
║  [WORLD VIEW with status overlay active]                     ║
║                                                              ║
║  ┌──── PRODUCTION OVERLAY [O to toggle] ─────────────────┐  ║
║  │  ■ GREEN = Running  ■ YELLOW = Stalled  ■ GREY = Idle  │  ║
║  └──────────────────────────────────────────────────────────┘  ║
║                                                              ║
║   ╔══════════════════╗                                       ║
║   ║  ■G ■■  ■G ▣▣   ║  ← Storage=GREEN(active); Furnace=GREEN║
║   ║  ■■  ■■  ▣▣      ║                                       ║
║   ║  ■Y ✦✦✦ · · ·   ║  ← Fabricator=YELLOW (stalled:        ║
║   ║  ✦✦✦ · · · ·    ║    output buffer full)                 ║
║   ║  · · [⬡⬡] · ·  ║  ← Drone Bay=GREEN (drones active)    ║
║   ║  · · [⬡⬡] · ·  ║                                        ║
║   ╚══════════════════╝                                       ║
║                                                              ║
║   Hovering any building shows one-line tooltip:              ║
║   "Furnace — RUNNING: 0.25 bars/min, input 14 ore"           ║
╚══════════════════════════════════════════════════════════════╝

INTERACTIONS:
  [O]     → Toggle overlay on/off; game continues
  Hover   → One-line status tooltip on any colored building
  Click   → Opens Building Info Panel (§3.8)
  ESC     → Does NOT turn off overlay (only [O] does)
```

---

### 3.11 Settings [ESC]

```
╔══════════════════════════════════════════════════════════════╗
║  ╔═══════════════════ PAUSED ════════════════════════════╗   ║
║  ║  [RESUME GAME]                                         ║   ║
║  ║  [SETTINGS]                                            ║   ║
║  ║  [SAVE GAME]                                           ║   ║
║  ║  [RETURN TO MAIN MENU]                                 ║   ║
║  ╚════════════════════════════════════════════════════════╝   ║
║                                                              ║
║  ─ SETTINGS PANEL (when [SETTINGS] clicked) ─                ║
║  ╔════════════════════════════════════════════════════════╗   ║
║  ║  [AUDIO] [DISPLAY] [CONTROLS]                          ║   ║
║  ╠════════════════════════════════════════════════════════╣   ║
║  ║  AUDIO                                                 ║   ║
║  ║    Master Volume: ██████████  100%  [slider]            ║   ║
║  ║    Music:         ████████░░   80%  [slider]            ║   ║
║  ║    SFX:           █████░░░░░   50%  [slider]            ║   ║
║  ║                                                        ║   ║
║  ║  DISPLAY                                               ║   ║
║  ║    Resolution:  [960×540 ▼]                            ║   ║
║  ║    Fullscreen:  [OFF]  [F11 to toggle]                 ║   ║
║  ║    Pixel Perfect: [ON]                                 ║   ║
║  ║                                                        ║   ║
║  ║  CONTROLS                                              ║   ║
║  ║    MOVE:     WASD / Arrows                             ║   ║
║  ║    INTERACT: E       BUILD:   B                        ║   ║
║  ║    ROADS:    R       OVERLAY: O                        ║   ║
║  ║    [RESET TO DEFAULTS]                                 ║   ║
║  ╚════════════════════════════════════════════════════════╝   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 4. System Sequence Diagrams

Format: `Actor ─[action]──▶ Receiver → result`

---

### 4.1 First Game Start — Outpost Appears

```
Player         MainMenu       SceneManager    GameState      PlanetA1Scene
  │                │               │               │               │
  │─[NEW GAME]────▶│               │               │               │
  │                │─loadScene()──▶│               │               │
  │                │               │─initFresh()──▶│               │
  │                │               │               │─zeroCreds()   │
  │                │               │               │─noBuildings() │
  │                │               │─enter(A1)────────────────────▶│
  │                │               │               │               │─buildGrid(40×30)
  │                │               │               │               │─placePerimeter()
  │                │               │               │               │─placeDeposits()
  │                │               │               │               │  Iron @ (6,4)
  │                │               │               │               │  Copper @ (34,8)
  │                │               │               │               │  Water @ (20,26)
  │                │               │               │               │─placeStarters()
  │                │               │               │               │  Storage @ (8,7)
  │                │               │               │               │  Furnace @ (11,7)
  │                │               │               │               │  Fabricator @ (8,9)
  │                │               │               │               │─spawnPlayer(12,8)
  │◀──────────────────────────────────────────────[RENDER ASTEROID]─│
  │  (player sees: perimeter fence, three deposit markers,          │
  │   pre-placed buildings, key hint bar at bottom)                 │
```

---

### 4.2 Manual Mining → Storage → Furnace → Bars (no carry)

```
Player       InputManager   DepositEntity   StorageEntity  FurnaceEntity   HUD
  │               │               │               │               │         │
  │─WASD──────────▶│               │               │               │         │
  │               │─movePlayer()──▶               │               │         │
  │  (reaches Iron deposit; [E] prompt appears)   │               │         │
  │               │               │               │               │         │
  │─[E] hold──────▶│               │               │               │         │
  │               │─interact()────▶               │               │         │
  │               │               │─swingAnim()   │               │         │
  │               │               │─calcYield(3-5)│               │         │
  │               │               │─addToStorage()▶               │         │
  │               │               │  (direct to nearest Depot)    │         │
  │               │               │               │─updateBars()──────────▶│
  │               │               │─decrementStock()              │         │
  │               │               │               │               │         │
  │  (player mines several times; Storage fills with iron ore)    │         │
  │  (player does NOT carry ore — walks to Furnace to configure)  │         │
  │               │               │               │               │         │
  │─[E] at Furnace▶│               │               │               │         │
  │               │─interact()───────────────────────────────────▶│         │
  │               │               │               │               │─showPanel()
  │◀──────────────────────────────────────────────────Furnace panel visible │
  │  (Panel shows recipe, buffer levels, rate — no transfer buttons)        │
  │               │               │               │               │         │
  │  Furnace input fills automatically when a Logistics drone is assigned   │
  │               │               │               │               │─startSmelt()
  │               │               │               │               │  (when input>0)
  │  Bars accumulate in output buffer → Logistics drone hauls to Storage    │
  │◀───────────────────────────────────────────────[BARS appear in Storage] │
```

---

### 4.3 Crafting First Drone Bay

```
Player      FabricatorEntity  Inventory   GridSystem   DroneBayEntity
  │               │               │            │               │
  │─WASD──────────▶ (moves to Fabricator)       │               │
  │               │               │            │               │
  │─[E]───────────▶│               │            │               │
  │               │─showPanel()   │            │               │
  │               │─checkStock()  │            │               │
  │               │─checkCarry()─▶│            │               │
  │               │               │─report(Iron Bars: 6)       │
  │               │◀──────────────│            │               │
  │               │─updateRecipes()  (Drone Bay: affordable!)   │
  │◀──────────────(Fabricator panel shows Drone Bay as [CRAFT]) │
  │               │               │            │               │
  │─[CRAFT Drone Bay]──────────────▶            │               │
  │               │─deductBars(6)─▶            │               │
  │               │  (from Storage — no carry) │               │
  │               │─openPlacement()────────────▶               │
  │               │  (ghost mode activates)    │               │
  │               │               │            │               │
  │─[B] or auto-opens placement────────────────▶               │
  │               │               │            │─ghostFollow(cursor)     │
  │  (player moves ghost over valid 2×2 tiles touching a road)  │         │
  │               │               │            │               │         │
  │─[CLICK valid tile]────────────────────────▶│               │         │
  │               │               │            │─placeBay()───▶│         │
  │               │               │            │               │─spawnDrones(4)
  │               │               │            │               │─drones[0-3] IDLE
  │◀──────────────────────────────────────────[Drone Bay placed; 4 drones visible]
```

---

### 4.4 Assigning Drone Roles — First Automation

```
Player      DroneBayPanel   DroneBase    MinerBehavior   LogisticsBehavior
  │               │             │               │               │
  │─[E] at Bay────▶│             │               │               │
  │               │─showPanel() │               │               │
  │               │─listDrones()▶             (all IDLE)        │
  │◀──────────────(panel: D01-04 all IDLE)       │               │
  │               │             │               │               │
  │─[SET D-01 MINER]────────────▶               │               │
  │               │             │─setRole(MINER)│               │
  │               │             │─startMiner()─▶│               │
  │               │             │               │─findDeposit()  │
  │               │             │               │─findRoad() (A*)│
  │               │             │               │─travel()       │
  │               │             │               │─mine()         │
  │               │             │               │─haulToStorage()│
  │               │             │               │─loop           │
  │               │             │               │               │
  │─[SET D-02 LOGISTICS]────────▶               │               │
  │               │             │─setRole(LOGI) │               │
  │               │             │─startLogi()──────────────────▶│
  │               │             │               │               │─scanBuildings()
  │               │             │               │               │─findCircuit()
  │               │             │               │               │  Storage→Furnace
  │               │             │               │               │  Furnace→Storage
  │               │             │               │               │─travel() (A*)
  │               │             │               │               │─pickup/drop loop
  │◀──────────────────────────────────────────[DRONES ANIMATE ON MAP]
  │  (D-01 leaves perimeter on road toward iron deposit)         │
  │  (D-02 shuttles between Storage and Furnace inside)          │
```

---

### 4.5 Moving a Building (Full Tile Refund)

```
Player     BuildingPanel   GridSystem    DroneBase    PlacementService
  │               │             │             │               │
  │─[E] at Storage▶│             │             │               │
  │               │─showPanel() │             │               │
  │◀──────────────(Storage panel with [PICK UP DEPOT] button)   │
  │               │             │             │               │
  │─[PICK UP DEPOT]──────────────▶             │               │
  │               │             │─pauseBuilding()             │
  │               │             │─freeTiles(2×2) → pool       │
  │               │             │─refundResources(0) ← no tile cost for free buildings
  │               │             │─notifyDrones()─▶            │
  │               │             │             │─pauseCircuit() │
  │               │             │─enterGhostMode()────────────▶│
  │               │             │             │               │─ghostFollow(cursor)
  │               │             │             │               │
  │  (player moves ghost to new location)      │               │
  │               │             │             │               │
  │─[CLICK new tile]───────────────────────────────────────────▶│
  │               │             │             │               │─placeAt(newTile)
  │               │             │─occupyTiles()               │
  │               │             │─resumeBuilding()            │
  │               │             │─notifyDrones()─▶            │
  │               │             │             │─recalcRoute() │
  │               │             │             │  (A* re-paths)│
  │◀──────────────────────────────────────────[BUILDING MOVED; DRONES RE-PATH]
```

---

### 4.6 Bottleneck Detection — Player Adjusts Drone Split

This is the core gameplay decision loop.

```
Player      HUD/Overlay   StorageEntity   FurnaceEntity   DroneBayPanel
  │               │             │               │               │
  │  (watches base run)         │               │               │
  │               │─updateBars()▶              │               │
  │               │             │─report(ore stock rising)      │
  │               │─showBottleneck banner:                      │
  │               │  "⚠ ORE BACKING UP AT STORAGE — add Logistics"
  │               │             │               │               │
  │─[E] at DroneBay──────────────────────────────────────────────▶│
  │               │             │               │               │─showAllocation()
  │               │             │               │               │  Shows: 2 miners, 1 logi
  │               │             │               │               │  "Bottleneck: Logistics"
  │               │             │               │               │
  │─[drag slider right 1]────────────────────────────────────────▶│
  │               │             │               │               │─reassign(D-01 → LOGISTICS)
  │               │             │               │               │─updateEstimates()
  │               │             │               │               │  "Ore intake: 4.8/min"
  │               │             │               │               │  "Logistics BW: 16 u/min ✓"
  │               │             │               │               │  "Balance: GOOD"
  │               │             │               │               │
  │◀──────────────────────────────────────────[ore backlog clears over next 30s]
  │  (player sees furnace throughput improve; credits ticking up) │
```

---

### 4.7 Phase 1 Win Beat — Autonomy Check

```
Player     AutonTimer    MarketplaceService   HUD         WinCondition
  │               │             │               │               │
  │  (player steps away — stops pressing keys)  │               │
  │               │             │               │               │
  │               │─startTimer()                │               │
  │               │  (120s countdown)           │               │
  │               │             │               │               │
  │               │  (base runs: miners mine, logistics haul,    │
  │               │   furnace smelts, market earns credits)      │
  │               │             │               │               │
  │               │             │─earnCredits()─▶               │
  │               │             │  +20 CR/bar sold              │
  │               │─checkNetBalance()           │               │
  │               │             │  (positive ✓) │               │
  │               │─timeElapsed(120s)           │               │
  │               │─reportToWin()──────────────────────────────▶│
  │               │             │               │               │─triggerAchieve()
  │               │             │               │─showBanner()  │
  │◀──────────────────────────────────────────[BANNER: "OUTPOST SELF-SUSTAINING!"]
  │               │             │               │  "Next: build rocket"]│
  │  (player now focuses on water → hydrolox → rocket launch)    │
```

---

### 4.8 Road Network — Drone Pathfinding on Blocked Route

```
Player      RoadSystem    DroneBase    PathfindingA*   HUD
  │               │             │             │         │
  │  (player removes road tile blocking drone's path)   │
  │               │             │             │         │
  │─[Shift+Click road tile]                   │         │
  │───────────────▶             │             │         │
  │               │─removeTile()│             │         │
  │               │─notifyDrones()────────────▶         │
  │               │             │             │         │
  │               │             │─pathInvalid?│         │
  │               │             │─recompute()▶│         │
  │               │             │             │─astar() │
  │               │             │             │─foundAlt?│
  │               │             │             │  YES     │
  │               │             │◀────────────newPath    │
  │               │             │─rerouteAnim()          │
  │               │             │  (drone visibly turns) │
  │               │             │             │         │
  │               │             │─pathInvalid?│         │
  │               │             │─recompute()▶│         │
  │               │             │             │─astar() │
  │               │             │             │─foundAlt?│
  │               │             │             │  NO      │
  │               │             │◀────────────noPath     │
  │               │             │─returnToBay()          │
  │               │             │             │─showAlert()───▶│
  │               │             │             │  "D-03: no path to destination" │
  │◀──────────────────────────────────────────[HUD: drone recalled; warning shown]
```

---

## 5. State Machine — Player Modes

```
             ┌─────────────────────────┐
         ──▶ │   NORMAL PLAY           │
             │   WASD: move            │
             │   E: interact prompt    │
             └──────────┬──────────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
         [E] near      [B]           [R]
          │             │              │
          ▼             ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  PANEL   │  │  BUILD   │  │  ROAD    │
    │  OPEN    │  │  PLACE   │  │  PAINT   │
    │ (no move)│  │ (ghost)  │  │ (drag)   │
    └──┬───────┘  └──┬───────┘  └──┬───────┘
       │ESC/[E]      │ESC/click     │[R]/ESC
       └─────────────┴──────────────┘
                     │
                     ▼
             ┌─────────────────────────┐
             │   NORMAL PLAY (resume)  │
             └─────────────────────────┘

OVERLAY [O]: toggleable in ANY mode without disrupting mode
PAUSE [ESC from NORMAL]: opens pause menu; game time stops
```

---

## 6. Data Flows — Phase 1 Only

```
DEPOSITS (outside perimeter)
  Iron Ore ────▶ [Miner Drones, road required] ────▶ Storage Depot
  Copper Ore ──▶ [Miner Drones, road required] ────▶ Storage Depot
  Water ────────▶ [Miner Drones, road required] ───▶ Storage Depot (Phase 2 input)

STORAGE DEPOT (inside perimeter)
  Iron Ore ────▶ [Logistics Drones, road] ─────────▶ Furnace (input buffer)
  Copper Ore ──▶ [Logistics Drones, road] ─────────▶ Furnace (input buffer)
  Iron Bars ───◀ [Logistics Drones, road] ◀─────────  Furnace (output buffer)
  Copper Bars ─◀ [Logistics Drones, road] ◀─────────  Furnace (output buffer)

FURNACE (2×1 bar per smelt cycle, 4s)
  Iron Ore × 2 ────────────────────────────────────▶ Iron Bars × 1
  Copper Ore × 2 ──────────────────────────────────▶ Copper Bars × 1

FABRICATOR (consumes bars from carry or Storage)
  Iron Bars × 6 ───────────────────────────────────▶ Drone Bay item
  Iron Bars × 1/tile ──────────────────────────────▶ Road tiles
  Iron Bars × 4 + Copper × 2 ─────────────────────▶ Marketplace item
  Iron Bars × 6 + Copper × 4 ─────────────────────▶ Electrolysis Unit (Phase 2)

MARKETPLACE (overflow sink)
  Iron Bars ───────────────────────────────────────▶ 20 CR each
  Copper Bars ─────────────────────────────────────▶ 35 CR each
  (buy at 1.5× markup: Iron 30 CR, Copper 52 CR)

CREDITS
  Marketplace sells ────────────────────────────────▶ Credits balance
  Buy items at Marketplace ◀────────────────────────  Credits balance
```

---

## 7. Edge Cases & Error Paths

### 7.1 No Road to Deposit
```
Player places Drone Bay but no road to iron deposit yet
→ Miner drone set to MINER role
→ Drone attempts path to iron deposit
→ No road path found
→ Drone enters IDLE state
→ HUD warning: "D-01: No road path to Iron Deposit — build roads first"
→ Fix: Enter Road mode [R], connect base to deposit
→ Drone automatically claims path and begins mining
```

### 7.2 Furnace Input Starved
```
Furnace input buffer = 0 ore
→ Furnace STATUS: IDLE (grey)
→ Overlay shows grey on Furnace tile
→ Tooltip: "Furnace idle — no iron ore in input buffer"
→ Root cause options:
   (a) No Logistics drone assigned → player adds one
   (b) Storage Depot has no ore → miners not returning
   (c) Deposit depleted → no more ore
→ Fix traced via Data Flow (§6) + Overlay
```

### 7.3 All Tiles Full — Cannot Place Building
```
20×15 = 300 interior tiles
Furnace(4) + Storage(4) + Fabricator(6) + DroneBay(4) + roads(~20) = ~38 tiles used
Plenty of space early; constraint bites with multiple Drone Bays + expanded Marketplace

If player attempts to place in occupied tile:
→ Ghost turns RED
→ Tooltip: "Occupied — [Building Name] is here"
→ Player must pick up and reposition, or not place
→ No hard cap panel shown; tile grid is the visual constraint
```

### 7.4 ~~Storage Full — Mining Blocked~~ (removed)

> **Note:** StorageDepot has no capacity limit. This edge case was removed from the implementation — mining and drone dispatch are never blocked by depot fullness. The §7.4 scenario no longer applies.

### 7.5 Drone Returning with No Bay
```
Player picks up Drone Bay while drones are in transit
→ Drone Bay enters placement mode (drones not dismantled — they're autonomous)
→ In-transit drones finish their current haul
→ Attempt to return to Bay → Bay is in ghost mode (not placed)
→ Drones hover at last known Bay position, enter IDLE with flicker
→ HUD: "D-01: Bay not found — finish placement to resume"
→ Fix: place Drone Bay; drones auto-resume
```

---

*End of VoidYield Core Loop TDD + SSD v1.1*
