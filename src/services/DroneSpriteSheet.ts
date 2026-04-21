/**
 * Slices the legacy miner spritesheet into 8-directional walk animations.
 *
 * Layout (from miner_frames.tres):
 *   120x200 image, 20x20 frames
 *   rows map to 8 directions: N, NE, E, SE, S, SW, W, NW
 *   cols 0..3 = walk frames
 * We ask for 4 frames per direction; any unused rows return frame 0 copies.
 */
import { Rectangle, Texture } from 'pixi.js';
import { assetManager } from './AssetManager';

export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const FRAME_SIZE = 20;
const FRAMES_PER_DIR = 4;
const DIR_ROW: Record<Dir8, number> = {
  n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7,
};

class DroneSpriteSheetImpl {
  private _frames = new Map<Dir8, Texture[]>();
  private _loaded = false;

  /** Build the sliced frame cache. Idempotent and cheap — just slices existing Texture. */
  ensureLoaded(): void {
    if (this._loaded) return;
    if (!assetManager.has('drone_miner')) return;
    const src = assetManager.texture('drone_miner');
    const sheetW = src.source.width;
    const sheetH = src.source.height;

    for (const [dir, row] of Object.entries(DIR_ROW) as Array<[Dir8, number]>) {
      const frames: Texture[] = [];
      const y = row * FRAME_SIZE;
      // Some sheets have fewer rows than 8 dirs; fall back to first row.
      const effY = y + FRAME_SIZE <= sheetH ? y : 0;
      for (let i = 0; i < FRAMES_PER_DIR; i++) {
        const x = i * FRAME_SIZE;
        if (x + FRAME_SIZE > sheetW) break;
        const frame = new Texture({
          source: src.source,
          frame: new Rectangle(x, effY, FRAME_SIZE, FRAME_SIZE),
        });
        frame.source.scaleMode = 'nearest';
        frames.push(frame);
      }
      if (frames.length > 0) this._frames.set(dir, frames);
    }
    this._loaded = true;
  }

  get isLoaded(): boolean { return this._loaded; }

  /** Texture for direction `dir` at animation frame index `frameIdx` (mod cycle). */
  frame(dir: Dir8, frameIdx: number): Texture | null {
    this.ensureLoaded();
    const frames = this._frames.get(dir);
    if (!frames || frames.length === 0) return null;
    return frames[frameIdx % frames.length];
  }
}

export const droneSpriteSheet = new DroneSpriteSheetImpl();

/** Compute 8-dir facing from a (dx, dy) velocity vector. */
export function dirFromVelocity(dx: number, dy: number): Dir8 {
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI); // 0 = east, 90 = north
  // 8 sectors, each 45deg, centered on compass points.
  if (angle >= -22.5 && angle < 22.5) return 'e';
  if (angle >= 22.5 && angle < 67.5) return 'ne';
  if (angle >= 67.5 && angle < 112.5) return 'n';
  if (angle >= 112.5 && angle < 157.5) return 'nw';
  if (angle >= -67.5 && angle < -22.5) return 'se';
  if (angle >= -112.5 && angle < -67.5) return 's';
  if (angle >= -157.5 && angle < -112.5) return 'sw';
  return 'w';
}
