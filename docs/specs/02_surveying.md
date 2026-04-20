# Spec 02 — Surveying System

**Context:** Surveying is the player's entry point into the deposit pipeline. Before any harvester can run, before any quality attribute can be known, the player must find deposits with the Survey Tool. The survey ritual — walk, slow down, hold still, mark — creates a deliberate exploration loop that is never fully automated. Late-game Survey Drones cover ground automatically but cannot replace the player's schematic-matching judgment.

Visual mockup: `design_mocks/01_survey_flow.svg` — five-step horizontal sequence showing traversal → signal rising → 6-second hold scan → marking → Survey Journal.
Visual mockup: `design_mocks/08_survey_quality_report.svg` — full UI panel for a Deep Scan result showing all 11 attributes with bar graphs.

---

## Dependencies

- `01_resource_quality.md` — deposit attributes, concentration distribution, ore type caps
- `03_harvesters.md` — harvester placement requires a survey waypoint within 20px
- `08_vehicles.md` — Vehicle Survey Mount enables Full Scans while driving at ≤50 px/sec

---

## 1. Survey Tool Tiers

The Survey Tool is an equippable item. The player equips it from inventory, which replaces the nearest-interactable prompt with a survey readout UI.

| Tier | Name | Cost | Range | Precision | Special |
|---|---|---|---|---|---|
| I | Field Scanner | Starting equipment | 30px radius | ±15% concentration | Shows ore type + rough concentration |
| II | Geological Scanner | 800 CR + 10 Alloy Rods | 60px radius | ±5% concentration | Shows grade + estimated yield size |
| III | Quantum Survey Array | 4,000 CR + 20 Crystal Lattices + 5 Void Cores | 120px radius | ±1% concentration | Full attribute readout (same as Research Lab) |

Tech tree unlocks: Tier II via node 3.S (Survey Tool Mk.II, 400 RP + 200 CR); Tier III via node 3.T (Survey Tool Mk.III, 1,500 RP + 500 CR).

---

## 2. The Survey Process

### Step 1: Equip
Player opens inventory, selects Survey Tool. HUD switches to Survey Mode: interaction prompt disappears, replaced by a proximity readout showing nearby deposit signals. HUD border changes color (subtle cyan pulse).

### Step 2: Walk the Area
As the player moves, the Survey Tool continuously samples. The readout shows:
- Ore types detected in range (e.g., "VORAX ● KRYSITE ●")
- Concentration % for nearest deposit of each type (e.g., "VORAX: 24%" → "VORAX: 31%" → "VORAX: 44%" as player moves toward a peak)
- Signal strength indicator (arrows pointing toward highest concentration)
- Audio tone rises in pitch as player approaches a concentration peak (like a Geiger counter). At the exact peak, a "PEAK FOUND" ding plays and the concentration readout locks.

### Step 3: Find the Peak
The player follows the signal toward the concentration peak — the point with the highest % value. At the peak, the readout stabilizes. With Tier I: player sees concentration (e.g., 67%) and ore type. With Tier II: also sees deposit grade (e.g., "Grade B") and size estimate (e.g., "LARGE DEPOSIT").

**Survey strategy guidance (in-game tip):** "Walk a grid pattern. Every 40 steps, check the concentration reading. When it rises, turn toward it."

### Step 4: Mark the Waypoint
Press [M] to place a survey marker at the current location. The marker is visible on the minimap and in-world as a floating icon. Markers can be labeled (text entry). The marker stores: ore type, concentration %, grade (if Tier II+), date surveyed.

**Visual feedback:** A mineral icon appears at the location in the world (visible from ~200px away). The minimap shows it immediately. A brief text pop: "DEPOSIT MARKED — [Ore Type] [Concentration]%".

### Step 5: Sample Analysis (optional)
The player can collect a physical sample at the deposit location: press [E] to take a sample. This gives a Sample Item in inventory. Bring the sample to a Research Lab and interact to begin analysis. Analysis takes 2 minutes (real time). Results: full 11-attribute profile of the deposit.

Without a Research Lab, or without a Tier III scanner, the full attribute breakdown is never revealed by surveying alone.

---

## 3. Scan Stages (Time-Based, Not Instant)

Surveying requires the player to **hold still** (or move very slowly) while the scan cycle completes. This creates the loop: "scout roughly → slow down at signal → hold for full scan → decide → move on."

