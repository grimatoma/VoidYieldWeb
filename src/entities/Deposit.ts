import { Container, Graphics, Sprite, AnimatedSprite } from 'pixi.js';
import type { DepositData, QualityLot, OreType, SizeClass } from '@data/types';
import { assetManager, type AssetKey } from '@services/AssetManager';
import { makeAnimatedSprite, type SheetSpec } from '@services/SpriteSheetHelper';

const ORE_COLORS: Record<OreType, number> = {
  vorax: 0xFF8C42,
  krysite: 0x00B8D4,
  gas: 0xA8E063,
  steel_bars: 0xD4A843,
  steel_plates: 0xB0B8C4,
  compressed_gas: 0x90CAF9,
  water: 0x29B6F6,
  alloy_rods: 0xFFD700,
  rocket_fuel: 0xFF4400,
  shards: 0xE040FB,
  aethite: 0x40C4FF,
  void_cores: 0x7C4DFF,
  processed_rations: 0xFFEB3B,
  bio_resin: 0x66BB6A,
  processed_resin: 0x8BC34A,
  power_cells: 0xFFD54F,
  bio_circuit_boards: 0xFF7043,
  dark_gas: 0x263238,
  void_touched_ore: 0x9C27B0,
  resonance_shards: 0xE91E63,
  ferrovoid: 0x4E342E,
  warp_components: 0x00BCD4,
  crystal_lattice: 0x64B5F6,
  drill_head: 0xB0BEC5,
  hull: 0x90A4AE,
  engine: 0xFF5722,
  fuel_tank: 0x607D8B,
  avionics: 0x00ACC1,
  landing_gear: 0x795548,
  iron_ore: 0xB0BEC5,
  copper_ore: 0xE07B39,
  iron_bar: 0x78909C,
  copper_bar: 0xBF6030,
};

/** Legacy icon keys for ore inventory display (small icons, not deposit nodes). */
const ORE_ICON_KEYS: Partial<Record<OreType, AssetKey>> = {
  vorax: 'ore_vorax',
  krysite: 'ore_krysite',
  aethite: 'ore_aethite',
  shards: 'ore_shards',
};

/** Deposit node sheet specs: frameCount, frameWidth, frameHeight per sizeClass. */
const DEPOSIT_SPECS: Record<SizeClass, SheetSpec> = {
  small:  { frameCount: 6, frameWidth: 44, frameHeight: 36 },
  medium: { frameCount: 6, frameWidth: 64, frameHeight: 52 },
  large:  { frameCount: 6, frameWidth: 80, frameHeight: 64 },
};

/** Special deposit sheet specs (not size-classed). */
const SPECIAL_DEPOSIT_SPECS: Partial<Record<OreType, SheetSpec>> = {
  dark_gas:        { frameCount: 8, frameWidth: 56, frameHeight: 64 },
  resonance_shards:{ frameCount: 8, frameWidth: 64, frameHeight: 80 },
  bio_resin:       { frameCount: 8, frameWidth: 48, frameHeight: 56 },
};

/** Map ore type + size to deposit node animated sheet key. */
function depositSheetKey(oreType: OreType, sizeClass: SizeClass): AssetKey | null {
  switch (oreType) {
    case 'vorax':     return `deposit_vorax_${sizeClass}` as AssetKey;
    case 'krysite':   return `deposit_krysite_${sizeClass}` as AssetKey;
    case 'aethite':   return `deposit_aethite_${sizeClass}` as AssetKey;
    case 'void_cores':
    case 'void_touched_ore': return `deposit_voidstone_${sizeClass}` as AssetKey;
    case 'gas':       return sizeClass === 'large' ? 'deposit_gas_large' : 'deposit_gas_small';
    case 'dark_gas':   return 'deposit_dark_gas_geyser';
    case 'resonance_shards': return 'deposit_resonance_crystal';
    case 'bio_resin':  return 'deposit_bio_resin_flora';
    case 'iron_ore':   return `deposit_iron_ore_${sizeClass}` as AssetKey;
    case 'copper_ore': return `deposit_copper_ore_${sizeClass}` as AssetKey;
    case 'water':      return `deposit_water_${sizeClass}` as AssetKey;
    default:           return null;
  }
}

/** Deposit state — mirrors legacy ore_node.gd FULL / CRACKED / DEPLETED. */
export type DepositState = 'FULL' | 'CRACKED' | 'DEPLETED';

