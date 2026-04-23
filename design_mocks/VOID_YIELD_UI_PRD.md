# VOID YIELD — UI Product Requirements Document

**Purpose:** Drive the creation of UI mocks (Figma / Aseprite / Photoshop). This document distills the GDD into screen-by-screen, component-by-component specs a designer can mock without reading the full GDD.

**Companion doc:** `VOID_YIELD_GDD.md` (source of truth for game design).
**Target fidelity of mocks:** Pixel-perfect at **960×540** logical resolution, rendered at 2× or 3× zoom for presentation.

---

## 1. Product Snapshot

- **Genre:** Top-down 2D active incremental / automation (space mining).
- **Platforms:** Browser (primary), Mobile touch (secondary), Desktop (stretch).
- **Input:** WASD + mouse + E to interact (desktop); virtual joystick + context button (mobile).
- **Viewport:** 960×540, 16:9, pixel-perfect, nearest-neighbor scaling.
- **Session length:** 30–90 min active play; idle-ish pacing.

---

## 2. Design Pillars (UI implications)

| Pillar | UI Implication |
|---|---|
| Salvagepunk / lived-in | Riveted metal panels, visible wear, flickering amber screens, no clean flat design. |
| Hand-crafted (NO AI aesthetic) | No Material Design. No rounded drop-shadow cards. No sterile minimalism. |
| Spatial over numerical | HUD is minimal; most "UI" is diegetic (terminals, depot fill, ship gantry). |
| Mobile-first touch parity | Every desktop interaction must have a tap/hold equivalent. |
| Feel over function | Every state change has juice: scale bounce, screen shake, number pop, particles. |

---

## 3. Visual System

### 3.1 Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `bg.console` | `#2a2a2e` | Panel backgrounds, HUD plates |
| `bg.deep` | `#1a1a1d` | Modal scrim, deepest recesses |
| `text.primary` | `#d4a843` | Amber readouts, primary labels |
| `text.secondary` | `#a88a4a` | Dimmed / disabled labels |
| `accent.warn` | `#8b3a2a` | Rust red — errors, storage full, can't afford |
| `accent.good` | `#7cb87c` | Pale green — gains, affordable, success |
| `accent.info` | `#5a8fa8` | Steel blue — info, cooldowns |
| `metal.rim` | `#4a4a50` | Panel borders / rivets highlight |
| `metal.shadow` | `#15151a` | Panel inner shadow / rivet shadow |

**Rules:** no pure `#ffffff`, no pure `#000000`. Every color should feel slightly dusty.

### 3.2 Typography

- **Primary:** `VoidYield Terminal` (bundled, 5×7 monospace pixel). All HUD, buttons, body text.
- **Fallback:** `Press Start 2P` (OFL).
- **Sizes:** 7px (smallest), 10px (body), 14px (headings), 20px (LED counters).
- **Never antialiased.** Never kern below native pixel grid.

### 3.3 Panel / Component Style

- **Panels:** 9-slice metal plates. Visible rivet dot at each corner (~2×2 px, `metal.rim` over `metal.shadow`).
- **Edges:** 1px highlight top/left, 1px shadow bottom/right. Optional 1px rust streaks (static, hand-drawn).
- **Buttons:** Physical console switches. Idle → depressed (1px down + 10% darken) on press. No hover glow on mobile.
- **Screens/readouts:** Dark background, amber glyphs, 1px inner bezel, faint scanline overlay (10% alpha horizontal lines), occasional flicker animation (60–90 frames between flickers).
- **Progress bars:** Segmented (not smooth gradient). 8–12 discrete cells that fill one at a time.
- **Icons:** 16×16 pixel art. Line weight 1px. Silhouette-first.

### 3.4 Motion

| Effect | Spec |
|---|---|
| Number pop | Counter scales 1.0 → 1.2 → 1.0 over 200ms on change |
| Floating number | Spawns at gain source, floats +16px over 500ms, fades last 200ms |
| Panel slide-in | 180ms ease-out from offscreen right |
| Panel slide-out | 120ms ease-in to offscreen right |
| Button press | 1px down offset, 50ms, no overshoot |
| Screen shake | 1–2px radius, 100ms on mining complete |
| Terminal flicker | 2-frame brightness dip, every 3–8 seconds randomly |

---

## 4. Information Architecture

```
[Boot / Splash]
   └─> [Main Menu]
          ├─> [New Game] ─> [Game (Asteroid 1)]
          ├─> [Continue] ─> [Game (last save)]
          ├─> [Settings]
          └─> [Credits]

[Game]
   ├─ HUD (always on)
   ├─ World-space prompts
   ├─ Interaction Panels (slide-in right)
   │    ├─ Shop Panel
   │    ├─ Upgrade Panel
   │    ├─ Sell Terminal Panel
   │    ├─ Storage Depot Panel
   │    ├─ Ship Bay Panel  (v0.2+)
   │    └─ Cargo Dock Panel (v0.4+)
   ├─ Pause / Settings Overlay
   └─ Galaxy Map Overlay (v0.3+)
```

