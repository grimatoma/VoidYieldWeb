import { Container, Graphics, AnimatedSprite, Text, TextStyle, Texture } from 'pixi.js';
import type { QualityLot, OreType } from '@data/types';
import { sliceSheet } from '@services/SpriteSheetHelper';
import { assetManager } from '@services/AssetManager';
import { SELL_PRICES } from '@services/MarketplaceService';

const SHEET_SPEC = { frameCount: 10, frameWidth: 64, frameHeight: 64 } as const;

// Frame indices matching the sprite sheet layout
const F_IDLE_A    = 0;
const F_IDLE_B    = 1;
const F_RECV_A    = 2;
const F_RECV_C    = 4;
const F_DISP_A    = 5;
const F_DISP_C    = 7;
const F_HALF      = 8;
const F_FULL      = 9;

const SPEED_IDLE   = 1 / 30;  // ~500ms per frame at 60fps
const SPEED_ACTION = 1 / 9;   // ~150ms per frame at 60fps

const CAPACITY_HALF = 250;
const CAPACITY_FULL = 500;

export class StorageDepot {
  readonly container: Container;
  readonly x: number;
  readonly y: number;

  private stockpile = new Map<OreType, number>();
  private label!: Text;
  private anim: AnimatedSprite | null = null;
  private allFrames: Texture[] = [];
  private busy = false;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    if (assetManager.has('sheet_storage_depot')) {
      this.allFrames = sliceSheet('sheet_storage_depot', SHEET_SPEC);
      this.anim = new AnimatedSprite(this.allFrames.slice(F_IDLE_A, F_IDLE_B + 1));
      this.anim.anchor.set(0.5);
      this.anim.animationSpeed = SPEED_IDLE;
      this.anim.loop = true;
      this.anim.play();
      this.container.addChild(this.anim);
    } else {
      const body = new Graphics();
      body.rect(-24, -24, 48, 48).fill(0x1A2A4A);
      body.rect(-24, -24, 48, 48).stroke({ width: 2, color: 0xD4A843 });
      this.container.addChild(body);
    }

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#D4A843' });
    this.label = new Text({ text: 'STORAGE', style });
    this.label.anchor.set(0.5);
    this.label.y = 40;
    this.container.addChild(this.label);
  }

  private playIdle(): void {
    if (!this.anim) return;
    const total = this.getTotal();
    let a = F_IDLE_A;
    let b = F_IDLE_B;
    if (total >= CAPACITY_FULL) { a = b = F_FULL; }
    else if (total >= CAPACITY_HALF) { a = b = F_HALF; }
    this.anim.textures = this.allFrames.slice(a, b + 1);
    this.anim.animationSpeed = SPEED_IDLE;
    this.anim.loop = true;
    this.anim.onComplete = undefined;
    this.anim.gotoAndPlay(0);
  }

  private playSequence(startIdx: number, endIdx: number): void {
    if (!this.anim || this.busy) return;
    this.busy = true;
    this.anim.textures = this.allFrames.slice(startIdx, endIdx + 1);
    this.anim.animationSpeed = SPEED_ACTION;
    this.anim.loop = false;
    this.anim.onComplete = () => {
      this.busy = false;
      this.playIdle();
    };
    this.anim.gotoAndPlay(0);
  }

  deposit(lots: QualityLot[]): void {
    for (const lot of lots) {
      const cur = this.stockpile.get(lot.oreType) ?? 0;
      this.stockpile.set(lot.oreType, cur + lot.quantity);
    }
    this.playSequence(F_RECV_A, F_RECV_C);
  }

  pull(oreType: OreType, qty: number): number {
    const current = this.stockpile.get(oreType) ?? 0;
    const removed = Math.min(current, qty);
    if (removed > 0) {
      this.stockpile.set(oreType, current - removed);
      this.playSequence(F_DISP_A, F_DISP_C);
    }
    return removed;
  }

  sellAll(): number {
    let earned = 0;
    for (const [type, qty] of this.stockpile.entries()) {
      earned += qty * SELL_PRICES[type];
    }
    this.stockpile.clear();
    this.playIdle();
    return earned;
  }

  getStockpile(): Map<OreType, number> { return this.stockpile; }

  getTotal(): number {
    let total = 0;
    for (const q of this.stockpile.values()) total += q;
    return total;
  }

  setStock(oreType: OreType, qty: number): void {
    if (qty <= 0) {
      this.stockpile.delete(oreType);
    } else {
      this.stockpile.set(oreType, qty);
    }
    this.playIdle();
  }

  clearStock(): void {
    this.stockpile.clear();
    this.playIdle();
  }

  getBarCount(oreType: OreType): number {
    return this.stockpile.get(oreType) ?? 0;
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'DEPOSIT', target: 'STORAGE' };
  }
}
