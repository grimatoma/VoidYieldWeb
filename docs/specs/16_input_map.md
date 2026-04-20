# Spec 16 — Input Map (Key Binding Reference)

**Context:** This is the **single source of truth** for all input assignments in VoidYield. No two bindings may share the same key. Every spec that assigns a key must reference this file rather than defining its own binding. This document lists every keyboard action, its key, what it does, and which spec originally defined it.

---

## Rule: No Key Conflicts

Before adding any new key binding to any spec file, check this document. If the key is already in use, the new binding must use a different key OR the conflict must be resolved here first (updating both this file and the affected specs). This file supersedes any conflicting key reference in individual spec files.

---

## 1. Player Movement

| Key | Action | Spec Reference |
|---|---|---|
| [W] / [↑] | Move player up | Core (existing) |
| [A] / [←] | Move player left | Core (existing) |
| [S] / [↓] | Move player down | Core (existing) |
| [D] / [→] | Move player right | Core (existing) |

---

## 2. Interaction

| Key | Action | Spec Reference |
|---|---|---|
| [E] | Interact with nearest interactable (harvester, building, deposit, launchpad component) | Core (existing) |
| Mouse Left | Interact / Select / Click UI | Core (existing) |
| Mouse Right | Context menu / Cancel / Deselect | Core (existing) |
| Mouse Scroll Up/Down | Camera zoom in / out | Core (existing) |
| Mouse Middle Drag | Camera pan | Core (existing) |

---

## 3. System Panels

| Key | Action | Panel Name | Spec Reference |
|---|---|---|---|
| [ESC] | Pause menu / close open panel | Pause Menu | 14_ui_systems §9 |
| [P] | Production Dashboard | Production Dashboard | 14_ui_systems §6 |
| [J] | Survey Journal / Deposit log | Survey Journal | 14_ui_systems §9 |
| [T] | Fleet / Drone Traffic Overlay | Fleet Command / Traffic Overlay | 04_drone_swarm §7, 14_ui_systems §3 |
| [G] | Galaxy Map | Galaxy Map | 09_planets §4, 14_ui_systems §9 |
| [L] | Offline Event Log / Logistics Overlay (when Galaxy Map is open) | Offline Event Log / Logistics Overlay | 07_logistics §8, 14_ui_systems §8 |
| [I] | Inventory / Stockpile panel | Inventory | 14_ui_systems §9 |
| [Tab] | Cycle through currently open panels | — | 14_ui_systems |
| [F11] | Toggle fullscreen | — | System |

---

## 4. World Overlays

| Key | Action | Spec Reference |
|---|---|---|
| [O] | Production Overlay (building status colors: green/yellow/red/grey) | 14_ui_systems §7 |
| [B] | Coverage Overlay (Drone Bay radius circles, color-coded by load) | 04_drone_swarm §5 |

> **Note on [O] / [B] assignment:** [O] was previously ambiguous between Coverage Overlay and Production Overlay. [O] is definitively assigned to Production Overlay (building status colors) and [B] is assigned to Coverage Overlay (Drone Bay radius). Both specs 04 and 14 have been updated accordingly.

---

## 5. Tools and Gameplay Actions

| Key | Action | Spec Reference |
|---|---|---|
| [Q] | Survey Tool active / toggle scan mode | 02_surveying |
| [Z] | Zone paint tool (draw drone management zones on minimap) | 04_drone_swarm §3 Tier 2 |
| [R] | Retool factory (opens recipe picker for the selected factory) | 05_factories |
| [F] | Fleet Dispatch shortcut (open Fleet Command panel / dispatch from Cargo Ship Bay) | 04_drone_swarm §6, 14_ui_systems §9 |

---

## 6. Galaxy / Logistics View

| Key | Action | Spec Reference |
|---|---|---|
| [G] | Open Galaxy Map (standalone) | 09_planets §4 |
| [L] | While Galaxy Map is open: toggle Logistics Overlay. While not on Galaxy Map: open Offline Event Log | 07_logistics §8, 14_ui_systems §8 |

---

## 7. Controller Bindings (Equivalent Mapping)

| Controller Input | Equivalent Keyboard Action |
|---|---|
| Left Stick | Player movement (WASD) |
| Right Stick | Camera pan (Mouse Middle Drag) |
| A (Xbox) / X (PS) | Interact [E] |
| B (Xbox) / O (PS) | Cancel / Back [ESC] |
| Y (Xbox) / △ (PS) | Open Inventory [I] |
| X (Xbox) / □ (PS) | Survey Tool [Q] |
| Start / Options | Pause Menu [ESC] |
| Left Trigger | Camera zoom out (Mouse Scroll Down) |
| Right Trigger | Camera zoom in (Mouse Scroll Up) |
| Left Bumper | Cycle panels left [Tab] |
| Right Bumper | Cycle panels right [Tab] |
| D-Pad Up | Production Dashboard [P] |
| D-Pad Down | Fleet/Traffic Overlay [T] |
| D-Pad Left | Survey Journal [J] |
| D-Pad Right | Galaxy Map [G] |

Controller bindings should be remappable in Settings → Controls.

---

## 8. Full Binding Summary (Quick Reference)

| Key | Action |
|---|---|
| WASD / Arrows | Player movement |
| E | Interact |
| Q | Survey Tool |
| Z | Zone paint tool |
| R | Retool factory |
| T | Fleet Panel / Traffic Overlay |
| F | Fleet Dispatch shortcut |
| G | Galaxy Map |
| L | Logistics Overlay (on map) / Offline Event Log |
| P | Production Dashboard |
| O | Production Overlay (building status colors) |
| B | Coverage Overlay (Drone Bay radius) |
| I | Inventory / Stockpile |
| J | Journal / Survey log |
| Tab | Cycle open panels |
| ESC | Pause / Close panel |
| F11 | Toggle fullscreen |
| Mouse Left | Interact / Select |
| Mouse Right | Context menu / Cancel |
| Mouse Scroll | Camera zoom |
| Mouse Middle drag | Camera pan |

---

## Implementation Notes

### Godot Input Map

All bindings are defined in Godot's Project Settings → Input Map. Action names follow snake_case convention:

```
player_move_up, player_move_down, player_move_left, player_move_right
interact
survey_tool_toggle
zone_paint
retool_factory
fleet_panel
fleet_dispatch
galaxy_map
logistics_overlay
production_dashboard
production_overlay
coverage_overlay
inventory
journal
cycle_panels
pause_menu
fullscreen_toggle
camera_zoom_in, camera_zoom_out
camera_pan
```

### Remapping

Key remapping is available in Settings → Controls. Any remapped binding must be validated against this file's uniqueness rule at runtime — if the player assigns a key already in use, show a conflict warning and do not apply the remap.

### Adding New Bindings

If a new spec introduces a new player action requiring a key:
1. Check this file for available keys
2. Add the binding to this file first
3. Reference this file from the new spec (`see 16_input_map.md`)
4. Add the action to Godot's Input Map
