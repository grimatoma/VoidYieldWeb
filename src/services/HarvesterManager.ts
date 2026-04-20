import type { HarvesterBase } from '@entities/HarvesterBase';
import type { Container } from 'pixi.js';
import { inventory } from './Inventory';
import { EventBus } from './EventBus';

export class HarvesterManager {
  private harvesters: HarvesterBase[] = [];

  add(h: HarvesterBase, worldContainer: Container): void {
    this.harvesters.push(h);
    worldContainer.addChild(h.container);
  }

  clear(worldContainer: Container): void {
    for (const h of this.harvesters) worldContainer.removeChild(h.container);
    this.harvesters = [];
  }

  update(delta: number): void {
    for (const h of this.harvesters) h.update(delta);
  }

  /** Try to interact with a harvester within 30px of (px, py).
   *  - HOPPER_FULL or RUNNING: empty hopper into player inventory
   *  - FUEL_EMPTY: refuel from inventory (gas units — for M3, any gas in inventory)
   *  Returns a status string or null if no harvester nearby.
   */
  onInteract(px: number, py: number): string | null {
    const h = this._nearest(px, py, 30);
    if (!h) return null;

    if (h.state === 'HOPPER_FULL' || h.hopperCurrent > 0) {
      const lot = h.emptyHopper();
      if (lot.quantity > 0) {
        inventory.add(lot);
        EventBus.emit('inventory:changed');
        return `Emptied hopper: ${lot.quantity}x ${lot.oreType}`;
      }
    }

    if (h.state === 'FUEL_EMPTY' || h.fuelCurrent < 10) {
      // Use gas from inventory as fuel
      const gasInInv = inventory.getByType('gas');
      if (gasInInv > 0) {
        // Remove gas from inventory manually via drain-and-re-add pattern
        const lots = inventory.drain();
        const gasLot = lots.find(l => l.oreType === 'gas');
        const toUse = gasLot ? Math.min(gasLot.quantity, 50) : 0; // refuel up to 50 units
        if (gasLot && gasLot.quantity > toUse) {
          gasLot.quantity -= toUse;
          for (const l of lots) if (l.quantity > 0) inventory.add(l);
        } else {
          for (const l of lots.filter(l => l.oreType !== 'gas')) inventory.add(l);
        }
        h.refuel(toUse);
        return `Refueled with ${toUse} gas`;
      }
      return 'No gas to refuel with';
    }

    return `Harvester: ${h.state}, hopper ${Math.floor(h.hopperFillPct * 100)}%`;
  }

  getAll(): HarvesterBase[] { return [...this.harvesters]; }

  private _nearest(px: number, py: number, radius: number): HarvesterBase | null {
    let best: HarvesterBase | null = null;
    let bestDist = radius;
    for (const h of this.harvesters) {
      const dx = h.config.worldX - px;
      const dy = h.config.worldY - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = h; }
    }
    return best;
  }
}

export const harvesterManager = new HarvesterManager();
