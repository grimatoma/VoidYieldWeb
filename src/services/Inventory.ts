import type { QualityLot, OreType } from '@data/types';
import { EventBus } from './EventBus';

export class Inventory {
  private lots: QualityLot[] = [];
  carryLimit = 10;

  get totalUnits(): number {
    return this.lots.reduce((sum, l) => sum + l.quantity, 0);
  }

  get isFull(): boolean { return this.totalUnits >= this.carryLimit; }

  /** Add a lot. Returns actually added quantity (capped by carry limit). */
  add(lot: QualityLot): number {
    const space = this.carryLimit - this.totalUnits;
    const qty = Math.min(lot.quantity, space);
    if (qty <= 0) return 0;
    const existing = this.lots.find(l => l.oreType === lot.oreType);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.lots.push({ ...lot, quantity: qty });
    }
    EventBus.emit('inventory:changed');
    return qty;
  }

  getLots(): readonly QualityLot[] { return this.lots; }

  getByType(type: OreType): number {
    return this.lots.filter(l => l.oreType === type).reduce((s, l) => s + l.quantity, 0);
  }

  /** Remove all lots. Returns them (for transfer to depot). */
  drain(): QualityLot[] {
    const drained = [...this.lots];
    this.lots = [];
    return drained;
  }

  serialize(): QualityLot[] { return [...this.lots]; }
  restore(lots: QualityLot[]): void { this.lots = [...lots]; }
}

export const inventory = new Inventory();