| Stage | Duration | Reveals | Accuracy |
|---|---|---|---|
| Quick Read | Always active while equipped | Ore types present within range | None — no % or quality |
| Passive Scan | 2s hold still | Concentration % for detected ores | ±15% (Tier I) |
| Full Scan | 6s hold still | Deposit grade letter (F–S) + size category + lifetime range | Tier II+ also shows size/lifetime |
| Deep Scan | 15s hold still (Tier II+ only) | 3 highest attributes by name and approximate value | Tier III reveals all 11 precisely |

**Scan UI:** A circular reticle appears around the player when the tool is equipped. It pulses outward once per second (passive scan rate). When a full scan completes, the reticle flashes amber and the result card appears at screen-right.

**Why this creates a good loop:** Walking through the field feels like exploration — the quick read pings as you pass concentrations. When you get a strong signal, you stop. You hold for a full scan. If the grade is promising, you mark it and hold for a deep scan to plan your schematic use. The ritual feels deliberate.

---

## 4. The Survey Result Card

When a Full Scan (6s) completes, a result card appears in the upper-right HUD:

```
┌─────────────────────────────────────┐
│  ◆ KRYSITE VEIN DETECTED            │
│  Concentration: 71%                 │
│  Grade: B   Size: LARGE             │
│  Est. Lifetime: 6–9 hrs (standard)  │
│                                     │
│  [M] Mark Waypoint  [J] Add Journal │
└─────────────────────────────────────┘
```

After a Deep Scan (15s), the card expands:

```
┌─────────────────────────────────────┐
│  ◆ KRYSITE VEIN DETECTED            │
│  Concentration: 71% at this point   │
│  Grade: B   Size: LARGE             │
│  Est. Lifetime: 6–9 hrs             │
│                                     │
│  STANDOUT ATTRIBUTES:               │
│  CR (Crystal Resonance): ~740 ████░ │
│  PE (Potential Energy):  ~610 ███░░ │
│  CD (Charge Density):    ~290 ██░░░ │
│                                     │
│  [M] Mark Waypoint  [J] Add Journal │
└─────────────────────────────────────┘
```

The Research Lab full analysis (see `03_harvesters.md` § Research Lab, or `11_tech_tree.md`) adds the remaining 8 attributes and precise values.

---

## 5. The Survey Journal

The player maintains a **Survey Journal** — a persistent log of all surveyed deposits accessible from the HUD [J] key.

Each journal entry shows:
- Deposit type and survey date
- Waypoint coordinates
- Grade + size + lifetime estimate
- Standout attributes (from Deep Scan, if performed)
- Status: UNSURVEYED / SURVEYED / ANALYZED / HARVESTER PLACED / DEPLETED

**Journal strategy view:** A top-down minimap overlay shows all waymarked deposits as icons, color-coded by ore type, with grade letter overlaid. This is the player's "deposit management board." Before deciding which harvester to build, a skilled player reviews the journal: "I have a Grade A Krysite at 68% with CR 820 — that's my engine schematic deposit. I have a Grade B Vorax at 82% with MA 740 — that's where I put the Heavy Harvester for Steel Plates."

Tech tree node 3.U (Geological Memory, 800 RP + 400 CR): Survey markers persist between sessions; minimap shows deposit outlines.

---

## 6. Concentration and Spatial Distribution

Each planet has a semi-random distribution of concentration peaks. A deposit has a bell-curve distribution with a peak concentration at the center.

**Concentration falloff:** At the exact peak, concentration might be 78%. 30px away: ~55%. 60px away: ~28%.

The player must survey within 15px of the peak to get an accurate reading for Harvester placement. Placing a Harvester even slightly off-peak loses extraction efficiency — see `03_harvesters.md` for the placement efficiency indicator.

**Placing a Harvester:** The player must have previously surveyed the location (a survey marker must exist within 20px of the intended placement). The harvester placement indicator shows current efficiency: "87% efficiency — move closer to survey marker."

---

## 7. Survey Drone (Late-Game Automation)

After Research node 3.Q (Builder Drone Unlock, 300 RP), a **Survey Drone** becomes available:
- **Cost:** 150 CR + 5 Alloy Rods
- **Behavior:** When deployed, walks a programmed grid path, records all concentration peaks above a player-set threshold, drops survey markers automatically
- **Speed:** Slow (survey quality takes time)
- **Output:** Populated minimap with all deposit locations, types, and rough grades
- **Limitation:** Only reveals concentration and ore type — full attribute analysis still requires physical sample + Research Lab

