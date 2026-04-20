# Spec 00 — A2 Transit Asteroid

**Context:** A2 is a transit asteroid — not a colonizable planet. It serves as a mid-point waypoint for Cargo Ships on the long A1 ↔ Planet C route and as a required stop for unlocking A3 (Void Nexus). A2 has no Industrial Sites, no population, and no Drone Bay. It is a pitstop with a small secret and a simple gameplay unlock condition. This spec is numbered 00 because A2 is not a full planet system but a transitional object — read it alongside `09_planets.md` and `07_logistics.md`.

---

## Dependencies

- `09_planets.md` — A3 unlock condition requires "Visit A2 AND have produced 10 Void Cores"; A2 is part of the sector map
- `07_logistics.md` — Cargo Ships auto-refuel at A2 if their route passes through it; A2 Gas Depot is automated
- `10_spacecraft.md` — reaching A2 requires the Shuttle (player travel) or a Cargo Ship route passing through A2
- `08_vehicles.md` — Shuttle is required for the player to land on A2

---

## 1. A2 Identity

**Type:** Transit Asteroid (not a planet — cannot be colonized, no Industrial Sites, no population)

**Role in the game:**
1. **Mid-point waypoint** for Cargo Ships on the A1 ↔ Planet C route (the direct route is the longest in the system). Ships that pass through A2 auto-refuel there, reducing the total fuel cost per trip.
2. **A3 unlock condition** — The player must physically visit A2 (land there and trigger the "A2 Visited" flag) as one of the two conditions for unlocking A3 Void Nexus. The other condition is producing 10 Void Cores.
3. **Small secret** — A2 contains a hidden cache and a bonus resource sample, rewarding players who explore.

---

## 2. Surface Layout

**Map dimensions:** ~600 × 400 px (small — intended as a brief visit, not extended operations)

**Terrain:** Flat, barren rock. No obstacles, no hazards, no enemies. Simple open surface — the contrast with Planet C's shattered terrain is intentional.

### Key Features

**Gas Depot (automated):**
- 1 pre-built Gas Depot structure at A2 (cannot be removed, player-built structures cannot be added)
- Automatically refuels any Cargo Ship that lands here as part of a route passing through A2
- No player management required — the Gas Depot is self-sustaining (small wind-powered gas generator produces enough fuel for passing ships)
- Capacity: holds up to 200 Rocket Fuel at any time; regenerates at 5 RF/hr
- Ships passing through A2 refuel to the extent possible before continuing (partial refuel if depot is low)

**Surface Ore Deposits (hand-harvest only):**
- 2 surface ore deposits at fixed locations:
  - Krysite vein (Grade B OQ: 620–720, guaranteed): 80–120 Krysite units total, respawns every 60 minutes
  - Vorax cluster (Grade B OQ: 600–680): 50–80 Vorax units, respawns every 45 minutes
- **No harvesters can be placed on A2** — no Deposit Slots, no Industrial Sites. Hand-harvest only using [E].
- These deposits are a small bonus for players who physically visit, not a production resource.

**Secret Cache (one-time discovery):**
- Located in a small alcove in the asteroid's rock formation (visible once player approaches within ~80px)
- Contents: 500 CR + 1× Grade A Krysite sample (OQ 820, FL 750 — not a deposit, a single quality lot of 15 units)
- Trigger: player interacts with the cache [E]. One-time per sector (cache does not respawn on prestige).
- HUD notification on discovery: "CACHE FOUND — 500 CR and a remarkable Krysite sample. This formation predates any known survey."

---

## 3. Gameplay Role

### A3 Unlock Condition

Landing on A2 triggers the `a2_visited` flag in GameState. This flag, combined with 10 Void Cores produced (tracked separately), unlocks A3 on the Galaxy Map. The player must physically travel to A2 using the Shuttle — Cargo Ships passing through A2 do NOT set the `a2_visited` flag (the player must actually land).

**Galaxy Map state before A2 visit:** A3 appears as a locked icon with the text "SURVEY REQUIRED — Visit A2 to triangulate coordinates."

**Galaxy Map state after A2 visit + 10 Void Cores:** A3 "scans in" from static noise — a brief visual unlock animation (expanding radar sweep) before A3's icon resolves to normal.

### Cargo Ship Routing

