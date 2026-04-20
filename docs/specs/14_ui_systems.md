# Spec 14 — UI Systems & Feel Design

**Context:** This spec covers the feedback design (what the player sees and hears at each system state change), the Production Dashboard (the primary diagnostic tool for finding bottlenecks), and the Offline Event Log (the welcome-back summary). Together these systems answer VoidYield's most important UX principle: "I can tell something is wrong but I can't find it." Every alert has a concrete number. Every issue has an opportunity cost. Every overlay has a spatial representation so players can diagnose problems without navigating menus.

Visual mockups: `design_mocks/11_hud_desktop.svg`, `design_mocks/12_hud_mobile.svg`, `design_mocks/27_production_dashboard.svg`, `design_mocks/28_offline_event_log.svg`.

---

## Dependencies

- `02_surveying.md` — survey feedback: tone rising toward peak, result card, waypoint placed
- `03_harvesters.md` — harvester feedback: ambient SFX, color-coded warnings
- `04_drone_swarm.md` — traffic overlay ([T] key), drone swarm feedback
- `05_factories.md` — Production Dashboard shows factory-side production and consumption
- `06_consumption.md` — Production Dashboard shows crew-side consumption; supply % bars
- `07_logistics.md` — Logistics Overlay ([L] key) is a companion to the Production Dashboard
- `13_art_direction.md` — all overlay visuals use the art direction color palette

---

## 1. Survey System Feedback

### Survey Mode Active

