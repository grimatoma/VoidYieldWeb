# VoidYield Web — UI Menu Catalog

A factual reference of every UI surface currently in the game. One section per
component in `src/ui/`. Per surface: purpose, how it opens/closes, every element
(buttons, widgets, visuals, dynamic data), and what each interactive element
does.

This document is intentionally **non-prescriptive about visual style**
(colors, typography, layout, spacing). It is a behavioral / structural baseline
for redesigning the UX.

Source of truth: `src/ui/*.ts`, `src/services/InputManager.ts`,
`docs/specs/14_ui_systems.md`, `docs/specs/16_input_map.md`.

---

## Index

Always-visible HUD
- [HUD](#hud)
- [PopulationHUD](#populationhud)
- [UILayer](#uilayer)

Global menus / map
- [TouchMenuOverlay](#touchmenuoverlay)
- [GalaxyMap](#galaxymap)
- [TechTreePanel](#techtreepanel)
- [DebugOverlay](#debugoverlay)

World prompts
- [InteractionPrompt](#interactionprompt)
- [TouchInteractButton](#touchinteractbutton)
- [BuildPromptOverlay](#buildpromptoverlay)

Build / placement
- [BuildMenuOverlay](#buildmenuoverlay)

Diagnostic / info panels
- [ProductionDashboard](#productiondashboard)
- [FleetPanel](#fleetpanel)
- [SurveyJournalPanel](#surveyjournalpanel)
- [SurveyOverlay](#surveyoverlay)
- [LogisticsOverlay](#logisticsoverlay)

Building interaction panels (opened with `[E]` on a building/object)
- [DepositPanel](#depositpanel)
- [DroneBayPanel](#dronebaypanel)
- [DroneDepotOverlay](#dronedepotoverlay)
- [DroneManagementPanel](#dronemanagementpanel)
- [ElectrolysisOverlay](#electrolysisoverlay)
- [FabricatorPanel](#fabricatorpanel)
- [FurnaceOverlay](#furnaceoverlay)
- [HabitationPanel](#habitationpanel)
- [ShipBayPanel](#shipbaypanel)
- [ShopPanel](#shoppanel)

Modal events
- [OfflineDispatchPanel](#offlinedispatchpanel)
- [SectorCompleteOverlay](#sectorcompleteoverlay)
- [PrestigePanel](#prestigepanel)

Reference
- [Key bindings → menus map](#key-bindings--menus-map)

---

## HUD

**Purpose.** Always-visible heads-up display. Shows resource pools, total storage
usage, credits, drone count, and outpost identifier.

**Lifecycle.** Mounted on scene start, never closed.

**Elements**
- Resources rail
  - Header: outpost ID + planet name
  - Resource row (one per tracked ore type)
    - Ore color swatch
    - Resource label + sublabel (e.g. "VORAX · Mined")
    - Quantity / capacity readout (`x / y`)
    - Fill bar showing utilization
- Storage bar
  - "STORAGE" label
  - Used / max readout
  - Horizontal fill bar
- Credits chip — numeric value with `CR` unit
- Drones chip — "DRONES" label + current count

**Interactions.** None; read-only. All values are reactive (signals + EventBus).

---

## PopulationHUD

**Purpose.** Compact widget showing colony status: pioneers count, gas + water
fulfillment, productivity multiplier.

**Lifecycle.** Always visible once mounted.

**Elements**
- Pioneers row — label + `current / capacity`
- Gas row — label + horizontal fill bar (0–100%)
- H2O row — label + horizontal fill bar (0–100%)
- Productivity row — label + percentage

**Interactions.** None. Bar fill levels and the productivity number update on
`population:changed` and `needs:changed`. Bar fill state has three thresholds
(full / partial / critical) used to convey shortage severity.

---

## UILayer

**Purpose.** Master mount point that owns every HTML overlay above the PixiJS
canvas. Not a user-facing panel by itself, but exposes a couple of always-on
controls.

**Elements**
- Root container `ui-layer`
- Debug toggle button — label `DEBUG [~]`, top-right corner
- HUD-scale CSS variable, recomputed on resize

**Interactions**
- Debug button — toggles `DebugOverlay` visibility (same action as `~`).
- `closeAllPanels()` — invoked by `Esc`; closes every interaction panel.
- `cyclePanels()` — invoked by `Tab`; closes everything.
- HUD scale is the product of an auto factor (reference width 1280) and a user
  factor (range 0.6–1.6, default 1.0, persisted to localStorage).

---

## TouchMenuOverlay

**Purpose.** On-screen master menu for non-keyboard users. Single button that
expands to a categorized list of every action / panel / tool.

**Lifecycle.** Toggled via the on-screen button or `[M]`. Auto-closes on item
selection or click outside.

**Elements**
- Toggle button — icon glyph + "MENU" label
- Dropdown panel, grouped into four sections. Each menu item shows label + key
  hint.
  - **VIEWS** — Galaxy Map, Inventory, Survey Journal, Drone Management, Fleet
    Command, Production, Logistics
  - **OVERLAYS** — Production View, Coverage, Survey Tool
  - **TOOLS** — Zone Paint, Retool, Interact, Dispatch
  - **SYSTEM** — Toggle Menu, Pause/Close, Close All, Fullscreen, Debug Panel

**Interactions**
- Toggle button / `[M]` — opens or closes the dropdown.
- Each menu item — dispatches its `InputAction` through `inputManager.dispatch()`
  (identical effect to pressing the corresponding key). Dropdown closes after.
- Clicking outside closes the dropdown.
- `aria-expanded` reflects open state.

---

## GalaxyMap

**Purpose.** Standalone modal showing every planet, the routes between them, and
the player's current location. Initiates inter-planet travel.

**Lifecycle.** `[G]` toggles. Click backdrop or close button to dismiss.

**Elements**
- Backdrop (dismisses on click)
- Header — title `[GALAXY MAP]`, hint text, close button
- Map canvas
  - Decorative star dots
  - Route lines between unlocked planet pairs (style varies by access level:
    normal vs. frontier)
  - Planet node, per planet:
    - Colored dot in planet theme color
    - Planet label
    - `[HERE]` indicator on the current planet
    - `TRAVEL` button (only on unlocked, non-current planets)

**Interactions**
- `setVisible(v)` — show/hide.
- Each `TRAVEL` button emits a travel event for that planet ID through the
  `onTravel(callback)` registration.
- Locked planets: greyed, no button. Current planet: marked, no button.
  Routes only render when both endpoints are unlocked.

---

## TechTreePanel

**Purpose.** Modal three-column tech tree. Each node lists name, description,
cost, and unlock state.

**Lifecycle.** `toggle()` (no dedicated key in current code; reachable via
Trade Terminal / menu). Backdrop or close button dismisses.

**Elements**
- Backdrop (dismisses on click)
- Header — title `[ TECH TREE ]`, hint text, close button
- Three branch columns: **EXTRACTION**, **PROCESSING & CRAFT**, **EXPANSION**
  - Per column: branch title header
  - Per node: name, description, cost line (`X RP · Y CR`, `FREE`, or
    `UNLOCKED`), and a state token (unlocked / available / locked)
- Footer legend explaining the three node states

**Interactions**
- Click an **available** node — calls `techTree.unlock(nodeId)`, then re-renders.
- Locked or already-unlocked nodes: no click handler.
- `refresh()` re-reads unlock state on every change.

---

## DebugOverlay

**Purpose.** Developer panel for injecting state, advancing time, and adjusting
HUD scale. Always mounted, hidden by default.

**Lifecycle.** Toggled via `~` (backtick) or the `DEBUG` button in `UILayer` /
the system menu.

**Elements**
- Header — title + ephemeral status message line
- Action button grid
  - Credits — `+1000 CR`, `+10000 CR`
  - Research — `+100 RP`, `+1000 RP`
  - Unlocks — `Unlock All Tech`
  - Presets — `Fill All (×100)`, `Preset: Fresh`, `Reset All`
  - Time — `Advance 60s`, `Advance 5m`
- UI Scale section
  - Slider, range 0.6–1.6, step 0.05
  - Live value label (`1.00x`)
  - Quick-set buttons — `Reset` (1.0x), `0.8x`, `1.25x`
- Footer hint about `window.__voidyield__` API

**Interactions**
- Each action button calls the corresponding `voidyieldDebugAPI` method.
- Slider input → `UILayer.setUserScale()` in real time; persists to localStorage.
- Quick-set buttons set the slider to a fixed value.
- Status line flashes the result of an action for ~1.5 s.

---

## InteractionPrompt

**Purpose.** Small world-anchored prompt that appears next to an interactable
target (deposit, building, launchpad). Shows the action verb, target, and any
hold-to-progress fill.

**Lifecycle.** Auto-shown when `InteractionManager.current` has a target; auto-
hidden otherwise. Tracks the camera each frame.

**Elements**
- Row: `[E]` key badge + verb + target name
- Progress bar (background + fill)
- Down-arrow indicator pointing to the target

**Interactions**
- Read-only; the actual interaction is fired by the `[E]` key (or the
  `TouchInteractButton`).
- Verb / target update on `interaction:target`.
- Progress fill polls `interactionManager.current` each frame.

---

## TouchInteractButton

**Purpose.** Thumb-sized on-screen `[E]` button anchored to the bottom of the
screen. Mirrors the keyboard `[E]` key for touch devices.

**Lifecycle.** Auto-shown when an interaction target exists; auto-hidden
otherwise. Stays in lock-step with `InteractionPrompt`.

**Elements**
- Key badge — `E`
- Text row — verb (e.g. `MINE`, `OPEN`) + target name (e.g. `VORAX ORE`)

**Interactions**
- Tap / click — dispatches the `interact` action through `InputManager`
  (identical to pressing `[E]`).

---

## BuildPromptOverlay

**Purpose.** Hint shown when the player is near the build grid and the build
menu is closed.

**Lifecycle.** `update(playerNearGrid, menuOpen)` — visible iff near grid AND
menu closed.

**Elements**
- Single line of text: `Press N to open Build Menu`

**Interactions.** None.

---

## BuildMenuOverlay

**Purpose.** Catalog of buildable structures with their costs and footprints.
Also lists already-placed buildings with a Move action.

**Lifecycle.** `[N]` toggles. Selecting an action closes the menu.

**Elements**
- Header — `BUILD MENU`
- Resource readout — `IRON BAR: X    COPPER BAR: Y`
- **BUILDABLE** section — one row per structure (Drone Bay, Marketplace, Road,
  Electrolysis Unit, Launchpad)
  - Building name + footprint (e.g. `Drone Bay [2×2]`)
  - Cost line (e.g. `6 iron bars + 0 copper bars`, or `free (1 iron bar / tile placed)`)
  - `BUILD` button — or `ENTER ROAD MODE` for the Road entry
  - Affordability state (enabled / disabled)
- **PLACED BUILDINGS** section — one row per placed structure
  - Building name + footprint
  - `MOVE` button

**Interactions**
- `BUILD` button — calls `onBuildStart(buildingType)` if affordable; closes menu.
- Road `ENTER ROAD MODE` button — calls `onEnterRoadMode()`; closes menu.
- `MOVE` button — calls `onMoveStart(buildingId)`; closes menu.
- Disabled rows are non-interactive; affordability recomputes on every refresh.

---

## ProductionDashboard

**Purpose.** Production overview / bottleneck diagnostic.

**Lifecycle.** `[P]` toggles. Refreshed on demand via `refresh(depot, plants, fabricators)`.

**Elements**
- Header — title `[ PRODUCTION ]` + close hint
- Column header row — `RESOURCE | STOCK | +PROD | NET`
- Resource rows (one per tracked ore type)
  - Resource name
  - Current stock
  - Production rate (units/min) or `—`
  - Net delta (production − consumption), positive / negative / zero indicated
    distinctly; `[!]` flag if any contributing plant is stalled
- Empty state — `No production activity.`

**Interactions.** Read-only. Rows with all-zero stock/prod/cons are filtered out.

---

## FleetPanel

**Purpose.** Read-only roster of every drone in the fleet.

**Lifecycle.** `[T]` toggles. `update()` refreshes only when visible.

**Elements**
- Header — title `[ FLEET ]` + close hint
- Roster rows (one per drone)
  - Drone ID
  - Drone type (`MINING`, `HEAVY`, `LOGISTICS`, …)
  - State (truncated, e.g. `[IDLE]`, `[EXEC]`)
  - Current task (e.g. `MINE→(123,456)` or `---`)
- Footer summary — `Active: X/Y    Idle: Z`
- Empty state — `No drones in fleet.`

**Interactions.** Read-only.

---

## SurveyJournalPanel

**Purpose.** List of all surveyed deposit waypoints.

**Lifecycle.** `[J]` toggles. `Esc` also closes.

**Elements**
- Header — title `SURVEY JOURNAL` + close button
- Waypoint rows (one per `WaypointData`)
  - Ore name
  - Meta line — `concentration% · date · (x, y)`
  - Status badge — `SURVEYED`
  - `REMOVE` button
- Empty state — `No waypoints surveyed yet.`

**Interactions**
- `REMOVE` — calls `surveyService.removeWaypoint()`, then re-renders.

---

## SurveyOverlay

**Purpose.** HUD shown while the survey tool is active. Displays nearby
detections, scan stage, scan progress, and a result card.

**Lifecycle.** `show()` / `hide()` driven by `SurveyService` when `[Q]` toggles.
`[M]` marks a waypoint while open.

**Elements**
- Header — `[ SURVEY MODE ]` + key hints (`[Q] exit`, `[M] mark waypoint`)
- Detection list (deduped, highest concentration per ore type)
  - Per ore: color dot, ore name, concentration % (only after PASSIVE_SCAN)
  - Empty state — `— no signal —`
- Scan stage indicator
  - Stage label — `QUICK READ` / `PASSIVE SCAN` / `FULL SCAN` / `DEEP SCAN`
  - Circular / radial progress bar
  - Numeric percentage (`0%`–`100%`)
- Result card (visible only after `FULL_SCAN` or `DEEP_SCAN`)
  - Ore symbol + `DETECTED`
  - Concentration percentage
  - Grade (`A`–`F`)
  - Size class (e.g. `LARGE`)
  - DEEP_SCAN only — top 3 standout attributes with bar chart
  - Hint — `[M] Mark Waypoint`

**Interactions.** Read-only; all input is via `[Q]` and `[M]`.

---

## LogisticsOverlay

**Purpose.** Status board for all configured trade routes, with manual dispatch.

**Lifecycle.** `setVisible()` / `toggle()`. Conventionally opened from the Galaxy
Map context with `[L]`.

**Elements**
- Header — `[ LOGISTICS — N routes ]` (live count) + close hint
- Column headers — `ROUTE | STATUS | TRIPS | ETA / AUTO`
- Route rows (one per `TradeRoute`)
  - Route label — `SRC→DST CARGO×QTY`
  - Status — `IN_TRANSIT` / `IDLE` / `STALLED`
  - Trip counter
  - ETA / auto column — `Xm Ys` while in transit, `[AUTO]` if an auto-dispatch
    threshold is set, `—` otherwise
  - Progress bar — visible only while `IN_TRANSIT`
  - `DISPATCH` button — visible only when `IDLE` or `STALLED`
- Empty state — `No routes configured.`

**Interactions**
- `DISPATCH` — calls the registered `onDispatch(routeId)` handler.

---

## DepositPanel

**Purpose.** Per-deposit interaction panel. Two distinct states depending on
whether a drone is currently assigned.

**Lifecycle.** Opened via `[E]` on a deposit. `[E]`, `Esc`, or `CLOSE` button
dismisses. Internal poll (~333 ms) keeps the stock bar live.

**Elements — common**
- Header
  - Ore symbol + ore label
  - Status badge — `UNMINED` / `MINING` / `DEPLETED`
- Stock section
  - "Remaining" label
  - Horizontal fill bar
  - Quantity readout

**Elements — State A (no drone assigned)**
- Road access line — `✓ Connected` or `✗ No road`
- Drone miner line — `None assigned`
- Hand-mine yield line — e.g. `3–5 ore / swing`
- Swing interval line — e.g. `0.8 sec (hold E)`
- `⛏ HAND MINE (hold E)` button (disabled if depleted)
- `CLOSE` button
- Two helper notes (output destination + drone tip)

**Elements — State B (drone assigned)**
- Drone row — drone name + drone state (e.g. `▶ MINING`)
- Output rate line — e.g. `4.8 ore/min`
- `RECALL DRONE` button
- `CLOSE` button

**Interactions**
- `HAND MINE` — calls `onHandMine()` callback (fires while `[E]` is held).
- `RECALL DRONE` — calls `onRecall()` callback.
- `CLOSE` — calls `onClose()` callback and closes.
- `updateStock(remaining)` — pushed updates outside of the poll cadence.

---

## DroneBayPanel

**Purpose.** Per-Drone-Bay panel. Bridges a single bay's slot count and upgrade
to the unified Drone Management UI.

**Lifecycle.** Opened via `[E]` on a `DroneBay`. `[E]` / `Esc` / close button
dismisses.

**Elements**
- Header — `DRONE BAY` + close button
- Credits chip — `CR` + value
- Slot status — `Slots: X/Y`
- `UPGRADE SLOT` button — shows the cost in CR; disabled if unaffordable
- `OPEN DRONE MANAGEMENT` button (primary)
- Footer hint — `[E] or [ESC] to close`

**Interactions**
- `UPGRADE SLOT` — calls `bay.upgradeSlot()`; re-renders on success.
- `OPEN DRONE MANAGEMENT` — closes this panel and runs the `setOpenManagementCallback` callback (opens `DroneManagementPanel`).
- Slot/upgrade rows update reactively on `drone:bay_cap_changed`.

---

## DroneDepotOverlay

**Purpose.** Same role as `DroneBayPanel`, but for the `DroneDepot` building.

**Lifecycle.** Opened via `[E]` on a `DroneDepot`.

**Elements**
- Header — `DRONE DEPOT` + close button
- Slot display — `Slots: X/Y`
- `UPGRADE SLOT` button — `X CR`, disabled if unaffordable
- `OPEN DRONE MANAGEMENT` button (primary)
- `CLOSE` button

**Interactions**
- `UPGRADE SLOT` — calls `depot.upgradeSlot()`; re-renders.
- `OPEN DRONE MANAGEMENT` — closes panel and invokes the registered handler.
- `CLOSE` — closes the panel.
- Slot info updates on `drone:bay_cap_changed`.

---

## DroneManagementPanel

**Purpose.** Unified, fleet-wide drone management. Three sections: ore
allocation for miners, full roster with destroy actions, and drone purchase.

**Lifecycle.** `open()` / `close()` / `toggle()`. Reachable from Touch Menu,
`DroneBayPanel`, `DroneDepotOverlay`. `Esc` dismisses.

**Elements — header**
- Title `DRONE MANAGEMENT` + close button
- Status line — `CR X · Slots: Y/Z`

**Elements — ALLOCATION section**
- Header — `ALLOCATION`
- Empty state — `No mining drones owned.`
- Otherwise:
  - `MINING DRONES (N)` label
  - Unallocated row — read-only count
  - One row per ore type (VORAX, KRYSITE, GAS, …)
    - Ore label
    - Allocated count
    - `−` button
    - `+` button
    - Buttons enabled/disabled based on available unallocated drones

**Elements — DRONE ROSTER section**
- Header — `DRONE ROSTER`
- Empty state — `No drones owned.`
- One row per drone:
  - Drone name (e.g. `MINING DRONE #1`)
  - Status badge — `OFF` / `IDLE` / `RETURNING` / `HAULING` / `MINING` /
    `MOVING` / `WORKING`
  - Allocation token — e.g. `→ VORAX` (miner) or `→ Active` (logistics)
  - `DESTROY` button (with confirmation step)

**Elements — BUY DRONE section**
- Header — `BUY DRONE (X slots free)`
- Empty state — `No empty slots. Upgrade a bay or destroy a drone.`
- Otherwise, one row per drone spec:
  - Drone name (`MINING DRONE`, `HEAVY MINER`, `LOGISTICS DRONE`)
  - Sublabel (drone class)
  - Cost in CR
  - `BUY` button — disabled if unaffordable

**Interactions**
- `−` / `+` allocation — calls `droneAllocationManager.allocateMiner()`.
- `DESTROY` — confirmation, then `droneBayRegistry.destroyDrone()`.
- `BUY` — calls `slot.bay.purchaseIntoSlot(type)`.
- Re-render is throttled (~0.25 s) and skipped during pointer interaction to
  avoid eating clicks.
- Listens for `drone:allocation_changed` and `fleet:roster_changed`.

---

## ElectrolysisOverlay

**Purpose.** Electrolysis Unit control panel showing recipe, input/output
buffers, and cycle progress.

**Lifecycle.** Opened via `[E]` on an `ElectrolysisUnit`. Refreshes every ~500 ms
while open. `[E]` / `Esc` dismisses.

**Elements**
- Header — `⚗ ELECTROLYSIS UNIT` + status badge (state dot + label):
  `▶ RUNNING` / `⚠ STALLED (OUTPUT FULL)` / `— IDLE`
- Recipe section
  - `RECIPE` label
  - Recipe line — `Water × INPUT → Hydrolox Fuel × OUTPUT (cycle: Xs)`
- Input buffer section
  - `INPUT BUFFER` label
  - Water row — label, fill bar, `qty / max`
  - Hint — `→ Logistics drone hauls water from Storage`
- Output buffer section
  - `OUTPUT BUFFER` label
  - Fuel row — label, fill bar, `qty / max`
  - Hint — `→ Logistics drone hauls fuel to Storage`
- Cycle progress section (visible only while `RUNNING`)
  - Progress bar
  - Time remaining — `Xs remaining`
- Conditional message — idle hint or stalled warning
- Close button

**Interactions.** Read-only.

---

## FabricatorPanel

**Purpose.** Fabricator recipe selector.

**Lifecycle.** Opened via `[E]` on a `Fabricator`. `[E]` / `Esc` dismisses.

**Elements**
- Header — `FABRICATOR` + close button
- Status section — label `STATUS` + state value (`RUNNING`, `STALLED (INPUT A)`,
  `STALLED (INPUT B)`, `NO POWER`, `IDLE`)
- Active recipe section
  - `ACTIVE RECIPE` label
  - Recipe name
  - Flow line — `InputA qty A → Output qty B · X/hr · Y pwr`
- Recipe list (one row per `FabricatorSchematic`)
  - Recipe name
  - I/O breakdown (e.g. `2 Steel Bars + 1 Alloy Rod → 1 Crystal Lattice`)
  - Batch rate + power draw
  - `BUILD` button — or `ACTIVE` (disabled) on the currently selected recipe
- Footer hint

**Interactions**
- `BUILD` — calls `fabricator.setSchematic()` and re-renders.
- `ACTIVE` — non-interactive marker.

---

## FurnaceOverlay

**Purpose.** Processing Plant control panel: recipe, throughput, quality
modeling, value multiplier, I/O buffers, and manual insert/extract.

**Lifecycle.** Opened via `[E]` on a `Furnace`. Polls every ~100 ms while open.
`[E]` / `Esc` dismisses.

**Elements**
- Header — `PROCESSING PLANT` + status badge (state dot + label, one of
  `RUNNING` / `STALLED` / `IDLE`)
- Recipe section
  - Active recipe line — e.g. `Active Recipe: Iron Ingot`
  - Recipe buttons — `IRON`, `COPPER`, `NONE` (one marked active)
  - Recipe I/O — `INPUT: X ore    OUTPUT: Y bar`
- Throughput section (visible if a recipe is active)
  - `THROUGHPUT` label
  - Batch time — `Xs`
  - Output rate — `+X bars/min`
  - Input rate — `−X ore/min`
- Quality influence section
  - `QUALITY INFLUENCE` label
  - Ore ER avg
  - Ingot quality
  - Efficiency bar — text-bar chart + percentage
- Value multiplier section (visible if recipe + sell prices known)
  - `VALUE MULTIPLIER` label
  - Raw ore price `X CR/unit`
  - Ingot price `Y CR/unit`
  - Multiplier line `×Z`
- I/O buffer line — `IN: X    OUT: Y`
- Action buttons
  - `INSERT ORE` — disabled when no recipe, no ore available, or already loaded
  - `EXTRACT` — visible/enabled only when output buffer > 0
- Cargo hint line (e.g. `Cargo: 10 Iron Ore` or `No iron ore available`)
- Footer hint — `[E] OPEN PLANT · [O] PRODUCTION`

**Interactions**
- Recipe buttons — call `furnace.setRecipe('iron' | 'copper' | 'off')`.
- `INSERT ORE` — calls the registered `onInsert()` (typically opens an ore
  picker).
- `EXTRACT` — calls `furnace.takeProducts()`.

---

## HabitationPanel

**Purpose.** Colony / habitation summary by tier.

**Lifecycle.** Opened via `[E]` on a `HabitationModule`. `[E]` / `Esc` dismisses.

**Elements**
- Header — `HABITATION` + close button
- Summary
  - `Housing: X / Y`
  - `Productivity: Z%`
- Tier list — one row per tier (`PIONEERS`, `COLONISTS`, `TECHNICIANS`,
  `ENGINEERS`, `DIRECTORS`)
  - Tier name
  - State (`active` / `none yet`)
  - Population count
- Footer hint

**Interactions.** Read-only. Refreshed on `population:changed` / `needs:changed`.

---

## ShipBayPanel

**Purpose.** Rocket assembly checklist plus fuel loading and launch trigger.

**Lifecycle.** Opened via `[E]` on a `Launchpad`. `[E]` / `Esc` dismisses.

**Elements**
- Header — `SHIP BAY` + close button
- Credits chip — `CR` + value
- Fuel gauge
  - Label — `ROCKET FUEL` + `X / 100 RF`
  - Horizontal fill bar
- Status line — `ASSEMBLY Z% · X/5 COMPONENTS` or `READY TO LAUNCH`
- Component list — five rows: `HULL`, `ENGINE`, `FUEL TANK`, `AVIONICS`,
  `LANDING GEAR`
  - Component name
  - Status — `installed` or cost in CR
  - Badge — installed (`OK`) or missing (`—`)
  - `BUY` button (only when not installed; disabled if unaffordable)
- Action buttons
  - `LOAD FUEL` — disabled when no fuel in depot or tank full
  - `LAUNCH` — disabled when not ready (shows `NOT READY` text)
- Footer hint

**Interactions**
- `BUY` — `_buyComponent()`: deducts CR, installs the component.
- `LOAD FUEL` — `_loadFuel()`: transfers fuel from depot to launchpad tank.
- `LAUNCH` — `_attemptLaunch()`: calls `Launchpad.launch()`; on success,
  triggers travel.
- Status line and disabled states recompute on every render. "Ready" requires
  all 5 components installed and ≥ 100 fuel.

---

## ShopPanel

**Purpose.** Multi-tab commerce terminal — drones (now redirected to Drone Bay),
TradeHub upgrades, marketplace, and a buildable preview list.

**Lifecycle.** `open()` / `close()`. `Esc` / `[E]` dismisses.

**Elements**
- Header — `SHOP TERMINAL` + close button
- Credits chip — `CR` + value (reactive)
- Tab buttons — `DRONES`, `UPGRADES`, `MARKET`, `BUILD` (one active)
- Body content (per tab):

  **DRONES tab**
  - Single message: `Drone purchases moved to the Drone Bay…`

  **UPGRADES tab**
  - Per TradeHub item:
    - Item name + description
    - `owned X` count
    - Cost in CR
    - `BUY 1` and `BUY 10` buttons (disabled if unaffordable)

  **MARKET tab**
  - Per marketplace listing:
    - Resource display name + buy/sell prices
    - Current depot stock
    - `BUY 1`, `BUY 10`, `SELL 1`, `SELL ALL` buttons (conditionally enabled)
    - `FREE` banner if `FREE_BUY_MODE` is active

  **BUILD tab**
  - Static placeholder rows: `SOLAR PANEL`, `PROCESSING PLANT`, `FABRICATOR`
    - Cost or `--` if locked
    - Buttons disabled (preview only)

- Footer hint — `[E] or [ESC] to close`

**Interactions**
- Tab buttons — `_switchTab(tab)`; re-renders body.
- Upgrades `BUY 1/10` — calls `tradeHub.buy(itemId, qty)`.
- Market `BUY 1/10` / `SELL 1/ALL` — calls `marketplaceService` accordingly.
- `marketplace:buy` / `marketplace:sell` events trigger re-render while the
  panel is visible.

---

## OfflineDispatchPanel

**Purpose.** "Welcome back" modal summarizing what the simulation did while the
player was offline.

**Lifecycle.** `show(result)` displays the panel from an
`OfflineSimulationResult`. `hide()` closes.

**Elements**
- Header — `◆ EMPIRE DISPATCH ◆`
- Duration line — `OFFLINE FOR Xh Ym — SIMULATION COMPLETE`
- Stats grid (4 stats)
  - `CREDITS GAINED: +X CR`
  - `ROUTES COMPLETED: Y`
  - `HARVESTERS STALLED: Z` (with `⚠` if non-zero)
  - `ORE COLLECTED: N types` or `NONE`
- `— RECENT ACTIVITY —` divider
- Event list — up to 8 lines, each `[Xm Ys] description`, styled per event type
- `VIEW DASHBOARD` button

**Interactions**
- `VIEW DASHBOARD` — calls `hide()` and emits `offline:dispatched`.

---

## SectorCompleteOverlay

**Purpose.** Celebration / summary modal when every deposit in a sector is
surveyed.

**Lifecycle.** `show()` on `sector:complete`. `hide()` closes.

**Elements**
- Title — `SURVEY COMPLETE`
- Subtitle — two lines (`ALL DEPOSITS CATALOGUED` / `SECTOR EXTRACTION AT MAXIMUM EFFICIENCY`)
- Stats grid
  - `SECTOR: #X`
  - `CREDITS REMAINING: X CR`
  - `RESEARCH POINTS: X RP`
  - `VOID CORES PRODUCED: X`
  - `TECH NODES UNLOCKED: X / 47`
- Active bonuses line (visible when present) — comma list of owned bonuses
- `INITIATE PRESTIGE` button

**Interactions**
- `INITIATE PRESTIGE` — calls `hide()` and emits `prestige:initiate`.

---

## PrestigePanel

**Purpose.** Bonus selection modal. Player picks one sector bonus to carry into
the next sector.

**Lifecycle.** `show()` on `prestige:initiate`. `hide()` closes.

**Elements**
- Title — `SELECT SECTOR BONUS`
- Subtitle — `Sector X complete. Choose your next sector bonus.`
- Bonus card grid — 10 cards (e.g. `VETERAN MINER`, `FLEET COMMANDER`, …)
  - Card name
  - Card description
  - `✓ OWNED` marker on owned cards
- `BACK` button

**Interactions**
- Click a bonus card — calls `sectorManager.applyPrestigeAndReset(bonus)`.
- `BACK` — re-emits `prestige:initiate` (returns to `SectorCompleteOverlay`).

---

## Key bindings → menus map

Per `src/services/InputManager.ts` and `docs/specs/16_input_map.md`.

| Key            | Action                                | UI surface(s)                                        |
| -------------- | ------------------------------------- | ---------------------------------------------------- |
| `W A S D` / arrows | Player movement                  | —                                                    |
| `E`            | Interact                              | `InteractionPrompt`, `TouchInteractButton`, all per-building panels |
| `Q`            | Survey tool toggle                    | `SurveyOverlay`                                      |
| `Z`            | Zone-paint tool                       | —                                                    |
| `R`            | Retool factory (recipe picker)        | `FabricatorPanel`, `FurnaceOverlay`                  |
| `T`            | Fleet panel / traffic overlay         | `FleetPanel`                                         |
| `F`            | Fleet dispatch shortcut               | —                                                    |
| `G`            | Galaxy map                            | `GalaxyMap`                                          |
| `L`            | Logistics overlay (with map open)     | `LogisticsOverlay`, `OfflineDispatchPanel` event log |
| `P`            | Production dashboard                  | `ProductionDashboard`                                |
| `O`            | Production overlay (building tints)   | —                                                    |
| `B`            | Coverage overlay (Drone Bay radius)   | —                                                    |
| `I`            | Inventory                             | —                                                    |
| `J`            | Survey journal                        | `SurveyJournalPanel`                                 |
| `M`            | Touch menu toggle                     | `TouchMenuOverlay`                                   |
| `N`            | Build menu                            | `BuildMenuOverlay`                                   |
| `Tab`          | Cycle / close panels                  | `UILayer.cyclePanels()`                              |
| `Esc`          | Pause / close open panel              | `UILayer.closeAllPanels()`                           |
| `F11`          | Fullscreen toggle                     | —                                                    |
| `~` (backtick) | Debug overlay                         | `DebugOverlay`                                       |

Notes:
- `TechTreePanel` has no dedicated key in current code; it is reached through
  the Trade Terminal flow / `TouchMenuOverlay`.
- `DroneManagementPanel` has no dedicated key; it is opened from
  `TouchMenuOverlay`, `DroneBayPanel`, or `DroneDepotOverlay`.
- `DepositPanel`, `DroneBayPanel`, `DroneDepotOverlay`, `ElectrolysisOverlay`,
  `FabricatorPanel`, `FurnaceOverlay`, `HabitationPanel`, `ShipBayPanel`, and
  `ShopPanel` all open via `[E]` on the corresponding world entity.
- `OfflineDispatchPanel`, `SectorCompleteOverlay`, and `PrestigePanel` open via
  game events (`offline:complete`, `sector:complete`, `prestige:initiate`),
  not user input.

---

## Cross-cutting behaviors

- **Master close.** `Esc` or `Tab` calls `UILayer.closeAllPanels()` /
  `cyclePanels()`, which dismisses every interaction panel.
- **Reactive state.** Most panels render through `@preact/signals-core` effects
  + `EventBus` events, not manual polling — except where noted (`DepositPanel`
  ~333 ms, `ElectrolysisOverlay` ~500 ms, `FurnaceOverlay` ~100 ms,
  `DroneManagementPanel` ~250 ms throttle).
- **Affordability gating.** Every `BUY` / `UPGRADE` / `LAUNCH` button has an
  enabled-only-when-affordable rule and a corresponding disabled visual state.
- **Empty states.** Every list panel has an explicit empty-state string
  (cataloged inline above) — these are part of the UX surface and need
  redesign treatment alongside populated states.
- **Touch parity.** `TouchMenuOverlay` + `TouchInteractButton` mirror the full
  keyboard surface; any new input added must also be reachable from the touch
  menu (per spec 16).