---

## 5. Screens to Mock (priority order)

### P0 — v0.1 launch mocks
1. HUD (desktop + mobile)
2. Shop Panel
3. Sell Terminal Panel
4. Storage Depot Panel
5. World-space interaction prompt
6. Pause / Settings Overlay
7. Main Menu
8. Mobile controls overlay

### P1 — v0.2+ mocks
9. Ship Bay Panel (with 0/25/50/75/100% progression art)
10. Upgrade Panel (may merge with Shop)

### P2 — v0.3+ mocks
11. Galaxy Map
12. Cargo Dock / Route Configurator

---

## 6. Screen Specs

### 6.1 HUD (always-on)

**Layout (960×540):**

```
┌─ 8px margin ───────────────────────────────────── 8px margin ─┐
│ [ORE PLATE]                                    [CREDITS PLATE]│
│ [STORAGE BAR]                                          [⚙ btn]│
│                                                               │
│                      (GAME WORLD)                             │
│                                                               │
│                                                               │
│ [JOYSTICK]*                                    [ACTION BTN]*  │
└───────────────────────────────────────────────────────────────┘
*mobile only
```

**Ore Plate (top-left):**
- Size: 96×24 px plate, 2px rivet corners.
- Icon: 16×16 ore chunk at left.
- Label: `ORE` (7px amber).
- Value: LED-style 4-digit counter `0047` — leading zeros kept for "stamped counter" look.
- Below plate: Storage Bar, 96×8 px, segmented 12 cells, fills amber → turns rust red at 100%.

**Credits Plate (top-right):**
- Size: 112×24 px plate.
- Icon: 16×16 coin / credit chit.
- Label: `CR`.
- Value: 6-digit LED counter `000,230` with comma every 3 digits.

**Settings cog (top-right, below plate):**
- 20×20 button, gear icon, `bg.console` with 1px rim. Opens Pause Overlay.

**Mobile joystick (bottom-left):**
- Base: 72×72 circle, semi-transparent (60% alpha), `bg.console` with rivets.
- Thumb: 32×32 lighter disc.
- Deadzone indicator: 1px inner ring.

**Mobile action button (bottom-right):**
- 72×72 stamped button, dynamic icon: `pickaxe` / `$` / `cart` / `+`.
- Label text below icon: `MINE`, `SELL`, `BUY`, `DEPOSIT`.
- Disabled state: 40% alpha, rust-red rim.

**States to mock:**
- Default (empty inventory, 0 credits).
- Mid-game (inventory 7/10, storage 38/50, 230 CR).
- Storage full (bar rust red, pulsing).
- Mobile layout with action button in each context.

### 6.2 World-Space Interaction Prompt

Floats above nearest interactable, world-space (moves with camera).

- Size: auto-fit, ~48×14 px.
- Background: `bg.deep` at 80% alpha, 1px amber border, small bottom-pointing pip toward target.
- Text: `[E] MINE` — keycap glyph in a 10×10 outlined box, verb in amber.
- Mobile variant: omit `[E]`, show just verb; the action button below reflects same verb.

Verbs used: `MINE`, `SELL`, `DEPOSIT`, `BUY`, `BUILD`, `LAUNCH`, `CONFIGURE`.

### 6.3 Shop Panel (slide-in right)

**Trigger:** player interacts with Shop Terminal.
**Layout:** 320×540 panel anchored right edge. Semi-transparent dark scrim over world (30% alpha).

```
┌─ SHOP TERMINAL ─────────────── ✕ ─┐
│ CR: 000,230                       │
├───────────────────────────────────┤
│ [TAB: DRONES] [UPGRADES] [BUILD]  │
├───────────────────────────────────┤
│ ┌─ row ───────────────────────┐   │
│ │ [icon] SCOUT DRONE          │   │
│ │        60px/s · 3 ore · 3s  │   │
│ │        "Small, cheap, fast" │   │
│ │                    [25 CR]  │   │
│ └─────────────────────────────┘   │
│ ┌─ row (dimmed, unaffordable)┐    │
│ │ [icon] HEAVY DRONE          │   │
│ │        40px/s · 10 ore · 2s │   │
│ │                   [150 CR]  │   │
│ └─────────────────────────────┘   │
│ ...                               │
├───────────────────────────────────┤
│ [E] / tap row to buy              │
└───────────────────────────────────┘
```

