import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DepositData, QualityLot, OreType, SizeClass } from '@data/types';

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
  hydrolox_fuel: 0x00E5FF,
};

/** Base icon radius per size class. */
const SIZE_RADIUS: Record<SizeClass, number> = {
  small: 14,
  medium: 20,
  large: 28,
};

// ── icon drawing helpers ─────────────────────────────────────────────────────

function drawIronOre(g: Graphics, r: number): void {
  const h = r * 0.78;
  // Main rock body: flat-topped hexagon
  g.poly([-r, 0, -r * 0.45, -h, r * 0.45, -h, r, 0, r * 0.45, h * 0.6, -r * 0.45, h * 0.6]);
  g.fill({ color: 0x7A8B9A });
  g.stroke({ width: 1.5, color: 0x334455 });
  // Facet lines — suggest split rock faces
  g.moveTo(-r * 0.45, -h); g.lineTo(0, 0);
  g.stroke({ width: 1, color: 0x445566 });
  g.moveTo(r * 0.45, -h); g.lineTo(0, 0);
  g.stroke({ width: 1, color: 0x556677 });
  // Top face highlight
  g.poly([-r * 0.45, -h, 0, -h * 1.32, r * 0.45, -h, 0, -h * 0.62]);
  g.fill({ color: 0xAABBCC });
  // Iron-oxide vein spots (rust red)
  g.circle(-r * 0.22, -r * 0.18, r * 0.13); g.fill(0x993322);
  g.circle(r * 0.18, r * 0.08, r * 0.10);  g.fill(0x883322);
  g.circle(r * 0.01, -r * 0.32, r * 0.08); g.fill(0x993322);
}

function drawCopperOre(g: Graphics, r: number): void {
  // Three rounded nodules — characteristic copper mineral cluster
  // Back-left nodule (darkest)
  g.circle(-r * 0.38, r * 0.12, r * 0.52);
  g.fill({ color: 0xAA5A20 }); g.stroke({ width: 1, color: 0x7A3010 });
  // Back-right nodule
  g.circle(r * 0.38, r * 0.15, r * 0.48);
  g.fill({ color: 0xBB6825 }); g.stroke({ width: 1, color: 0x7A3010 });
  // Front-centre nodule (largest, brightest)
  g.circle(0, -r * 0.18, r * 0.62);
  g.fill({ color: 0xD4783A }); g.stroke({ width: 1.5, color: 0x7A3010 });
  // Highlight gleam
  g.circle(-r * 0.14, -r * 0.44, r * 0.17); g.fill({ color: 0xE89850, alpha: 0.55 });
}

function drawWater(g: Graphics, r: number): void {
  // Oval pool
  g.ellipse(0, 0, r, r * 0.55);
  g.fill({ color: 0x1A7ABF }); g.stroke({ width: 1.5, color: 0x0A4A8F });
  // Inner lighter ring (depth shimmer)
  g.ellipse(0, -r * 0.06, r * 0.64, r * 0.34); g.fill({ color: 0x3AB0E0, alpha: 0.45 });
  // Two wave lines
  const w1 = -r * 0.07;
  g.moveTo(-r * 0.48, w1); g.lineTo(-r * 0.24, w1 - r * 0.09);
  g.lineTo(0, w1);          g.lineTo(r * 0.24, w1 + r * 0.09);
  g.lineTo(r * 0.48, w1);
  g.stroke({ width: 1, color: 0x80D8F8 });
  const w2 = r * 0.10;
  g.moveTo(-r * 0.32, w2); g.lineTo(-r * 0.16, w2 - r * 0.07);
  g.lineTo(r * 0.16, w2 + r * 0.07); g.lineTo(r * 0.32, w2);
  g.stroke({ width: 1, color: 0x80D8F8 });
}

function drawGenericMineral(g: Graphics, oreType: OreType, r: number): void {
  const color = ORE_COLORS[oreType] ?? 0x888888;
  // Central crystal + two satellites — readable cluster for any ore type
  g.circle(0, 0, r * 0.6);
  g.fill({ color }); g.stroke({ width: 1.5, color: 0x000000, alpha: 0.4 });
  g.circle(-r * 0.52, 0, r * 0.33);
  g.fill({ color }); g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
  g.circle(r * 0.48, -r * 0.14, r * 0.28);
  g.fill({ color }); g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
}

function drawDepositIcon(g: Graphics, oreType: OreType, r: number): void {
  switch (oreType) {
    case 'iron_ore':   drawIronOre(g, r);   break;
    case 'copper_ore': drawCopperOre(g, r); break;
    case 'water':      drawWater(g, r);     break;
    default:           drawGenericMineral(g, oreType, r);
  }
}

// ────────────────────────────────────────────────────────────────────────────

/** Deposit state — mirrors legacy ore_node.gd FULL / CRACKED / DEPLETED. */
export type DepositState = 'FULL' | 'CRACKED' | 'DEPLETED';

export class Deposit {
  readonly container: Container;
  readonly data: DepositData;
  private _icon: Graphics | null = null;
  private _label: Text | null = null;
  private _initialYield: number;
  private _holdProgress = 0;
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
      this._claimedBy = null;
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
    const r = SIZE_RADIUS[this.data.sizeClass];
    const g = new Graphics();
    drawDepositIcon(g, this.data.oreType, r);
    this._icon = g;
    this.container.addChild(g);

    const raw = this.data.oreType.replace(/_/g, ' ').toUpperCase();
    const label = new Text({
      text: raw,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 7,
        fill: 0xD4A843,
        align: 'center',
      }),
    });
    label.anchor.set(0.5, 0);
    label.y = r + 4;
    this._label = label;
    this.container.addChild(label);
  }

  private _applyState(): void {
    // Tint/alpha mirrors legacy ore_node.gd: white (full), warm-tan (cracked), dark (depleted)
    let tint = 0xFFFFFF;
    let alpha = 1.0;
    switch (this.state) {
      case 'CRACKED':  tint = 0xC8A078; break;
      case 'DEPLETED': tint = 0x555555; alpha = 0.55; break;
      default: break;
    }
    if (this._icon)  { this._icon.tint  = tint; this._icon.alpha  = alpha; }
    if (this._label) { this._label.alpha = alpha; }
  }

  serialize(): DepositData {
    return { ...this.data };
  }
}
