/**
 * Slices the player sprite sheet into per-direction animation frame banks.
 *
 * Sheet layout (448 x 192, nearest-neighbor):
 *   Rows map to facing direction: 0=SE, 1=SW, 2=NE, 3=NW
 *   Cols map to animation frames:
 *     0..3   idle (4-frame breathing loop)
 *     4..9   walk (6-frame step cycle)
 *     10..13 mine (4-frame pickaxe swing)
 *
 * Each frame is 32 x 48 pixels. The silhouette is anchored toward the feet
 * (y≈46 ground contact) so `anchor(0.5, 0.9)` matches the legacy feel.
 */
import { Rectangle, Texture } from 'pixi.js';
import { assetManager } from './AssetManager';
import type { PlayerFacing } from '@entities/Player';

export type PlayerAnimState = 'idle' | 'walk' | 'mine';

const FRAME_W = 32;
const FRAME_H = 48;

const ROW_BY_DIR: Record<PlayerFacing, number> = {
  se: 0,
  sw: 1,
  ne: 2,
  nw: 3,
};

const RANGE_BY_STATE: Record<PlayerAnimState, { start: number; count: number }> = {
  idle: { start: 0,  count: 4 },
  walk: { start: 4,  count: 6 },
  mine: { start: 10, count: 4 },
};

class PlayerSpriteSheetImpl {
  /** dir → state → frame textures */
  private _frames = new Map<PlayerFacing, Map<PlayerAnimState, Texture[]>>();
  private _loaded = false;

  /** Slice the source texture into cached frame textures. Idempotent. */
  ensureLoaded(): void {
    if (this._loaded) return;
    if (!assetManager.has('player_sheet')) return;
    const src = assetManager.texture('player_sheet');
    const sheetW = src.source.width;
    const sheetH = src.source.height;

    for (const [dir, row] of Object.entries(ROW_BY_DIR) as Array<[PlayerFacing, number]>) {
      const y = row * FRAME_H;
      if (y + FRAME_H > sheetH) continue;
      const perState = new Map<PlayerAnimState, Texture[]>();
      for (const state of ['idle', 'walk', 'mine'] as PlayerAnimState[]) {
        const { start, count } = RANGE_BY_STATE[state];
        const frames: Texture[] = [];
        for (let i = 0; i < count; i++) {
          const x = (start + i) * FRAME_W;
          if (x + FRAME_W > sheetW) break;
          const tex = new Texture({
            source: src.source,
            frame: new Rectangle(x, y, FRAME_W, FRAME_H),
          });
          tex.source.scaleMode = 'nearest';
          frames.push(tex);
        }
        perState.set(state, frames);
      }
      this._frames.set(dir, perState);
    }
    this._loaded = true;
  }

  get isLoaded(): boolean { return this._loaded; }

  /** Get the texture for a (direction, state, frameIdx). Wraps on frame count. */
  frame(dir: PlayerFacing, state: PlayerAnimState, frameIdx: number): Texture | null {
    this.ensureLoaded();
    const perState = this._frames.get(dir);
    if (!perState) return null;
    const frames = perState.get(state);
    if (!frames || frames.length === 0) return null;
    const idx = ((frameIdx % frames.length) + frames.length) % frames.length;
    return frames[idx];
  }

  /** Total frame count for a state (so callers can cycle safely). */
  frameCount(state: PlayerAnimState): number {
    return RANGE_BY_STATE[state].count;
  }
}

export const playerSpriteSheet = new PlayerSpriteSheetImpl();