**Row spec (96px tall):**
- Icon: 32×32 drone sprite, left, on a darker inset square.
- Title: 14px amber.
- Stats: 10px secondary amber, compact glyph-separated (`·`).
- Description: 10px, one-line flavor.
- Cost pill: right-aligned, `bg.deep` pill, amber number, `CR` suffix. Turns `accent.warn` if unaffordable.
- Affordable row: full-color, subtle hover/press depress.
- Unaffordable: 40% desaturated, cost pill rust red, still selectable to see tooltip "Need X more CR".
- Owned (e.g. buildings): replaced with `[INSTALLED]` green tag.

**Tabs:** DRONES / UPGRADES / BUILDINGS. Active tab has amber underline + brighter text.

**Close:** ✕ button top-right, Escape key, or walking ≥80px from terminal.

**States to mock:**
1. Early game — most items unaffordable and dimmed.
2. Mid game — mix of affordable / owned / unaffordable.
3. Hover/press on an affordable row.
4. Tooltip on unaffordable row.
5. Upgrades tab showing per-level pips (e.g. Drill Speed I/II/III with II filled).

### 6.4 Sell Terminal Panel

Small panel, 280×200 px, center-right.

```
┌─ SELL TERMINAL ───────── ✕ ─┐
│ POOL:    047 / 050          │
│ [████████████░]             │  segmented bar
│                             │
│ RATE:  1 CR / ORE           │
│ VALUE: 047 CR               │
│                             │
│ [  SELL ALL  ]              │  large amber stamped button
│                             │
│ AUTO-SELL: [ OFF ]          │  toggle (locked until unlocked)
└─────────────────────────────┘
```

**States:**
- Pool empty → `SELL ALL` disabled / grey.
- Pool full → bar pulsing rust red, button glows.
- Auto-Sell locked → toggle shows padlock + `LOCKED — 500 CR` hint.
- Auto-Sell enabled → toggle green, threshold slider visible (default 80%).

### 6.5 Storage Depot Panel

Minimal — most "UI" is the depot sprite itself (fills visibly in world).

```
┌─ STORAGE DEPOT ─────── ✕ ─┐
│ CAPACITY: 047 / 050        │
│ [████████████░]            │
│                            │
│ [ DEPOSIT CARRIED (07) ]   │
│                            │
│ Upgrades:                  │
│ └ Expansion I  +25   100CR │
└────────────────────────────┘
```

Deposit button disabled if player carrying 0. Visually emphasizes the depot's in-world sprite (3–4 fill stages: empty / ¼ / ½ / ¾ / full).

### 6.6 Ship Bay Panel (v0.2+)

```
┌─ SHIP BAY ──────── 25% ─── ✕ ─┐
│ [ large ship silhouette with  │
│   build-stage overlay ]       │
├───────────────────────────────┤
│ COMPONENTS                    │
│ ├ HULL PLATING   2 / 5   [CRAFT 50 ORE]
│ ├ ENGINE CORE    0 / 1   (rare drop)
│ ├ NAV MODULE     1 / 1  ✓ INSTALLED
│ └ FUEL CELL      —       (not required)
├───────────────────────────────┤
│ [ LAUNCH ]  (locked until 100%)│
└───────────────────────────────┘
```

**Mock 5 variants:** 0%, 25%, 50%, 75%, 100% ship silhouette states.

### 6.7 Galaxy Map (v0.3+)

Full-screen overlay, starfield background with parallax layers.

- Asteroids: 64×64 stylized top-down circular sprites, each with nickname label.
- Current asteroid: amber highlight ring + `YOU ARE HERE` tag.
- Available destinations: dashed amber line from current to destination.
- Active cargo routes: solid amber line with tiny animated drone sprite traveling along it.
- Locked asteroids: outline only, `???` label.
- Bottom bar: `[ TRAVEL ]` button (requires ship + fuel), `[ CLOSE ]`.

Mock two states: post-first-launch (A1 + A2 visible) and late game (A1–A3 with two active routes).

### 6.8 Cargo Dock / Route Configurator (v0.4+)

```
┌─ CARGO DOCK — ROUTES ──── ✕ ─┐
│ Active Routes:               │
│ ┌ A1 → A2  ORE  x50  /120s ▶│
│ └ A2 → A1  CRYSTAL x10 /180s▶│
│                              │
│ [ + NEW ROUTE ]              │
├──────────────────────────────┤
│ When editing:                │
│ FROM [A1▾]  TO [A2▾]         │
│ RESOURCE [ORE▾]              │
│ AMOUNT [--  050  ++]         │
│ INTERVAL [--  120s  ++]      │
│ [ SAVE ] [ CANCEL ] [ DELETE]│
└──────────────────────────────┘
```

### 6.9 Pause / Settings Overlay

Full-screen scrim (60% alpha `bg.deep`), centered 320×360 panel.