- HUD border changes color: subtle cyan pulse (#00B8D4, low opacity pulse every 2s)
- Ore readout slots appear in HUD: live concentration values that animate as player moves (numbers tick up and down)
- Audio tone rises in pitch as player approaches a concentration peak (like a Geiger counter — continuous, starts low)
- At the exact peak: "PEAK FOUND" ding plays and the concentration readout locks (number stops animating)

### Survey Waypoint Placed

- A mineral icon appears at the location in-world (visible from ~200px away, matches ore type color)
- Minimap shows it immediately as a colored dot
- Brief text pop at screen center-top: "DEPOSIT MARKED — [Ore Type] [Concentration]%"

### Analysis Complete (Research Lab)

- Notification appears at HUD alert area: "ANALYSIS COMPLETE: [Deposit Name]"
- Deposit's quality card appears on screen for 3 seconds showing all 11 attributes with color coding:
  - Green = top quarter of possible values (750–1000)
  - Yellow = middle half (250–749)
  - Red = bottom quarter (1–249)
- The player now knows exactly which schematics will benefit from this deposit

---

## 2. Harvester System Feedback

### Harvester Running Normally

- Gentle mechanical loop ambient SFX plays from the harvester (audible within ~80px)
- Small particle effect at the drill head
- Harvester icon on minimap: pulses slowly green

### Hopper Filling

- Hopper fill bar on the in-world UI (visible when nearby) changes at:
  - 80% full: orange warning color
  - 95% full: red with flashing icon

### Harvester Stopped — No Fuel

- Warning SFX (brief alarm tone, distinct from hopper full)
- In-world: harvester dims and shows a fuel can icon above it
- Minimap: icon pulses yellow
- HUD alert area: "HARVESTER STOPPED: No Fuel [Harvester Name]"

### Harvester Stopped — Hopper Full

- Same pattern but shows a "full hopper" icon. Distinct warning tone from the fuel warning.
- HUD alert: "HARVESTER STOPPED: Hopper Full [Harvester Name]"

### Refinery Drone Fueling a Harvester

- Drone approaches, plays a brief "refuel" animation (connecting to the intake port)
- Fuel gauge rises smoothly while drone is docked
- SFX: fluid transfer sound (short loop)
- Harvester resumes with a startup animation: drill spins up over ~1 second, particles resume

---

## 3. Drone Swarm Feedback

### Traffic Overlay ([T] Key Toggle)

Colored motion lines representing all active drone paths:

| Drone Type | Trail Color | Hex |
|---|---|---|
| Scout / Heavy (mining) | Blue | #2196F3 |
| Refinery (logistics) | Green | #4CAF50 |
| Survey | Cyan | #00B8D4 |
| Builder | Yellow | #FFC107 |
| Cargo | Purple | #9C27B0 |

At 50+ drones, the overlay looks like a complex network diagram of the player's operation. Turning it on for the first time at swarm scale is a revelation moment.

Drone trail length: 0.3s fade.

### Zone Assignment Animation

When drones accept a zone assignment, they visually converge on the zone boundary, then fan out into the zone. The zone polygon on the minimap fills with moving dots as drones take their positions.

### Fleet Preset Activated

- A full-screen flash (very brief, ~0.15s, translucent, in the preset's theme color)
- All drones simultaneously update their waypoints — the traffic overlay shows a mass redirecting

---

## 4. Rocket Construction Feedback

### Each Component Crafted

A crafted item appears in inventory with quality stats visible. The quality grade displays with color:
- F: grey (#808080)
- D: brown (#8B4513)
- C: white (#FFFFFF)
- B: blue (#2196F3)
- A: gold (#FFD700)
- S: purple with animated shimmer (#9C27B0 + shimmer)

### Component Carried to Launchpad

When the player is in range of the Launchpad with a component in hand, a prompt appears: "[E] Attach [Component Name]"

On attach:
- Satisfying mechanical clunk SFX
- Ghost section fills in with the real asset (shader tween from transparent to full color)
- Brief light flash at the attachment point
- Progress text for 2 seconds: "Hull Assembly attached (SR: 724). The rocket can take a beating."

### Fuel Loaded

The fuel gauge on the Launchpad fills visibly. When it reaches 100%: fuel indicator turns green, launch readiness increases.

### All Components Assembled and Fueled

- The rocket fully illuminates — running lights activate, engine pre-glow appears, a low hum begins
- The LAUNCH button turns bright green
- "PRE-LAUNCH SEQUENCE READY" message in HUD

---

## 5. Planet Stranding Arrival

### Atmospheric Entry

The galaxy map travel animation shows the rocket entering atmosphere: brief heat-shield glow effect on the ship icon. On landing, the camera does a slow pan across the new planet terrain before settling on the player.

First visual impression is critical: Planet B has a purple-cyan sky and glowing Aethite crystal outcroppings visible from the spawn point.

### Fuel Warning on Arrival

Immediately on landing, the HUD shows a persistent (not dismissable) status bar:
"FUEL REMAINING: 20 units — INSUFFICIENT FOR LAUNCH"

This is the "you're committed" signal. Not alarming — just present. It establishes the goal without being punishing.

### First Survey Ping on New Planet

The first use of the Survey Tool on a new planet plays a unique, wider-radius ping with a distinctive sound (different timbre from A1's ping). The first reading of "GAS DETECTED: 41%" is a relief moment — the player knows the path forward exists.

---

## 6. Production Dashboard

The Production Dashboard is a dedicated overlay screen (hotkey [P] or HUD button). It is the answer to "I can tell something is wrong but I can't find it."

### Resource Row Layout

Each tracked resource gets a row:

| Resource | Production (units/min) | Consumption (units/min) | Net Delta | Days to Empty |
|---|---|---|---|---|
| Steel Bars | +124 | −98 (factories: 72, export: 26) | **+26** 🟢 | — |
| Processed Rations | +310 | −380 (crew: 380) | **−70** 🔴 | 0.8 days |
| Power Cells | +88 | −112 (factories: 21, crew: 91) | **−24** 🔴 | 1.4 days |
| Compressed Gas | +540 | −290 (crew: 130, harvesters: 160) | **+250** 🟢 | — |

- **Net Delta:** green = surplus, red = deficit
- **Days to Empty:** appears only for deficits; based on current stockpile ÷ deficit rate
- **Consumption breakdown:** click any row to expand — see exactly which buildings or crew tier is consuming that resource and at what rate
- **Drill-down:** click a production entry to highlight contributing buildings on the world map

### Planet Switcher

The dashboard has a planet tab bar. Switch between A1, Planet B, and Planet C without leaving the screen. Cross-planet deficits surface immediately: if Planet B is importing Steel Bars from A1, the A1 dashboard shows it as export consumption, and the Planet B dashboard shows it as import production.

### Crew/Consumption Tab

A separate tab within the Production Dashboard shows:
- Per-tier population count
- Per-resource supply % (color-coded bars)
- Current productivity multiplier
- Projected days to shortage per resource

See `06_consumption.md` for the full consumption system.

---

## 7. Production Overlay Mode

Press [O] on the world map to toggle Production Overlay (building status colors). Every building gets a color-coded status indicator:

| Color | Meaning |
|---|---|
| 🟢 Green | Running at full rate |
| 🟡 Yellow | Running at partial rate (supply constrained or crew shortage) |
| 🔴 Red | Stalled (no input, no power, full hopper) |
| ⚫ Grey | Idle (no recipe set, or manually paused) |

Building icons in overlay mode also show a small stacked notification dot for actionable issues:
- Fuel canister icon: harvester low fuel
- Hopper icon: harvester full
- Wrench icon: degradation above threshold
- Exclamation: no input material

Players can identify bottlenecks spatially without opening every building's panel. The overlay should be readable at maximum zoom-out.

**Overlay visual:** The world dims slightly (70% brightness, desaturated) when the overlay is active. Buildings glow in their status color — the effect feels like a satellite thermal view.

---

## 8. Offline Event Log

When the player returns after being away, a summary panel appears before the normal HUD loads:

```
╔════════════════════════════════════════════════════╗
║  EMPIRE DISPATCH — While you were away (4h 23m)   ║
╠════════════════════════════════════════════════════╣
║  [🚀] ISV Carver completed 3 routes (A1 → B)      ║
║       Delivered: 2,400 Steel Bars, 600 Alloy Rods  ║
║                                                    ║
║  [⛏] Harvesters extracted 4,820 ore units         ║
║       Harvester A7: ran out of gas after 2h —      ║
║       paused for 2h 23m. (~1,100 units lost)       ║
║                                                    ║
║  [🔬] Survey Drone found Grade B Aethite deposit   ║
║       in Sector 6. Added to Journal.               ║
║                                                    ║
║  [🏭] Factories produced:                          ║
║       Steel Bars ×1,240 | Power Cells ×88          ║
║       Assembly Complex stalled after 1h 12m        ║
║       (Bio-Circuit input depleted)                 ║
║                                                    ║
║  [💰] Net credits: +4,820 CR                       ║
║       (Auto-sell: 2,410 Steel Bars × 2 CR each)    ║
╠════════════════════════════════════════════════════╝
║  [DISMISS]                    [VIEW DASHBOARD]     ║
╚════════════════════════════════════════════════════╝
```

**Key design principles:**
- Every entry has a concrete number, not vague language ("Harvester A7 paused for 2h 23m" not "some harvester had issues")
- Issues are highlighted with their opportunity cost ("~1,100 units lost" from the stall)
- The player can tap "VIEW DASHBOARD" to jump directly to the Production Dashboard with current deficit rows highlighted
- Tone is dispatches from an empire, not error alerts — positive events listed first
- Format: emoji category icon + specific event description + concrete numbers

---

## 9. Panel System — Full List

| Panel | Hotkey | Description |
|---|---|---|
| Production Dashboard | [P] | Resource flow, supply/demand, crew panel |
| Survey Journal | [J] | Deposit log, strategy map overlay |
| Fleet Command | [F] or Drone Bay interact | 5-tab drone management |
| Galaxy Map | [G] | Planet overview + LOGISTICS overlay [L] |
| Tech Tree | Trade Terminal UPGRADES tab | RP/CR costs, node graph |
| Pause / Settings | [Esc] | Standard pause menu |
| Inventory | [I] or HUD icon | Player carry contents |

---

## Implementation Notes

### Godot Node / Scene Structure

```
ui/
  hud.tscn                   # Main HUD: ore readout, alert area, hotkey bar
  survey_result_card.tscn    # Upper-right result card (spawned by survey_tool.gd)
  production_dashboard.tscn  # [P] overlay: resource rows, planet tabs, crew tab
  production_overlay.tscn    # [O] in-world layer: building status color + icons
  offline_event_log.tscn     # Welcome-back panel
  fleet_command_panel.tscn   # 5-tab drone panel
  survey_journal_panel.tscn  # Deposit log + strategy map overlay
scripts/ui/
  production_dashboard.gd    # Reads from GameState + consumption_manager + logistics_manager
  production_overlay.gd      # Queries all buildings, assigns color, positions status icons
  offline_event_log.gd       # Reconstructs what happened during offline period from GameState log
  alert_manager.gd           # Autoload: collects alert signals from all systems, deduplicates
```

### Key Signals

```gdscript
# alert_manager.gd (autoload)
signal alert_raised(category: String, message: String, detail: String)
# category: "harvester_fuel" | "harvester_hopper" | "factory_stall" | "route_stall" | "supply_critical"

# production_dashboard.gd
signal drill_down_requested(resource: String, planet_id: String)
signal planet_tab_changed(planet_id: String)
```

### Offline Event Log Implementation

The game must log events to `GameState.event_log[]` while running in the background (or on save). When the player returns:
1. Calculate offline duration (`current_time - last_save_timestamp`)
2. Run offline simulation (see method below)
3. Apply results to GameState (ore accumulated, credits earned from auto-sell)
4. Identify stalls with timestamps (when did Harvester A7 run out of fuel? when did the Assembly Complex stall?)
5. Format the Offline Event Log with concrete numbers and opportunity costs

**Simulation Method (stepwise, 30-second intervals):**

Use a stepwise simulation implemented in `autoloads/offline_event_log.gd`. For each 30-second step:
1. Calculate harvester outputs using the full BER formula (with FL term): `BER × (concentration / 100) × (ER / 1000) × upgrade_mult + (FL / 1000 × BER × 0.5)`
2. Apply factory consumption (deduct recipe inputs from stockpile, add outputs)
3. Calculate drone task completion: `task_time / 30s` (fractional steps accumulate)
4. Update stockpile quantities per planet
5. Check for stall conditions: hopper_fill ≥ hopper_max → harvester stall event; fuel_remaining ≤ 0 → fuel stall event; stockpile < recipe_input_qty → factory stall event

**Performance cap:** Cap simulation at 8 real hours (960 steps) for performance. Beyond 8 hours, extrapolate linearly from the last simulated state (assume steady-state rates continue — do not simulate further stalls past 8 hours, just report estimated totals).

**Event generation:** The event list is generated from state transitions across steps:
- Stockpile crossed zero → deficit event
- Harvester fuel hit zero → fuel stall event (record timestamp and estimated units lost)
- Factory input depleted → factory stall event
- Cargo ship trip completed → delivery event (cargo ship transit time ÷ 30s steps per leg)

**Godot implementation:** `autoloads/offline_event_log.gd` — called from `save_manager.gd` on game load (see `15_save_load.md`). Returns an array of `{event_type, timestamp_offset, detail_dict}` used to populate the Offline Event Log panel.

The simulation does not need to be fully accurate — approximation is fine. The goal is giving the player enough information to prioritize their first actions on return.

### Implementation Order

1. HUD base: alert area, ore readout slots, hotkey bar
2. Alert manager autoload: wire to harvester signals (fuel empty, hopper full), factory signals (stalled), route signals (stalled)
3. Survey feedback: HUD border color change on survey mode; concentration audio tone (pitch scaling); peak ding
4. Harvester feedback: in-world UI panel (fuel gauge, hopper bar, warning icons); minimap pulse states
5. Traffic overlay ([T] key): colored trails system, drone path lines, zone polygon display
6. Production Dashboard ([P] key): resource rows with production/consumption breakdown; plant/factory drill-down
7. Production Overlay ([O] key): world dimming; building status color glow; stacked status icons
8. Rocket construction feedback: ghost fill-in shader; component attach SFX + text; launch sequence visuals
9. Planet stranding HUD element: persistent fuel warning bar on arrival
10. Offline Event Log: simulation system; welcome-back panel with concrete numbers
11. Production Dashboard planet tabs and cross-planet deficit surfacing
12. Logistics Overlay ([L] on Galaxy Map) — coordinate with `07_logistics.md`