Any Trade Route defined as A1 → Planet C (or Planet C → A1) can optionally route through A2. When the A2 waypoint is enabled on a route:
- Ships make an intermediate stop at A2
- They auto-refuel at the Gas Depot (partially or fully, depending on depot capacity)
- Total trip time A1 → A2 → Planet C is approximately 5 minutes (vs. 8–10 minutes direct) — the route is faster even with the A2 stop because ships carry less fuel and fly a more direct path per leg
- The Gas Depot refueling means ships consume fewer Rocket Fuel reserves from planet storage per round trip

**Routing A2 through the Logistics Panel:** Route editor gains a "ROUTE VIA A2" checkbox when source or destination is A1 or Planet C. Enabling it adds A2 as a waypoint and shows the estimated fuel savings per trip.

### Player Visit (Shuttle Required)

Planet C has High Radiation Interference — the player cannot land directly from orbit with the Shuttle, but A2 has no radiation hazard. The player lands via Shuttle normally.

**Visit sequence:**
1. Player opens Galaxy Map while on A1 (or Planet B with a Shuttle)
2. A2 appears on the map (unlocked once the Shuttle is built, Phase 3+)
3. Player selects A2 as destination — Shuttle auto-calculates fuel (25 RF for A1 → A2 round trip)
4. Brief travel animation (shorter than Planet B trip)
5. Player lands on A2 — `a2_visited` flag set immediately on landing
6. Player can explore (~30-90 seconds of content), hand-harvest the ore nodes, find the cache
7. Player re-launches with [E] at the Shuttle landing site — returns to A1 (or selects another destination)

---

## 4. A2 Has No:

- Industrial Sites (none)
- Population / Habitation Modules
- Drone Bay or operating drones
- Hostile environment (no radiation, no hazards)
- Persistent structures (only the pre-built Gas Depot)
- Building placement of any kind

A2 is deliberately minimal — a palate cleanser between the complex operations of A1/Planet B and the endgame intensity of Planet C and A3.

---

## 5. Galaxy Map Representation

| State | Galaxy Map Appearance |
|---|---|
| Before Phase 3 (no Shuttle) | A2 not visible — icon appears once Shuttle is built |
| Phase 3+ (Shuttle built, A2 not visited) | Locked icon: dim asteroid silhouette + "SURVEY REQUIRED" text |
| After A2 visited | Unlocked icon: grey asteroid symbol, tooltip shows "TRANSIT ASTEROID — Gas Depot operational" |
| Route via A2 active | Animated dashed line shows A1 → A2 → Planet C route with ships stopping at A2 mid-journey |

---

## Implementation Notes

### Godot Node / Scene Structure

```
scenes/world/
  planet_a2.tscn            # Small asteroid scene: flat terrain, Gas Depot, 2 ore nodes, secret cache
scripts/world/
  a2_gas_depot.gd           # Self-sustaining automated refueling; cargo ship refuel logic
  a2_cache.gd               # One-time cache discovery; credits + quality lot delivery
autoloads/
  game_state.gd             # Extend: a2_visited: bool, a2_cache_found: bool
```

### Key Signals

```gdscript
# game_state.gd (additions)
signal a2_visited_triggered()         # Emitted on first landing; triggers A3 unlock check
signal a3_unlock_conditions_met()     # a2_visited AND void_cores_produced >= 10

# a2_cache.gd
signal cache_discovered(credits: int, krysite_lot: Dictionary)
```

### A3 Unlock Check

```gdscript
# game_state.gd
func check_a3_unlock() -> void:
    if a2_visited and void_cores_produced_total >= 10 and not a3_unlocked:
        a3_unlocked = true
        emit_signal("a3_unlock_conditions_met")
        GalaxyMap.play_a3_discovery_animation()
```

Call `check_a3_unlock()` whenever `a2_visited` or `void_cores_produced_total` changes.

### Implementation Order

1. `planet_a2.tscn` — terrain, Gas Depot node, 2 OreNode positions, secret cache position
2. `a2_gas_depot.gd` — regenerating fuel store (5 RF/hr, cap 200); cargo ship refuel on arrival
3. Cargo Ship routing: add A2 waypoint option to Trade Route; update `logistics_manager.gd` to handle 3-point routes
4. A2 travel: extend Galaxy Map to show A2 icon post-Shuttle unlock; Shuttle destination logic
5. `a2_visited` flag in GameState; A3 unlock check; A3 discovery animation in Galaxy Map
6. `a2_cache.gd` — proximity trigger, one-time interaction, credits + lot delivery
7. Galaxy Map route animation for A2 waypoint routes (dashed mid-stop line)