```
┌─ PAUSED ──────────────┐
│ [ RESUME ]            │
│ [ SETTINGS ]          │
│ [ SAVE & QUIT ]       │
│                       │
│ ── SETTINGS ──        │
│ SFX    [████░] 80%    │
│ MUSIC  [███░░] 60%    │
│ SHAKE  [ ON  ]        │
│ PIXEL SCALE [AUTO▾]   │
│ CONTROLS  [ REBIND ]  │
└───────────────────────┘
```

### 6.10 Main Menu

Full-screen. Background: parallax starfield + silhouetted miner sprite on foreground asteroid + slowly drifting drone sprite.

- Title logo: pixel logotype `VOID YIELD`, amber with 1px rust shadow, centered ~⅓ down.
- Buttons stacked vertically center: `NEW GAME`, `CONTINUE` (disabled if no save), `SETTINGS`, `CREDITS`, `QUIT` (hidden on web).
- Version string bottom-left: `v0.1 — PRE-ALPHA`.
- Bottom-right: social / itch.io link icons (if applicable).

---

## 7. Component Library (atomic pieces to mock once, reuse)

| Component | Variants |
|---|---|
| Rivet plate (9-slice) | small / medium / large; amber / red / green rim tint |
| Stamped button | idle / hover / pressed / disabled |
| Toggle switch | off / on / locked |
| Segmented bar | 8-cell / 12-cell / 16-cell; amber / red / green fill |
| LED counter | 2/4/6-digit; amber glyph set |
| Keycap glyph | `E`, `ESC`, `WASD`, `↑↓←→`, `SPACE`, `SHIFT` |
| Cost pill | affordable (amber) / unaffordable (red) / free (green) |
| Tab bar | 2 / 3 / 4 tabs |
| Slider | with ±tick marks |
| Dropdown | closed / open (max 5 rows visible) |
| Tooltip | pointer-down / pointer-up / pointer-left variants |
| Floating number | `+1`, `+5`, `+25 CR` variants |
| Interaction prompt | amber / red (blocked) / green (completed) |
| Mobile joystick | idle / engaged |
| Mobile action button | 6 verb states |

---

## 8. Iconography

Design set (16×16, 1px line):

- ore chunk, crystal shard, fuel crystal, rare metal, void stone, credit chit
- pickaxe, drill, drone (scout), drone (heavy), drone (hauler)
- storage crate, sell terminal, shop terminal, drone bay, ship bay, relay antenna, cargo dock
- settings cog, pause bars, close X, checkmark, padlock, alert, plus, minus, chevron

---

## 9. Accessibility & Input Parity

- Every mock must include a **mobile variant** where layout differs.
- Minimum tap target: **44×44 px logical** (scaled from design px).
- Color is never sole indicator — pair rust-red "warn" with icon, pair green "good" with ✓.
- Settings overlay must include: screen-shake toggle, SFX/music volume, colorblind-safe palette toggle (v0.7+ but design tokens should anticipate).
- Font is pixel font; provide fallback size slider (S / M / L) — mock the `M` default and `L` variant.

---

## 10. Copy & Tone

- Terse, utilitarian, slightly broken English on in-world signage ("SELL TERMNL", "DO NOT TUCH").
- UI labels stay clean and clear (`SELL ALL`, `DEPOSIT`, `LAUNCH`).
- Error states: short, diegetic ("STORAGE FULL", "INSUFFICIENT CR", "NO SIGNAL").
- No exclamation marks outside of alerts.
- No emojis anywhere.

---

## 11. Asset Deliverables (for mock phase)

For each P0 screen, deliver:

1. **Desktop** 960×540 static frame.
2. **Mobile** 960×540 with touch overlays (treat as same canvas — viewport is identical).
3. **State variants** where specified (empty / mid / full / locked / error).
4. **Interaction frames** where motion matters (panel mid-slide, button pressed, counter mid-pop).

Export at 1× (source) + 3× (presentation) PNG. Provide a Figma file with components.

---

## 12. Out of Scope for UI Mocks (v0.1)

- Prestige / meta-progression screen (v0.6+)
- Offline progress summary modal (v0.7+)
- Tutorial/onboarding overlays (later pass)
- Achievements / stats page
- Localization UI

---

## 13. Open Questions for Design Review

1. Does the Shop Panel merge the **Upgrades** tab, or are they separate terminals/panels?
2. Should the Storage Bar live in the HUD permanently, or only when a Depot is built?
3. Mobile: do we need an explicit **inventory open** button, or is the HUD ore counter enough?
4. Galaxy Map: diegetic (in-game console) or meta (UI overlay)? Current assumption: overlay.
5. How much in-world signage (diegetic labels, graffiti) versus HUD? Lean diegetic where possible.

Log answers back into the GDD and revision this PRD.

---

**Version:** 1.0
**Based on:** `VOID_YIELD_GDD.md` v0.2-revised
**Date:** 2026-04-14
