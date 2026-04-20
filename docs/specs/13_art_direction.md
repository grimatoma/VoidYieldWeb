# Spec 13 — Art Direction

**Context:** VoidYield's visual direction is optimistic retro-futurism. The game is about building civilization in space — the art should feel like *arriving somewhere*, not like operating a machine in the dark. The reference aesthetic: warm 1960s–70s space program art meets the lived-in texture of early colony retrofuturism, with the crisp readability of modern automation game UIs. Think Oxygen Not Included's warmth meets Factorio's information density, on a deep navy canvas.

---

## Dependencies

- `14_ui_systems.md` — overlay mode visuals (Production Overlay, Traffic Overlay, Logistics Overlay) share art direction decisions
- `09_planets.md` — each planet has a distinct ambient tint and surface color identity

---

## 1. The Core Shift

The current game uses a harsh amber-on-black CRT palette (`#0A0A12` background, `#D4A845` amber). This design moves away from that toward something warmer, more inviting, and more alive.

**Old approach:** CRT amber, near-black background, harsh industrial contrast.
**New approach:** Deep navy backgrounds, warm oranges for habitation, readable teal and amber accents, resource type color-coding.

---

## 2. Color Palette

### Background Colors

| Element | Color | Hex |
|---|---|---|
| Deep space background | Rich navy (feels like sky, not void) | #0D1B3E |
| UI panel backgrounds | Dark navy, slightly lighter than space | #0F2347 |
| UI panel borders | Warm off-white, low opacity | rgba(220,200,180,0.3) |
| Text (primary) | Soft off-white | #E8E0D0 |
| Text (secondary) | Warm grey | #A09080 |

### Planet Surface Ambient Tints

| Planet | Ambient Tint | Description |
|---|---|---|
| A1 — Iron Rock | Cool grey-brown | Dusty asteroid field, no atmosphere |
| Planet B — Vortex Drift | Dim teal-purple | Dense atmosphere, alien light |
| Planet C — Shattered Ring | Deep violet | Void-radiation-soaked fractured terrain |

As the player builds up a world, the ambient warmth increases — a visual confirmation that civilization is taking hold. Colonized planets emit warm ambient light from the direction of the colony. Unexplored planets are cold blue-lit under starlight.

### Resource Type Colors

All resource icons and UI representations use consistent color coding:

| Resource | Color | Hex |
|---|---|---|
| Vorax Ore / Steel Bars / Steel Plates | Rust orange | #C4622A |
| Krysite / Alloy Rods | Silver-blue | #7BA8C8 |
| Shards / Crystal Lattice / Energy Cells | Electric teal | #2ECFCF |
| Aethite | Soft purple | #8A5BC4 |
| Voidstone / Void Cores | Deep violet with faint luminescence | #4B0082 (+ emission) |
| Bio-Resin / Processed Resin / flora | Living green | #4CAF50 |
| Gas (standard) | Pale yellow | #E8D870 |
| Dark Gas | Near-black with green shimmer | #1A2A1A (+ green shimmer) |
| Scrap Metal | Dull grey-green | #7A8A6A |

### Building Colors by Type

| Building Category | Color Identity |
|---|---|
| Habitation structures | Warm oranges and tans, lit windows with warm interior glow |
| Processing Plants | Industrial greys and blues, steam/exhaust particle effects |
| Fabricators | Bright teal energy conduits, rotating mechanical elements |
| Assembly Complexes | Large, imposing, amber-orange arc welder glow |

### UI Accent Colors

| Use | Color |
|---|---|
| Positive / surplus | Green: #4CAF50 |
| Warning / partial | Amber: #D4A845 |
| Critical / deficit | Red: #E53935 |
| Idle / inactive | Grey: #5A5A6A |
| Survey / scanning | Cyan: #00B8D4 |
| Drone traffic (scout/heavy) | Blue: #2196F3 |
| Drone traffic (refinery) | Green: #4CAF50 |
| Drone traffic (survey) | Cyan: #00B8D4 |
| Drone traffic (builder) | Yellow: #FFC107 |
| Drone traffic (cargo) | Purple: #9C27B0 |

### Quality Grade Colors

| Grade | Color | Visual |
|---|---|---|
| F | Grey | #808080 |
| D | Brown | #8B4513 |
| C | White | #FFFFFF |
| B | Blue | #2196F3 |
| A | Gold | #FFD700 |
| S | Purple/rainbow shimmer | #9C27B0 + animated shimmer |

---

## 3. Animation Systems

### Animated Crew Figures

Small settler/colonist sprites visibly walking between buildings, entering Habitation Modules, carrying goods. At low zoom they read as motion dots; at full zoom they're recognizable figures. This is PP2's most-praised visual element and VoidYield should have it from Phase 3 onward.

### Reactive Buildings

