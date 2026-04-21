import { depositMap } from './DepositMap';
import { inventory } from './Inventory';
import { gameState } from './GameState';
import { EventBus } from './EventBus';
import type { StorageDepot } from '@entities/StorageDepot';
import type { Deposit } from '@entities/Deposit';

export class MiningService {
  private depot: StorageDepot | null = null;
  private _hasSurveyed = false;
  /** Seconds per unit mined while E is held. Matches legacy hold-to-mine feel. */
  private static readonly HOLD_PER_UNIT = 1.5;
  private _holdTarget: Deposit | null = null;
  private _holdElapsed = 0;
  private _holdActive = false;

  setDepot(depot: StorageDepot): void { this.depot = depot; }

  /** True while the player is actively mining a valid deposit this frame. */
  get isMining(): boolean {
    return this._holdActive && this._holdTarget !== null && !this._holdTarget.data.isExhausted;
  }

  /** Player position supplied each frame. While E is held & near a deposit, accumulate progress. */
  update(delta: number, playerPos?: { x: number; y: number }): void {
    if (!this._holdActive || !playerPos) {
      if (this._holdTarget) this._holdTarget.holdProgress = 0;
      this._holdTarget = null;
      this._holdElapsed = 0;
      return;
    }
    // Re-resolve target each tick in case the player moved between nodes.
    const near = depositMap.getNearestDeposit(playerPos.x, playerPos.y, 28);
    if (!near || near.data.isExhausted) {
      if (this._holdTarget) this._holdTarget.holdProgress = 0;
      this._holdTarget = null;
      this._holdElapsed = 0;
      return;
    }
    if (this._holdTarget !== near) {
      if (this._holdTarget) this._holdTarget.holdProgress = 0;
      this._holdTarget = near;
      this._holdElapsed = 0;
    }
    if (inventory.isFull) {
      this._holdTarget.holdProgress = 0;
      return;
    }
    this._holdElapsed += delta;
    this._holdTarget.holdProgress = Math.min(1, this._holdElapsed / MiningService.HOLD_PER_UNIT);
    if (this._holdElapsed >= MiningService.HOLD_PER_UNIT) {
      const lot = this._holdTarget.mine(1);
      const added = inventory.add(lot);
      this._holdElapsed = 0;
      this._holdTarget.holdProgress = 0;
      if (added > 0) {
        EventBus.emit('inventory:changed');
        EventBus.emit('ore:collected', lot.oreType, added);
        if (!this._hasSurveyed) {
          this._hasSurveyed = true;
          EventBus.emit('deposit:surveyed');
        }
      }
    }
  }

  /** E pressed: if near depot, deposit+sell. Otherwise start hold-mining. */
  onInteract(px: number, py: number): string | null {
    if (this.depot?.isNearby(px, py, 40)) {
      const lots = inventory.drain();
      this.depot.deposit(lots);
      const cr = this.depot.sellAll();
      if (cr > 0) {
        gameState.addCredits(cr);
        EventBus.emit('ore:sold', cr);
        return `Sold for ${cr} CR`;
      }
      return lots.length > 0 ? 'Deposited (nothing to sell)' : 'Depot is empty';
    }

    const deposit = depositMap.getNearestDeposit(px, py, 28);
    if (!deposit) return null;
    if (deposit.data.isExhausted) return 'Deposit exhausted';
    // Starting hold-mine; progress handled in update().
    this._holdActive = true;
    return null;
  }

  /** E released — cancel hold-mine. */
  onInteractReleased(): void {
    this._holdActive = false;
    if (this._holdTarget) this._holdTarget.holdProgress = 0;
    this._holdElapsed = 0;
    this._holdTarget = null;
  }
}

export const miningService = new MiningService();
