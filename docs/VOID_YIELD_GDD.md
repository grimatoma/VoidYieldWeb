# VOID YIELD — Game Design Document

**Version:** 0.2-revised  
**Engine:** Godot 4.3+  
**Language:** GDScript  
**Status:** Pre-production  

---

## How to Use This Document

This is the single source of truth for the Void Yield project. At the start of every Claude Code session:

```
Read VOID_YIELD_GDD.md and use it as the full context for this project before doing anything.
```

Update this document as the game evolves. Every major decision should be recorded here.

---

## 1. Concept

Void Yield is a top-down 2D active incremental game set in space. You pilot a miner across asteroid fields, crack open ore nodes by hand, and gradually build out a drone operation that does the hauling for you. Each asteroid is a self-contained challenge — gather enough material, build a ship, and launch to the next rock. Once you're running multiple asteroids, you set up cargo routes between them to feed increasingly expensive projects.

**Core fantasy:** A lone miner stranded on a dead rock, scratching ore out of the ground with a broken drill, who slowly builds their way up to commanding an interplanetary mining empire.

**Feel reference:** Forager's physicality (you walk, you swing, you pick things up) crossed with the satisfying automation curve of games like Factorio or Melvor Idle. The key distinction from pure clickers: everything that happens in the game has a visible, spatial representation. Drones don't just add to a number — you watch them fly out, drill rock, and haul ore back. Upgrades don't just change stats — your outpost literally grows.

**Design principle — NO AI AESTHETIC:** This game must feel hand-crafted at every layer. That means: no default Godot UI theme (custom-drawn panels, buttons, fonts), no procedurally generic layouts, no sterile/clean/minimalist look. The world should feel lived-in, junky, patched-together — like everything was built from salvage. UI elements should look like they belong on a rusty control console, not a Material Design spec sheet. If something looks like a "prototype" or "tech demo," it's not done.

---

## 2. Platform Targets

| Platform | Export Method | Primary Input |
|----------|-------------|---------------|
| Browser | Godot HTML5 export | WASD + mouse |
| Mobile | Godot Android / iOS export | Virtual joystick + tap |
| Desktop | Native (stretch goal) | WASD + mouse |

Browser is the primary target. Design for a **960×540 viewport** (16:9, scales cleanly to common resolutions). Mobile is secondary but must work — all interactions need touch equivalents from day one, not bolted on later.

---

## 3. Visual Identity

| Property | Value |
|----------|-------|
| View | Top-down 2D |
| Tile size | 16×16 pixels (world tiles), 32×32 pixels (characters, buildings, drones) |
| Resolution | 960×540 viewport, pixel-perfect rendering |
| Art style | Pixel art — chunky, hand-placed pixels, visible dithering, NO anti-aliasing |
| Color palette | Gritty industrial: gunmetal greys, rust orange, dirty amber, tarnished copper, deep shadow blues |
| Aesthetic | Salvagepunk. Everything looks jury-rigged, welded from scrap, held together with rivets and hope. Exposed wiring, mismatched panel colors, flickering indicator lights. |

### Art Asset Strategy

**v0.1 approach: rough placeholders are fine.** The priority is a playable game loop, not polished art. Use colored rectangles and simple shapes for the scaffold. Art will be iterated.

For production-quality assets (v0.5+), use these approaches:

1. **Hand-pixel the sprites** using Aseprite, Piskel, or LibreSprite. At 32×32, a single character sprite takes 15–30 minutes.

2. **Use free CC0/CC-BY asset packs as a base** and modify them to match the palette. Good starting points:
   - Kenney's 1-Bit Pack (modify colors)
   - 0x72's 16x16 dungeon tileset (recolor for sci-fi)
   
3. **AI generation with a pixel filter/cleanup pass** — generate at higher resolution as reference, then manually downscale/redraw at target resolution. Apply strict palette enforcement and manual pixel cleanup. Never ship raw AI output — always run it through a dithering/palette-lock pass to kill the "AI look."

**Why the cleanup matters:** Players of incremental games and indie games can spot unprocessed AI art. A strict palette lock + manual touch-up makes it undetectable. The gritty industrial aesthetic actually helps here — imperfections read as intentional texture.

### Godot Pixel Art Settings

These must be configured on project creation — non-negotiable:

```
Project Settings:
  Rendering > Textures > Canvas Textures > Default Texture Filter → Nearest
  Display > Window > Size > Viewport Width → 960
  Display > Window > Size > Viewport Height → 540
  Display > Window > Stretch > Mode → canvas_items
  Display > Window > Stretch > Aspect → keep

All sprite imports:
  Filter: Off
  Mipmaps: Off
```

---

## 4. Core Loop

```
Walk to ore node → hold interact → mining progress bar fills → ore pops out
        ↓
Ore goes into character inventory (limited capacity)
        ↓
Walk back to Outpost → interact with Storage Depot → dump inventory into pool
        ↓
Interact with Sell Terminal → convert pooled ore to Credits
        ↓
Interact with Shop Terminal → buy drones / upgrades / buildings
        ↓
Drones start automating the mine→haul→deposit loop
        ↓
Gather ship components → assemble at Ship Bay
        ↓
Launch to next asteroid → new resources, new challenges
```

### Mining Feel

Mining is NOT instant. When the player interacts with an ore node:

1. A circular progress indicator fills over ~1.5 seconds (base speed, upgradeable)
2. The player character plays a drilling animation (sprite swap)
3. The ore node shakes slightly (screen shake: subtle, 1-2px)
4. On completion: ore particles burst out (3-5 small pixel particles), a satisfying "chunk" sound plays, and the ore count ticks up in the HUD with a brief scale-bounce animation
5. The node transitions to a "cracked" sprite. After 2-3 more mines, it depletes entirely.

Each ore node contains 3-5 ore (randomized). Depleted nodes respawn after a configurable timer (default: 30 seconds for common, 60 for rare).

**This is critical for feel.** The mining interaction is the most-repeated action in the game. If it doesn't feel crunchy and satisfying, nothing else matters.

---

## 5. World Structure

### Per-Asteroid Layout

Each asteroid has two zones:

**The Outpost** — a ramshackle cluster of structures at one edge of the map. Walls/fencing made of scrap metal panels (not clean geometric shapes). All terminals and buildings live here. The outpost starts small (just Sell Terminal and Shop Terminal) and physically grows as you build new structures. Empty lots are visible from the start as cleared ground with foundation markers, so the player can see where future buildings will go.

**The Asteroid Field** — the open exterior surrounding the outpost. Rocky terrain populated with ore nodes of varying richness. The field is larger than the viewport, requiring the player to explore. Ore nodes are hand-placed in the v0.1 asteroid (not randomly scattered — clusters and sparse areas create natural routes). Later asteroids can introduce procedural placement.

### Camera

- Camera follows the player with slight smoothing (lerp factor ~0.1)
- Camera is NOT locked to the player center — it leads slightly in the movement direction (look-ahead of ~32px)
- Camera stops at world edges (no showing void beyond the asteroid)
- The viewport shows roughly a 60×34 tile area (at 16x16 tiles in 960×540)

### World Size

Asteroid 1 field: approximately 150×100 tiles (2400×1600 pixels). Big enough that the player needs to explore but small enough that walking back doesn't feel tedious. The outpost occupies a ~40×30 tile area in one corner.

---

## 6. Asteroid Biomes

Each asteroid has a distinct resource profile. The key design rule: **no asteroid is fully self-sufficient**. Later asteroids have resources that earlier ones need, and vice versa, which is what makes the logistics system meaningful.

| Asteroid | Nickname | Primary | Secondary | Exclusive | Terrain Flavor |
|----------|----------|---------|-----------|-----------|---------------|
| A1 | Iron Rock | Ore | — | — | Barren grey rock, rust-stained craters |
| A2 | Crystal Drift | Ore (scarce) | Crystals | Fuel Crystal | Glittering blue-white formations, jagged terrain |
| A3 | Deep Vein | Ore | Rare Metal | Void Stone | Dark basalt, deep fissures, eerie glow |
| A4+ | TBD | Procedural | — | New chains | Varies |

---

## 7. Resources

| Resource | Source | Used For | First Available |
|----------|--------|----------|-----------------|
| Ore | Mining nodes (all asteroids) | Credits, Hull Plating, basic crafting | A1 |
| Crystals | Mining nodes (A2+) | Advanced upgrades, Navigation Module | A2 |
| Fuel Crystal | A2 exclusive nodes (rare) | Fuel Cells for ship travel | A2 |
| Rare Metal | Mining nodes (A3+) | High-tier crafting | A3 |
| Void Stone | A3 exclusive nodes (very rare) | Prestige currency (future) | A3 |
| Credits | Selling resources at terminal | Purchasing everything | Always |

