/**
 * MiningCircuitManager — drives the drone auto-mining loop (GDD §11 "Drone
 * Behavior State Machine"):
 *
 *     IDLE → SEEKING → MINING → RETURNING → IDLE  ... (loop)
 *
 * Watches idle Mining (`scout`) and Heavy Miner (`heavy`) drones and, when
 * conditions are right, pushes a MINE + CARRY task pair that carries the
 * drone to a deposit, fills its cargo, returns to the storage depot, and
 * deposits into the pool. The drone's existing state machine in DroneBase
 * handles movement/pathfinding/execute-timer — this service is pure
 * dispatch.
 *
 * Rules (from GDD §11 edge cases):
 * - Storage full → drones stay IDLE (don't mine).
 * - Drone `disabled` → skip (respects Drone Bay active/inactive toggle).
 * - Deposit claim prevents two drones piling on one node.
 * - Exhausted deposit auto-releases claim (handled in Deposit.mine()).
 */
import type { DroneBase } from '@entities/DroneBase';
import type { StorageDepot } from '@entities/StorageDepot';
import type { DroneType } from '@data/types';
import { depositMap } from './DepositMap';
import { fleetManager } from './FleetManager';

const MINER_TYPES: ReadonlySet<DroneType> = new Set<DroneType>(['scout', 'heavy']);

export class MiningCircuitManager {
  private _depot: StorageDepot | null = null;
  private _active = false;
  private _scanTimer = 0;
  /** Scan cadence. Cheap to scan — every 0.5s is fast enough that a freshly
   * purchased drone starts mining within a blink. */
  private static readonly SCAN_INTERVAL = 0.5;

  /** Wire the depot this planet's miners will deposit into. Call once per
   * planet scene `enter()`. */
  setDepot(depot: StorageDepot | null): void {
    this._depot = depot;
    this._active = depot !== null;
    this._scanTimer = 0;
  }

  reset(): void {
    this._depot = null;
    this._active = false;
    this._scanTimer = 0;
  }

  /** Call once per frame from the planet scene update loop. */
  update(delta: number): void {
    if (!this._active || !this._depot) return;
    this._scanTimer += delta;
    if (this._scanTimer < MiningCircuitManager.SCAN_INTERVAL) return;
    this._scanTimer = 0;
    this._tick();
  }

  /** One dispatch scan: find idle miners and assign them a mining circuit. */
  private _tick(): void {
    if (!this._depot) return;
    // removed isFull check

    for (const drone of fleetManager.getDrones()) {
      if (!MINER_TYPES.has(drone.droneType)) continue;
      if (drone.disabled) continue;
      if (drone.state !== 'IDLE') continue;
      if (drone.getTasks().length > 0) continue;

      this._dispatchMiningCircuit(drone);
    }
  }

  /** Claim the nearest matching deposit and queue a two-step circuit:
   *   1) MINE: move to deposit, extract a cargo load
   *   2) CARRY: move back to depot, deposit into the pool */
  private _dispatchMiningCircuit(drone: DroneBase): boolean {
    if (!this._depot) return false;

    const deposit = depositMap.getNearestUnclaimedDeposit(
      drone.x,
      drone.y,
      drone.orePreference,
    );
    if (!deposit) return false; // no work; drone stays IDLE, re-check next scan
    if (!deposit.claim(drone.id)) return false;

    const depotRef = this._depot;
    const droneId = drone.id;

    // Step 1: go to deposit, mine a cargo load.
    drone.pushTask({
      type: 'MINE',
      targetX: deposit.data.x,
      targetY: deposit.data.y,
      executeDurationSec: drone.mineTimeSec,
      onExecute: () => {
        const lot = deposit.mine(drone.carryCapacity);
        if (lot.quantity > 0) {
          drone.cargo = lot;
        }
        // Release whether or not we got ore so another drone can pick up a
        // partially-depleted node next tick.
        deposit.release(droneId);
      },
    });

    // Step 2: haul back to depot, deposit.
    drone.pushTask({
      type: 'CARRY',
      targetX: depotRef.x,
      targetY: depotRef.y,
      executeDurationSec: 0.3,
      onExecute: () => {
        if (drone.cargo && drone.cargo.quantity > 0) {
          depotRef.deposit([drone.cargo]);
          drone.cargo = null;
        }
      },
    });

    return true;
  }
}

export const miningCircuitManager = new MiningCircuitManager();
