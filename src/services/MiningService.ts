import { depositMap } from './DepositMap';
import { inventory } from './Inventory';
import { gameState } from './GameState';
import { EventBus } from './EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

export class MiningService {
  private depot: StorageDepot | null = null;
  private miningCooldown = 0; // seconds remaining before can mine again

  setDepot(depot: StorageDepot): void { this.depot = depot; }

  update(delta: number): void {
    if (this.miningCooldown > 0) this.miningCooldown -= delta;
  }

  /** Call when player presses E. px/py = player world position. */
  onInteract(px: number, py: number): string | null {
    // 1. Check depot interaction (within 40px)
    if (this.depot?.isNearby(px, py, 40)) {
      const lots = inventory.drain();
      this.depot.deposit(lots);
      const cr = this.depot.sellAll();
      if (cr > 0) {
        gameState.addCredits(cr);
        return `Sold for ${cr} CR`;
      }
      return lots.length > 0 ? 'Deposited (nothing to sell)' : 'Depot is empty';
    }

    // 2. Check deposit mining (within 20px, not on cooldown)
    if (this.miningCooldown > 0) return null;
    const deposit = depositMap.getNearestDeposit(px, py, 20);
    if (!deposit) return null;
    if (deposit.data.isExhausted) return 'Deposit exhausted';
    if (inventory.isFull) return 'Inventory full';

    const lot = deposit.mine(3);
    const added = inventory.add(lot);
    if (added > 0) {
      this.miningCooldown = 0.5; // brief cooldown between mines
      EventBus.emit('inventory:changed');
      return `Mined ${added}x ${lot.oreType}`;
    }
    return null;
  }
}

export const miningService = new MiningService();