---

## 8. Player Character

| Property | Detail |
|----------|--------|
| Node type | `CharacterBody2D` |
| Movement | Top-down, 8-directional, velocity-based (not instant) |
| Base speed | 120 px/sec (upgradeable) |
| Desktop input | WASD movement, E to interact, mouse for UI panels |
| Mobile input | Virtual joystick (movement), context button (interact) |
| Inventory | Simple stack: carries up to 10 ore (upgradeable), shown in HUD |
| Collision | 12×12 px hitbox (smaller than sprite for forgiving navigation) |
| Sprite | 32×32, 4 directional idle + 4 directional walk cycle (4 frames each) |

### Interaction System

The player has an `Area2D` interaction zone (radius ~40px). When an interactable enters this zone:

1. The nearest interactable gets highlighted (subtle outline shader or brightness increase)
2. A small prompt label appears above the object: `[E] Mine`, `[E] Sell`, `[E] Build`, etc.
3. On mobile, the action button in the bottom-right updates its icon/label
4. Pressing interact triggers the action — some are instant (sell, deposit), some have a progress bar (mining)
5. If multiple interactables overlap, the nearest one takes priority

**Important:** The player cannot move while mining (held interaction). They can cancel by moving, which resets progress.

---

## 9. Outpost & Buildings

### Outpost Growth

The outpost starts as a tiny cluster and visibly expands. This is one of the primary reward signals — watching your base grow from a shack to an industrial compound.

| Phase | Building Added | How Unlocked |
|-------|---------------|--------------|
| Start | Sell Terminal | — |
| Start | Shop Terminal | — |
| Early | Storage Depot | First purchase from Shop (cheap) |
| Early | Drone Bay | Purchase from Shop |
| Mid | Ship Bay | Purchase from Shop (expensive) |
| Post-ship | Relay Station | Built on A2 after arrival |
| Logistics | Cargo Dock | Relay operational on both ends |

### Building Descriptions

**Sell Terminal** — A battered trade console with a flickering amber screen. Interact to sell all ore in the storage pool for Credits. Shows current sell price and pool contents. The screen flickers occasionally (cosmetic animation — the terminal is old and barely working).

**Shop Terminal** — A vending-machine-like kiosk covered in dents and graffiti-like markings. Opens a side panel with purchasable drones, upgrades, and building blueprints. Items you can't afford are dimmed, not hidden.

**Storage Depot** — A large bin/container where ore is physically stored. Has a visible fill indicator (the bin sprite changes as it fills up). Capacity starts at 50 ore. When full, drones return to idle — they won't mine if there's nowhere to put it. The player can interact to manually deposit their carried ore.

**Drone Bay** — A landing pad with charging slots. Active drones launch from here and return here between runs. Shows drone count (active/max). Drones physically sit on the pad when idle.

**Ship Bay** — An assembly gantry that shows the ship being built piece by piece as you deliver components. Four visible construction stages (25/50/75/100%). Interacting opens a panel showing required components and current progress.

**Relay Station** — A tall antenna structure. Must be built on both the origin and destination asteroids to enable cargo routes between them.

**Cargo Dock** — A loading platform for inter-asteroid cargo drones. Interact to configure routes (what resource, how much, how often).

---

## 10. Storage Pool System

This is the economic heart of the game's automation curve. Get it right and the progression feels natural; get it wrong and it feels either tedious or pointless.

```
Ore enters pool (player deposit or drone delivery)
        ↓
Pool has a capacity cap → drones idle when full
        ↓
Player visits Sell Terminal → converts pool contents to Credits
        ↓
Upgrade Storage Capacity → more buffer before intervention needed
        ↓
Ore Hauler drone upgrade → drones deliver directly, cutting out player deposit step
        ↓
Auto-Sell upgrade → pool auto-sells when threshold is hit, full hands-off
```

### Player Involvement Curve

| Stage | What the Player Does | Feels Like |
|-------|---------------------|------------|
| Early | Manually mines, manually carries, manually sells | Scrappy survival |
| First drones | Supplements manual mining, still sells manually | Getting help |
| Storage upgrade | Checks in less often, bigger sell batches | Breathing room |
| Hauler drones | Drones handle delivery, player just hits sell | Manager mode |
| Auto-sell | Fully automated, player focuses on expansion goals | Industrialist |

### Starting Balance Values

