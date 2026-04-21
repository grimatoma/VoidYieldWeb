# Spec 26 — Web Visual Parity Migration

**Status:** Active — in progress 2026-04-20
**Owner:** Migration from legacy Godot build at `LEGACY_old_godot_version/VoidYield`

## Goal

Close the gap between the current web renderer (colored shapes over a flat background) and the legacy Godot build (sprite-based top-down world with interaction prompts and a resource rail HUD). Mechanics in specs 01–25 are unchanged; this spec is visual/UX parity only.

## Source of truth

Design mocks in `LEGACY_old_godot_version/VoidYield/design_mocks/`:

- `11_hud_desktop.svg` — HUD layout (resource rail TL, credits TR, storage TC, drones BL, outpost name header)
- `16_interaction_prompts.svg` — `[E] VERB TARGET` prompt pattern over nearest interactable
- `13_shop_panel.svg`, `14_sell_terminal.svg`, `15_storage_depot.svg` — building UI chrome

Legacy sprites in `LEGACY_old_godot_version/VoidYield/assets/sprites/` are already mirrored at web `assets/sprites/`; only the loader is missing.

## Gaps closed by this spec

| # | Gap | Fix |
|---|---|---|
| 1 | No sprite pipeline; entities draw `Graphics` shapes | `AssetManager` service wraps PixiJS `Assets.load`; all entities switch to `Sprite` |
| 2 | No interaction-prompt system | `InteractionManager` service + `InteractionPrompt` UI overlay renders `[E] VERB` over nearest target |
| 3 | Mining is instant; no hold-progress | `MiningService` gains `holdProgress` state; world-space progress bar rendered above player |
| 4 | HUD doesn't match mock 11 | `HUD.ts` rebuilt: resource rail (ORE/CRYSTAL/FUEL with pool+carried), outpost name header, credits chip |
| 5 | Ore nodes have only exhausted/normal states | `Deposit` tracks FULL → CRACKED → DEPLETED with tint modulation matching `ore_node.gd` |
| 6 | No ground tiles / outpost floor | `TileRenderer` service draws repeating `tile_outpost_floor.png` under buildings and `tile_space_bg.png` elsewhere |
| 7 | No visible debug overlay | `DebugOverlay` UI toggled by backtick (`` ` ``) exposes `__voidyield__` as clickable buttons |

## Asset pipeline

- Vite config sets `publicDir: 'assets'` so `assets/sprites/**` serves as `/sprites/**` at runtime (no bundler step, no copy).
- `AssetManager.load()` is called once from `main()` before any scene enters. It resolves `Assets.load([...])` and caches textures by key.
- Entities call `AssetManager.texture(key)` synchronously during construction. Keys are:
  - Player: `player_ne`, `player_nw`, `player_se`, `player_sw`
  - Buildings: `building_drone_bay`, `building_storage_depot`, `building_sell_terminal`, `building_shop_terminal`, `building_launch_pad`, `building_spaceship`
  - Ores: `ore_vorax`, `ore_krysite`, `ore_aethite`, `ore_voidstone`, `ore_shards`
  - Ground: `tile_outpost_floor`, `tile_outpost_edge`, `tile_space_bg`, `tile_asteroid`, `rock_small`, `rock_medium`, `rock_large`
  - Drones: `drone_miner` (spritesheet — not yet frame-sliced; first frame only for P1)

## Interaction prompt (spec 16 visuals)

`InteractionManager` singleton polls every frame: nearest `Deposit` within 40px, then nearest building with an `isNearby()` method within 40px. Emits `interaction:target` with `{ kind, ref, verb, label }` or `null`.

`InteractionPrompt` overlay is a DOM element anchored to world coords via a stage→screen projection helper on the camera. Renders:

```
┌─────────────────┐
│  [E] MINE VORAX │
│       ▼         │
└─────────────────┘
```

Hold-to-mine: while E is held and target is a deposit, `MiningService` accumulates `holdProgress` over 1.5s; on completion it deducts from the node and emits `ore:collected`. A thin amber bar below the prompt shows progress.

## HUD rebuild (mock 11)

Replace current `HUD.ts` content with:

- **Top-left stack**: `RESOURCE RAIL` — three rows (ORE/CRYSTAL/FUEL) showing carried inventory count, slash, pool (depot stock), plus an inline mini-bar. Each row uses the ore's palette color for its dot.
- **Top-center**: `STORAGE` bar (already present — keep).
- **Top-right**: `CR` chip (already present — keep; change format to `200 CR` from `200`).
- **Bottom-left**: `DRONES N` chip (already present — keep).
- **Header center**: `OUTPOST_ID · PLANET_NAME` text (new).

## Phasing

Land each as a separate commit:

1. **P1** — spec doc + asset pipeline + sprite swaps for Player, Deposit, StorageDepot, DroneBay, and the three terminal buildings. Buildings keep their label text.
2. **P2** — `InteractionManager` + prompt overlay + hold-to-mine progress bar.
3. **P3** — HUD rebuild per mock 11.
4. **P4** — ore node state tint, outpost floor tile, rock decoration scatter.
5. **P5** — on-screen debug overlay.

## Out of scope (for this spec)

- Player directional animation frames beyond the 4 static directions.
- Drone spritesheet frame slicing (miner_frames.tres metadata).
- Shop/sell/storage full panel redesigns beyond the basic interaction trigger.
- Sound effects.
