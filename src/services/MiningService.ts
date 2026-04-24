import { depositMap } from './DepositMap';
import { inventory } from './Inventory';
import { EventBus } from './EventBus';
import type { StorageDepot } from '@entities/StorageDepot';
import type { Deposit } from '@entities/Deposit';
import type { Furnace } from '@entities/Furnace';

export class MiningService {
  private depot: StorageDepot | null = null;
  private _furnace: Furnace | null = null;
  private _hasSurveyed = false;
  /** Seconds per unit mined while E is held. Matches legacy hold-to-mine feel. */
  private static readonly HOLD_PER_UNIT = 0.5;
  private _holdTarget: Deposit | null = null;
  private _holdElapsed = 0;
  private _holdActive = false;
  /** True when mining was started by a tap-to-mine arrival (not by holding E).
   *  onInteractReleased() skips cancellation when this is set so the keyboard
   *  "E not held" check in the scene update loop doesn't immediately undo the
   *  tap-initiated mine. Cleared by cancelAutoMine() or when E is pressed. */
  private _autoMining = false;

  setDepot(depot: StorageDepot): void { this.depot = depot; }

  setFurnace(furnace: Furnace | null): void { this._furnace = furnace; }

  /** True while the player is actively mining a valid deposit this frame. */
  get isMining(): boolean {
    return this._holdActive && this._holdTarget !== null && !this._holdTarget.data.isExhausted;
  }

  /** Current hold-to-mine progress (0–1) for the active target. */
  get progress(): number {
    return this._holdTarget?.holdProgress ?? 0;
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

  /** Start mining triggered by tap-to-move arrival. Unlike onInteract, this
   *  survives the scene's per-frame onInteractReleased() call. */
  startAutoMine(px: number, py: number): void {
    const deposit = depositMap.getNearestDeposit(px, py, 28);
    if (!deposit || deposit.data.isExhausted) return;
    this._autoMining = true;
    this._holdActive = true;
  }

  /** Cancel tap-initiated auto-mining (new tap on ground or deposit). */
  cancelAutoMine(): void {
    this._autoMining = false;
    this._holdActive = false;
    if (this._holdTarget) this._holdTarget.holdProgress = 0;
    this._holdElapsed = 0;
    this._holdTarget = null;
  }

  /** E pressed: if near depot, deposit to storage. Otherwise start hold-mining. */
  onInteract(px: number, py: number): string | null {
    // Keyboard explicitly takes control — cancel any tap-initiated auto-mine.
    this._autoMining = false;
    if (this.depot?.isNearby(px, py, 40)) {
      const lots = inventory.drain();
      this.depot.deposit(lots);
      return lots.length > 0 ? 'Deposited' : 'Nothing to deposit';
    }

    if (this._furnace?.isNearby(px, py, 40)) {
      if (this._furnace.takeProducts()) {
        return 'Products extracted';
      }
      const inserted = this._furnace.insertFromInventory();
      if (inserted > 0) {
        EventBus.emit('inventory:changed');
        return `Inserted ${inserted} ore`;
      }
      return 'No matching ore to insert';
    }

    const deposit = depositMap.getNearestDeposit(px, py, 28);
    if (!deposit) return null;
    if (deposit.data.isExhausted) return 'Deposit exhausted';
    // Starting hold-mine; progress handled in update().
    this._holdActive = true;
    return null;
  }

  /** E released — cancel keyboard hold-mine. No-op during tap-initiated auto-mine. */
  onInteractReleased(): void {
    if (this._autoMining) return;
    this._holdActive = false;
    if (this._holdTarget) this._holdTarget.holdProgress = 0;
    this._holdElapsed = 0;
    this._holdTarget = null;
  }
}

export const miningService = new MiningService();