| Parameter | Value | Notes |
|-----------|-------|-------|
| Storage capacity (base) | 50 ore | Fills up in ~2 minutes with one drone |
| Storage upgrade cost | 100 Credits | +25 capacity per upgrade |
| Ore sell price | 1 Credit per ore | Simple, easy to reason about |
| Auto-sell unlock cost | 500 Credits | Late-game milestone for A1 |

---

## 11. Drones

Drones are the primary automation mechanic and must feel like real entities, not stat buffs. Each drone is a visible, pathfinding actor that physically traverses the world.

### Drone Behavior State Machine

```
IDLE (at Drone Bay)
  │
  ├─ Storage full? → stay IDLE
  ├─ No unclaimed nodes? → stay IDLE (try again in 2 sec)
  │
  └─ Node available + storage has room → SEEKING
      │
      └─ Pathfind to nearest unclaimed ore node → MINING
          │
          ├─ Claim the node (others skip it)
          ├─ Play mining animation for [mine_time] seconds
          ├─ Collect ore (up to carry capacity)
          ├─ Release claim on node
          │
          └─ RETURNING
              │
              ├─ Pathfind back to Storage Depot
              ├─ Deposit ore into pool
              │
              └─ Back to IDLE (brief pause, then loop)
```

**Edge cases to handle:**
- Claimed node gets depleted by player before drone arrives → drone re-targets
- Storage fills while drone is mining → drone dumps what it can, waits
- All nodes depleted → drone idles at bay, re-checks periodically
- Drone pathing blocked → NavigationAgent2D handles rerouting

### Drone Types

| Name | Speed | Carry | Mine Time | Cost | Unlock |
|------|-------|-------|-----------|------|--------|
| Scout Drone | 60 px/s | 3 ore | 3 sec | 25 Credits | Shop — early |
| Heavy Drone | 40 px/s | 10 ore | 2 sec | 150 Credits | Shop — mid |
| Ore Hauler | 80 px/s | 5 ore | 3 sec | 300 Credits | Shop — late |

**Ore Hauler special:** Skips the storage pool entirely — delivers to Sell Terminal and auto-converts to Credits. This is a different kind of drone, not just a stat upgrade.

### Drone Upgrades

| Upgrade | Effect | Cost | Notes |
|---------|--------|------|-------|
| Drill Speed I/II/III | -20% mine time per level | 50/150/400 | Stacks multiplicatively |
| Cargo Rack I/II | +2 carry capacity per level | 75/200 | All drone types |
| Thruster Boost | +25% move speed | 100 | All drone types |
| Extended Range | Drones target nodes 50% further | 125 | Useful on larger asteroids |
| Fleet License | +1 max active drone | 100 (scaling) | Cost doubles each purchase |

---

## 12. Ship Building

The ship is the milestone gate between asteroids. Building it should feel like a genuine achievement, not a formality.

### Ship Components

| Component | Source | Quantity Needed |
|-----------|--------|-----------------|
| Hull Plating | Crafted: 50 Ore → 1 Hull Plating (at Ship Bay) | 5 |
| Engine Core | Rare drop from specific ore nodes on A1 (marked differently) | 1 |
| Navigation Module | Purchased from Shop | 1 (costs 300 Credits) |
| Fuel Cell | NOT needed for first launch | — |