Every factory building shows visible activity when running:
- **Processing Plants:** Smoke vent particles, conveyor flicker, rhythmic mechanical motion
- **Fabricators:** Energy conduit pulse (teal glow cycling through conduits), rotating assembly arm
- **Assembly Complexes:** Arc welder flash (brief bright pulse every 3–5 seconds), component-on-track animation

Buildings that are stalled should look visibly *still* — no motion, dimmed lights, no particles. The difference between a running factory and a stalled one should be immediately readable without opening any panel.

### Drone Trails

Drones leave a brief light trail (0.3s fade) showing their movement path. Color matches drone type (see traffic overlay colors above). With a large swarm, the trails form a visible traffic pattern — arcs between harvesters and silos, delivery paths between factories. The swarm reads as *motion*, not as static dots.

### Ship Animations

**Cargo Ship docking sequence:**
- Approach vector animation
- Deceleration visible from a distance
- Landing strut deploy
- Loading crane animation while loading/unloading

**Departure:**
- Engine glow buildup (1–2 second pre-ignition pulse)
- Particle exhaust trail as the ship clears the pad

**Ships docked at Cargo Ship Bay:** Visually distinct from ships shown mid-transit on the Galaxy Map.

### Rocket Launch Sequence

See `10_spacecraft.md` for the full launch sequence description. Key visual notes:
- Camera pulls back to wide shot showing the full Launchpad and surrounding area
- Ignition: large particle burst (smoke + flame), strong screen shake (0.3s)
- Ascent: rocket rises with a visible trail, shrinks to a point, disappears
- Sound design: distant rumble builds → sharp crack → fading trail hiss

### Planet Ambient Lighting

The ambient light warmth of a planet increases as the player builds. Implementation: the scene's ambient light node lerps toward a warmer color as building count increases. At an empty planet: cold blue starlight (#304878). At a fully developed planet: warm colony glow (#8B5C2A at full buildout, directional from colony center).

---

## 4. Overlay Mode Visuals

When any overlay is active, the world dims slightly (background desaturation + brightness reduction to ~70%). Buildings glow in their status color. The effect should feel like a satellite thermal view — the same world, but with information made visible.

**Production Overlay ([O] key):**
- Buildings glow: green (full rate), yellow (partial, supply-constrained), red (stalled), grey (idle)
- Small stacked status icons above each building: fuel canister icon, hopper icon, wrench icon, exclamation
- Readable at maximum zoom-out

**Traffic Overlay ([T] key):**
- Colored motion lines per drone type (see colors above)
- At 50+ drones: lines form a complex network; turning on the overlay for the first time is a revelation moment

**Logistics Overlay ([L] key on Galaxy Map):**
- Route lines color-coded by status
- Animated ship icons mid-route
- See `07_logistics.md` for full LOGISTICS overlay spec

---

## 5. UI Panel Style

All UI panels follow a consistent design language:

- **Rounded corners:** 6px radius
- **Background:** #0F2347 (dark navy)
- **Border:** 1px rgba(220,200,180,0.3) (warm off-white, low opacity)
- **Panel header:** slightly lighter background (#162B55), bold text
- **Primary text:** #E8E0D0 (soft off-white)
- **Secondary text:** #A09080 (warm grey)
- **Positive values:** #4CAF50 green
- **Warning values:** #D4A845 amber
- **Critical values:** #E53935 red

This moves away from the current harsh amber-on-black CRT style toward warmer, more readable interfaces. Resource icons use their type color as a fill with a consistent chunky icon style (readable at small sizes, ~16×16px minimum).

---

## Implementation Notes

### Godot Implementation Approach

- Define all palette colors as `GlobalConstants.gd` color constants — never hardcode hex values in individual scene files
- Use a `theme.tres` Godot theme resource for all UI panels — set base colors, font, corner radius there
- Building animated states: use `AnimationPlayer` nodes per building with `running` and `stalled` animations; stalled animation is simply the running animation at speed 0
- Drone trails: use a `Trail2D` node or `Line2D` with a fade shader (alpha decay over 0.3s)
- Ambient lighting: a single `DirectionalLight2D` or modulate on the world scene's root; lerp its color based on `planet_manager.gd` building count signal

### Key Assets Needed

Each resource type needs: icon (16×16, 32×32), world particle (drop from mining), UI fill color.

Each building needs:
- `tscn` with `AnimationPlayer` (two animations: `running`, `stalled`)
- A particle effect child for each running state emission
- A `modulate` color that dims when stalled vs. normal

### Planet Surface Tilesets

Each planet needs a distinct tileset with its ambient tint baked in:
- A1: grey-brown tiles, no atmospheric haze
- Planet B: teal-purple tiles, faint atmospheric haze overlay layer, glowing Aethite crystal formations visible in the background
- Planet C: deep violet tiles, fractured terrain shapes, geyser vent visual markers

The first-impression moment on each planet should be memorable: Planet B's purple-cyan sky and glowing Aethite crystal outcroppings should be visible from the spawn point on first landing.
