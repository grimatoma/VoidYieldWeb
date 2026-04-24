import { AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { assetManager, type AssetKey } from './AssetManager';

export interface SheetSpec {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

/** Slice a horizontal-strip spritesheet into an array of sub-textures. */
export function sliceSheet(key: AssetKey, spec: SheetSpec): Texture[] {
  const base = assetManager.texture(key);
  const frames: Texture[] = [];
  for (let i = 0; i < spec.frameCount; i++) {
    frames.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(i * spec.frameWidth, 0, spec.frameWidth, spec.frameHeight),
      }),
    );
  }
  return frames;
}

/**
 * Create a looping AnimatedSprite from a horizontal-strip spritesheet.
 * Returns null if the asset isn't loaded.
 */
export function makeAnimatedSprite(
  key: AssetKey,
  spec: SheetSpec,
  animationSpeed = 0.08,
): AnimatedSprite | null {
  if (!assetManager.has(key)) return null;
  const anim = new AnimatedSprite(sliceSheet(key, spec));
  anim.animationSpeed = animationSpeed;
  anim.play();
  return anim;
}

/**
 * Extract a single frame as a Texture (useful for TilingSprite which
 * can't animate — we just use the first frame).
 */
export function firstFrameTexture(key: AssetKey, spec: SheetSpec): Texture | null {
  if (!assetManager.has(key)) return null;
  const base = assetManager.texture(key);
  return new Texture({
    source: base.source,
    frame: new Rectangle(0, 0, spec.frameWidth, spec.frameHeight),
  });
}