**Design fix from Sonnet draft:** The original GDD had Fuel Cells requiring Fuel Crystals from A2 to build the ship that takes you TO A2 — a circular dependency. Fix: the first ship launch doesn't require fuel (it's a one-way desperation launch with whatever propellant you can scrape together). Fuel Cells become necessary for RETURN trips and for establishing regular cargo routes. This makes narrative sense (you're stranded, you make do) and avoids the logic hole.

### Ship Bay Visual Progression

The ship physically assembles in the Ship Bay as you deliver components:
- 0%: Empty gantry frame
- 25%: Hull skeleton visible
- 50%: Hull plated, engine bay exposed  
- 75%: Engine mounted, wiring visible
- 100%: Complete — thruster test-fires, ready to launch

Each delivery triggers a brief cutscene-like moment: sparks fly, a "construction complete" sound plays, and the ship sprite updates. These moments should feel earned.

---

## 13. Inter-Asteroid Logistics (v0.4+)

Unlocked after building a Relay Station on Asteroid 2.

| Structure | Function |
|-----------|----------|
| Relay Station | Establishes a connection between two asteroids |
| Cargo Dock | Manages automated cargo drone routes |

### Route Configuration

At the Cargo Dock, the player defines routes:
- **Resource type** to ship
- **Amount per shipment**
- **Interval** (every X seconds of game time)

Cargo drones are visible on the Galaxy Map moving between asteroids. Multiple routes can run simultaneously. Routes can be paused or adjusted.

---

## 14. Upgrades

| Upgrade | Effect | Cost | Category |
|---------|--------|------|----------|
| Drill Bit Mk.II | +50% manual mine speed | 50 Credits | Player |
| Cargo Pockets | +5 ore inventory capacity | 75 Credits | Player |
| Thruster Boots | +20% movement speed | 60 Credits | Player |
| Storage Expansion | +25 pool capacity | 100 Credits (scaling) | Outpost |
| Drone Drill I | -20% drone mine time | 50 Credits | Drones |
| Drone Cargo Rack | +2 drone carry capacity | 75 Credits | Drones |
| Fleet License | +1 active drone slot | 100 Credits (doubling) | Drones |
| Auto-Sell | Pool auto-sells at 80% capacity | 500 Credits | Automation |

All upgrade costs are starting values for playtesting. Expect these to change significantly during balancing.

---

## 15. UI Design

### Design Philosophy

The UI must look like it belongs on a salvaged spacecraft console — not like a default Godot theme, not like Material Design, and definitely not like a generic "game UI kit."

**Specific directives:**
- **No rounded rectangles with drop shadows.** Panels are angular, riveted, with visible edge wear.
- **Custom font.** Use the included `VoidYield Terminal` font (`assets/fonts/VoidYieldTerminal.ttf`) — a custom-built 5×7 monospace pixel font. If additional styles are needed, "Press Start 2P" (OFL, Google Fonts) is a good secondary. NOT Godot's default font.
- **Color scheme for UI:** Dark gunmetal background (#2a2a2e), amber text (#d4a843) for primary, rust red (#8b3a2a) for warnings, pale green (#7cb87c) for positive values. No pure white, no pure black.
- **Panel style:** 9-patch textures that look like welded metal panels. Visible rivets at corners. Slight texture/noise.
- **Buttons:** Look like physical switches or console buttons, not flat rectangles. Depress on click (1px offset + darken).
- **Numbers:** Ore/Credit displays should look like LED readouts or stamped counters, not plain text labels.

### Layout

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐                     ┌────────────┐ │
│ │ ORE: 047 │                     │ CR: 00,230 │ │  ← LED-style counters
│ │ [████░░] │                     └────────────┘ │  ← Storage bar (only when pool exists)
│ └──────────┘                            [⚙]    │
│                                                 │
│              [ GAME WORLD ]                     │
│                                                 │
│                    ◉                            │
│               [E] Mine                          │  ← Context prompt (world-space, not UI)
│                                                 │
│  ┌───┐                              ┌─────┐    │
│  │ ◎ │                              │ ⚡  │    │  ← Mobile only: joystick + action
│  └───┘                              └─────┘    │
└─────────────────────────────────────────────────┘
```

**Shop/Upgrade panels:** Slide in from the right edge when at a terminal. Semi-transparent dark background. Items listed vertically with icon, name, cost, and a brief description. Can't-afford items are visually dimmed but still visible (FOMO is part of the loop). Close with Escape or by walking away from the terminal.

**Galaxy Map:** Full-screen overlay with a starfield background. Asteroids shown as stylized top-down planet views. Connected asteroids have visible route lines. Current asteroid is highlighted. Accessed only from the completed ship.

---

## 16. Audio Direction

Sound is critical for making the game feel handcrafted. A silent game feels like a tech demo.

### Music
- Ambient electronic / dark synthwave with industrial undertones
- Low BPM (~70-90), atmospheric, not intrusive
- Should feel like the hum of machinery and the emptiness of space
- Recommend: commission a short loop (2-3 minutes) or use CC0 tracks from Freesound/OpenGameArt
- Different ambient track per asteroid biome

### Sound Effects (v0.1 Priority)
| Action | Sound | Notes |
|--------|-------|-------|
| Mining hit | Metallic crunch/drill | Varies slightly each hit (2-3 variants) |
| Mining complete | Satisfying "chunk" + ore scatter | Must feel rewarding |
| Ore pickup | Soft metallic clink | Quick, not annoying on repeat |
| Deposit ore | Clatter of rocks into metal bin | Weighty |
| Sell | Cash register ding (space-ified) | The dopamine hit |
| Purchase | Mechanical clunk | Confirmation |
| Drone launch | Thruster whir | Spatial audio — louder near drone bay |
| Drone mining | Distant drilling | Quieter version of player mining |
| Drone deposit | Softer clatter | Background activity |
| Walk | Soft boot-on-rock footsteps | 3-4 variants, alternating |
| UI panel open | Hydraulic hiss | Like a hatch opening |
| UI panel close | Softer hiss | Reverse |

### Juice & Feel
These are non-negotiable for v0.1:
- **Screen shake** on mining completion (1-2px, 100ms)
- **Number pop** when ore/credits are gained (float up, fade out, like damage numbers)
- **Scale bounce** on HUD counter when value changes (1.2x → 1.0x over 200ms)
- **Particle burst** when ore node is mined (3-5 small pixel particles, grey/orange)
- **Drone thruster trail** — 1-2px particle trail behind moving drones
- **Building placement** — brief dust puff when a new building appears

---

## 17. Godot Project Structure (v0.1 only)

Only include files that v0.1 actually needs. Do not scaffold v0.2+ systems — they will be added when those versions begin. Premature architecture is technical debt.

```
project.godot

autoloads/
├── game_state.gd         # Ore, credits, inventory, storage pool, asteroid state
├── producer_data.gd      # Data-driven definitions: drone stats, upgrade costs
└── save_manager.gd       # JSON serialization to user://save.json

scenes/
├── main.tscn             # Root scene — loads world + UI
├── world/
│   ├── asteroid_field.tscn   # The A1 world scene — tilemap + placed nodes
│   ├── outpost.tscn          # Outpost area with building slots
│   ├── ore_node.tscn         # Mineable node: states, respawn, claim
│   ├── sell_terminal.tscn    # Interactable
│   ├── shop_terminal.tscn    # Interactable
│   ├── storage_depot.tscn    # Ore pool container
│   └── drone_bay.tscn       # Drone spawner and idle pad
├── player/
│   └── player.tscn           # CharacterBody2D — movement, interaction, inventory
├── drones/
│   └── scout_drone.tscn     # State machine drone with pathfinding
└── ui/
    ├── hud.tscn              # Ore counter, credit counter, storage bar
    ├── shop_panel.tscn       # Side-sliding purchase panel
    ├── upgrade_panel.tscn    # Side-sliding upgrade panel  
    ├── interaction_prompt.tscn # "[E] Mine" label (world-space, not screen-space)
    └── mobile_controls.tscn  # Virtual joystick + action button (touch only)

assets/
├── sprites/              # All pixel art organized by category
│   ├── player/
│   ├── drones/
│   ├── world/
│   ├── buildings/
│   ├── ui/               # 9-patch panel textures, button sprites, font
│   └── effects/          # Particles, mining sparks
├── audio/
│   ├── sfx/
│   └── music/
└── fonts/
    └── VoidYieldTerminal.ttf  # Custom 5x7 monospace pixel font (included)

scripts/
└── utils/
    └── number_format.gd  # Display formatting (1,234 style — no BigNumber needed in v0.1)
```

**Note on naming:** Godot convention is `snake_case` for files, not `PascalCase`. Follow it.

---

## 18. Signal Architecture

Godot's signal system should be the backbone of communication between systems. This keeps things decoupled and makes future expansion clean.

### Key Signals (defined in GameState autoload)

```gdscript
signal ore_changed(new_amount: int)
signal credits_changed(new_amount: int)
signal inventory_changed(carried: int, max_carry: int)
signal storage_changed(stored: int, capacity: int)
signal storage_full
signal storage_emptied
signal ore_sold(amount: int, credits_earned: int)
signal upgrade_purchased(upgrade_id: String)
signal drone_deployed(drone: Node2D)
signal drone_returned(drone: Node2D, ore_carried: int)
signal building_constructed(building_id: String)
```

UI elements connect to these signals — they never poll GameState directly. Drones emit their own signals that GameState listens to. This is how Godot is meant to work.

---

## 19. Key Architectural Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Language | GDScript | Best Godot community coverage, no setup overhead |
| State management | Autoload singletons | Any scene can access GameState without coupling |
| Data approach | Data-driven (ProducerData) | Easy to add drones/upgrades without touching logic |
| Communication | Signal-based | Decoupled, idiomatic Godot, easy to extend |
| Storage system | Pool-first, auto-sell as upgrade | Creates meaningful automation progression |
| Drone AI | State machine + NavigationAgent2D | Clean, debuggable, handles edge cases |
| Node claiming | Drones claim nodes to prevent piling | Distributes drones naturally across field |
| Ore nodes | Fixed positions, respawn timer, 3-5 ore each | Predictable, balanceable, spatial strategy |
| Save format | JSON to user:// | Human-readable, easy to debug, Godot-native path |
| Mobile controls | Virtual joystick only on touch detection | Doesn't clutter desktop/browser UI |
| Camera | Smooth follow with look-ahead | Feels responsive, shows where you're going |
| UI theme | Fully custom (no default Godot theme) | Anti-AI-aesthetic requirement |
| File naming | snake_case | Godot convention |
| Scaffolding scope | v0.1 only | Don't build what you don't need yet |

---

## 20. Starting Balance Values (v0.1)

These are initial values for playtesting. They WILL change.

| Parameter | Value |
|-----------|-------|
| Player move speed | 120 px/sec |
| Player inventory capacity | 10 ore |
| Mining time (player, base) | 1.5 seconds |
| Ore per node (common) | 3–5 (random) |
| Node respawn time (common) | 30 seconds |
| Node count on A1 | ~15 active at any time |
| Storage capacity (base) | 50 ore |
| Ore sell price | 1 Credit/ore |
| Scout Drone cost | 25 Credits |
| Scout Drone speed | 60 px/sec |
| Scout Drone carry | 3 ore |
| Scout Drone mine time | 3 seconds |
| Heavy Drone cost | 150 Credits |
| Fleet License base cost | 100 Credits (doubles each) |
| Max fleet size (base) | 1 |
| Drill Bit Mk.II cost | 50 Credits |
| Storage Expansion cost | 100 Credits |
| Auto-Sell cost | 500 Credits |
| Ship: Hull Plating recipe | 50 Ore → 1 plating |
| Ship: Hull Plating needed | 5 |
| Ship: Nav Module cost | 300 Credits |
| Ship: Engine Core | Rare drop (~5% chance from specific nodes) |

### Estimated Progression Timeline (target)

| Milestone | Target Time |
|-----------|------------|
| First drone purchased | ~5 minutes |
| Storage upgrade | ~8 minutes |
| Second drone | ~12 minutes |
| Heavy drone | ~20 minutes |
| Ship building starts | ~30 minutes |
| Ship complete, launch to A2 | ~45-60 minutes |

---

## 21. Development Roadmap

| Version | Scope |
|---------|-------|
| v0.1 | A1 only. Player movement, mining with progress bar, interaction system, outpost with Sell + Shop + Storage Depot + Drone Bay, Scout Drone with full pathfinding AI, storage pool system, mobile controls, custom UI theme, audio SFX, juice (screen shake, particles, number pops) |
| v0.2 | Ship Bay, crafting, ship components, Engine Core rare drops, visual ship construction |
| v0.3 | Galaxy Map, travel to A2, Crystal Drift biome, Crystals + Fuel Crystals, Heavy Drone |
| v0.4 | Relay Station, Cargo Dock, inter-asteroid logistics, cargo drone routes |
| v0.5 | A3 Deep Vein, Rare Metals, Void Stone, deeper crafting, Ore Hauler drone |
| v0.6 | Prestige loop — "Launch to new star system", permanent multipliers |
| v0.7 | Offline progress calculation |
| v0.8 | Procedural asteroid generation for A4+ |
| v1.0 | Polish, music, balancing pass, browser + mobile QA |

---

## 22. V0.1 Claude Code Scaffolding Prompt

Use this prompt at the start of the first Claude Code session. Read the GDD first, then paste this.

```
You have read VOID_YIELD_GDD.md. Now scaffold the complete v0.1 project.

Create a Godot 4 GDScript project with the following. Follow snake_case 
naming throughout. Only build what v0.1 requires — no future systems.

PROJECT SETTINGS:
- Pixel art config as specified in GDD Section 3
- 960x540 viewport
- Register autoloads: game_state, producer_data, save_manager

AUTOLOADS:
1. game_state.gd — ore, credits, inventory (carried/max), storage pool 
   (stored/capacity), all signals from GDD Section 18
2. producer_data.gd — dictionary of drone definitions and upgrade 
   definitions with costs, stats per GDD Section 20 balance values
3. save_manager.gd — save/load to user://save.json, serialize all 
   GameState values, auto-save every 60 seconds

PLAYER (player.tscn):
- CharacterBody2D with 8-directional movement at 120 px/sec
- 12x12 collision shape (smaller than sprite)
- Area2D interaction zone (radius 40px)
- Detects nearest interactable, shows prompt, triggers on E key
- Cannot move while mining (held interaction with progress)
- Inventory: carries ore up to max, deposits at Storage Depot
- Placeholder sprite: colored rectangle with directional indicator

INTERACTION SYSTEM:
- Interactable interface: all interactable nodes have an interact() method 
  and a get_prompt_text() method
- Mining takes 1.5 sec (progress bar), yields 3-5 ore per completion
- Sell/deposit/shop are instant interactions
- World-space prompt label, not screen-space

ORE NODE (ore_node.tscn):
- StaticBody2D with three visual states: full, cracked, depleted
- Contains 3-5 ore (randomized on spawn/respawn)
- Each mine action takes one "charge", shows progress, yields 1 ore
- When charges exhausted → depleted state → respawn timer (30 sec)
- Claim system: bool, claimed by at most one drone
- When claimed by drone but player mines it empty → drone re-targets

OUTPOST (outpost.tscn):
- Contains: SellTerminal, ShopTerminal, StorageDepot, DroneBay
- Each is an interactable node with appropriate behavior
- StorageDepot tracks pool (starts at 50 capacity)
- DroneBay spawns and manages active drones
- Empty building slots visible as placeholder markers for future buildings

ASTEROID FIELD (asteroid_field.tscn):
- TileMap with hand-placed rock tiles
- ~15 OreNode instances placed in clusters around the outpost
- Outpost instance positioned in one corner
- NavigationRegion2D covering the walkable area for drone pathfinding
- World bounds that camera respects

SCOUT DRONE (scout_drone.tscn):
- CharacterBody2D with NavigationAgent2D
- State machine: IDLE → SEEKING → MINING → RETURNING → DEPOSITING → IDLE
- Stats from GDD Section 20 balance values
- Claims target node, releases on completion or if node depleted
- Deposits ore to storage pool on return
- Handles edge cases: storage full → idle, no nodes → idle + retry, 
  claimed node depleted → re-target
- Placeholder sprite: small colored rectangle

HUD (hud.tscn):
- Ore counter and Credits counter (top corners)
- Storage bar (under ore counter, only visible when storage depot exists)
- All displays update via signals from GameState, never polling
- Number pop effect: when values change, brief scale bounce animation

SHOP PANEL (shop_panel.tscn):
- Slides in from right when player interacts with Shop Terminal
- Lists available purchases with name, cost, description
- Unaffordable items are dimmed, not hidden
- Close on Escape or walking away from terminal

MOBILE CONTROLS (mobile_controls.tscn):
- Virtual joystick (bottom-left), action button (bottom-right)
- Only visible when touch input is detected (Input.is_touch_available)
- Action button label updates based on nearest interactable

CAMERA:
- Camera2D following player with smoothing (lerp ~0.1)
- Look-ahead in movement direction (~32px)
- Clamped to world bounds

JUICE (non-negotiable):
- Screen shake on mining completion (1-2px, 100ms)
- Particle burst when ore node mined (GPUParticles2D, 3-5 particles)
- Number pop on ore/credit gain (float up, fade out, 500ms)
- Scale bounce on HUD counter change (1.2x → 1.0x, 200ms tween)

Use placeholder ColorRect sprites throughout — no art assets needed. 
Add TODO comments where art, audio, and final balance values need to 
be filled in. Every placeholder should be a consistent, readable color 
(player = blue, ore = orange, terminals = yellow, drones = green, 
walls = dark grey).
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Session 1 | Initial GDD — concept, loop, world, drones, progression (Sonnet 4.6) |
| 0.2-revised | Session 2 | Full review by Opus 4.6: fixed Fuel Cell bootstrap paradox, added camera/viewport spec, added audio direction, added juice requirements, added balance values, added signal architecture, removed premature BigNumber system, removed premature v0.2+ autoloads from scaffold, added anti-AI-aesthetic guidelines, replaced AI art generation with hand-pixel strategy, added custom UI theme requirements, specified mining feel/progress bar, added interaction edge cases, added drone state machine edge cases, fixed file naming to snake_case, tightened scaffolding prompt to v0.1 scope only |
