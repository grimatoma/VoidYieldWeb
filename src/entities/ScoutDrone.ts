import { DroneBase } from './DroneBase';

/** Mining Drone — general-purpose miner (GDD §11 "Scout Drone", spec 04 §2).
 * Shown as "MINING DRONE" in the Drone Bay UI. Driven by MiningCircuitManager. */
export class ScoutDrone extends DroneBase {
  static readonly COST = 25;
  static readonly MINE_TIME = 3.0; // seconds per mining cycle — GDD §11

  constructor(x: number, y: number) {
    super('scout', x, y, 60, 3, ScoutDrone.MINE_TIME);
  }
}