export class Deposit {
  readonly container: Container;
  readonly data: DepositData;
  private sprite: Sprite | AnimatedSprite | null = null;
  private fallback: Graphics | null = null;
  private _initialYield: number;
  private _holdProgress = 0; // 0..1 — live hold-to-mine progress, set by MiningService
  // Drone claim per GDD §11: only one drone targets a node at a time; others
  // skip it. Cleared when the drone releases it or the deposit is depleted.
  private _claimedBy: string | null = null;

  constructor(data: DepositData) {
    this.data = { ...data };
    this._initialYield = data.yieldRemaining;
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;
    this._buildVisual();
    this._applyState();
  }

  get x(): number { return this.data.x; }
  get y(): number { return this.data.y; }

  /** The yield at the time this deposit was created (before any mining). */
  get initialYield(): number { return this._initialYield; }

  get holdProgress(): number { return this._holdProgress; }
  set holdProgress(value: number) {
    this._holdProgress = value;
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = this.data.x - px;
    const dy = this.data.y - py;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string; progress?: number } | null {
    if (this.data.isExhausted) return null;
    return {
      verb: 'MINE',
      target: this.data.oreType.toUpperCase().replace(/_/g, ' '),
      progress: this.holdProgress,
    };
  }

  get state(): DepositState {
    if (this.data.isExhausted) return 'DEPLETED';
    if (this.data.yieldRemaining / Math.max(1, this._initialYield) <= 0.4) return 'CRACKED';
    return 'FULL';
  }

  mine(amount: number): QualityLot {
    const actual = Math.min(amount, this.data.yieldRemaining);
    this.data.yieldRemaining -= actual;
    if (this.data.yieldRemaining <= 0) {
      this.data.isExhausted = true;
      this._claimedBy = null; // auto-release on depletion
    }
    this._applyState();
    return { oreType: this.data.oreType, quantity: actual, attributes: this.data.qualityAttributes ?? {} };
  }

  get claimedBy(): string | null { return this._claimedBy; }

  /** Claim this deposit for `droneId`. Returns false if already held by someone
   * else (or exhausted). Re-claiming your own ID is a no-op success. */
  claim(droneId: string): boolean {
    if (this.data.isExhausted) return false;
    if (this._claimedBy !== null && this._claimedBy !== droneId) return false;
    this._claimedBy = droneId;
    return true;
  }

  /** Release the claim if held by `droneId`. Other drones can't release. */
  release(droneId: string): void {
    if (this._claimedBy === droneId) this._claimedBy = null;
  }

  private _buildVisual(): void {
    const sheetKey = depositSheetKey(this.data.oreType, this.data.sizeClass);
    const specialSpec = SPECIAL_DEPOSIT_SPECS[this.data.oreType];
    const spec = specialSpec ?? DEPOSIT_SPECS[this.data.sizeClass];

    if (sheetKey) {
      const anim = makeAnimatedSprite(sheetKey, spec, 0.07);
      if (anim) {
        anim.anchor.set(0.5);
        this.sprite = anim;
        this.container.addChild(anim);
        return;
      }
    }

    // Fallback: legacy icon or colour circle
    const iconKey = ORE_ICON_KEYS[this.data.oreType];
    if (iconKey && assetManager.has(iconKey)) {
      this.sprite = new Sprite(assetManager.texture(iconKey));
      this.sprite.anchor.set(0.5);
      this.sprite.width = 32;
      this.sprite.height = 32;
      this.container.addChild(this.sprite);
    } else {
      this.fallback = new Graphics();
      this.fallback.circle(0, 0, 12);
      this.fallback.fill(ORE_COLORS[this.data.oreType]);
      this.container.addChild(this.fallback);
    }
  }

  private _applyState(): void {
    // Tint mirrors legacy ore_node.gd: white (full), ~C8A078 (cracked), 555555 (depleted)
    let tint = 0xFFFFFF;
    let alpha = 1.0;
    switch (this.state) {
      case 'CRACKED': tint = 0xC8A078; break;
      case 'DEPLETED': tint = 0x555555; alpha = 0.55; break;
      default: tint = 0xFFFFFF;
    }
    if (this.sprite) {
      this.sprite.tint = tint;
      this.sprite.alpha = alpha;
    } else if (this.fallback) {
      this.fallback.clear();
      const color = this.data.isExhausted
        ? 0x555555
        : this.state === 'CRACKED'
          ? 0xC8A078
          : ORE_COLORS[this.data.oreType];
      this.fallback.circle(0, 0, 12);
      this.fallback.fill(color);
      this.fallback.alpha = alpha;
    }
  }

  serialize(): DepositData {
    return { ...this.data };
  }
}