Pair with Research Lab automation (drones carry samples via SAMPLE task) and the player can survey an entire planet's deposit map within one play session.

---

## 8. Planet B — Survey Differences

- Atmospheric interference reduces Survey Tool range by 40% (Speeder's Vehicle Survey Mount partially compensates — restores 20% of that reduction)
- Deposits are substantially deeper and longer-lived (30–80 hrs at medium BER vs A1's 6–20 hrs)
- Voidstone deposits near Planet B's cave systems: signal oscillates rather than climbing steadily — a deliberate "something is different here" cue. Requires Cave Drill at a cave entrance (see `03_harvesters.md`).

## 9. Planet C — Survey Differences

- Unstable terrain: deposits shift location over time. Survey markers go stale every 2–4 in-game hours. Resurveying is mandatory and ongoing.
- Geyser vents (Dark Gas): signal is a distinct low rhythmic pulse rather than the steady rising tone of a static deposit. Must use Full Scan or better to locate vents precisely.

---

## Implementation Notes

### Godot Node / Scene Structure

```
scenes/player/
  survey_tool.tscn       # Equippable item — added to Player inventory
scripts/survey/
  survey_tool.gd         # Equip/unequip logic; scan stage state machine; HUD overlay
  survey_result_card.gd  # UI component — result card shown after Full/Deep Scan
  survey_journal.gd      # Persistent log of all surveyed deposits
  survey_waypoint.gd     # World-space marker: position, ore_type, grade, status
scenes/world/
  survey_waypoint.tscn   # World-space icon + minimap dot
ui/
  survey_journal_panel.tscn  # [J] key panel — deposit list + strategy map overlay
```

### Key Signals

```gdscript
# survey_tool.gd
signal scan_stage_changed(stage: int)  # 0=quick, 1=passive, 2=full, 3=deep
signal peak_found(deposit_id: String, concentration: float)
signal waypoint_placed(deposit_id: String, position: Vector2)
signal sample_collected(deposit_id: String)  # triggers Sample item creation

# survey_journal.gd
signal journal_entry_updated(deposit_id: String, new_status: String)
```

### HUD Integration

Survey mode replaces the interaction prompt UI. Required HUD elements:
- Ore type proximity readout (live, updates per frame while equipped)
- Concentration % readout per ore type (animates as player moves)
- Circular scan reticle (visible around player, pulses at 1Hz passive rate)
- Result card panel (upper-right, appears on Full Scan completion)
- Journal button / [J] shortcut

Survey Mode HUD state is managed by `survey_tool.gd` toggling a visibility group on the HUD scene.

### Data File Location

No separate data file needed. Deposit data comes from `deposit_map.gd` autoload (see `01_resource_quality.md`). The Survey Tool reads deposit instances from `deposit_map.gd` based on proximity.

### Relevant Existing Scaffolding

- `scripts/player/Player.gd` — add equip/unequip Survey Tool; survey mode overlay on HUD
- `autoloads/game_state.gd` — store waypoints persistently across sessions (see node 3.U)
- `scripts/interactable.gd` — sample collection at deposit location uses held-interaction pattern

### Implementation Order

1. `survey_tool.gd`: equip/unequip logic, Quick Read (always-on ore type proximity ping)
2. Scan stage state machine: 0.5s → 2s → 6s → 15s hold timer, progressive reveal
3. HUD survey overlay: ore type slots, concentration % readout, scan reticle animation
4. Audio: concentration rising tone (pitch scales with concentration %), peak ding, scan complete SFX
5. `survey_waypoint.gd` and `survey_waypoint.tscn`: world-space marker + minimap dot
6. `survey_result_card.gd`: UI component rendered from scan data
7. `survey_journal.gd`: persistent log, status tracking (SURVEYED → ANALYZED → HARVESTER PLACED → DEPLETED)
8. Journal panel UI ([J] key) with minimap overlay and deposit status list
9. Sample collection ([E] at deposit peak) → Sample item in inventory
10. Wire Survey Drone (post-Priority 3 drone work): autonomous grid walking + auto-waypoint placement
