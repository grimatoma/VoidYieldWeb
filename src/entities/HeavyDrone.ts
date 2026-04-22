import { DroneBase } from './DroneBase';

/** Heavy Miner — high-throughput miner (GDD §11 "Heavy Drone", spec 04 §2).
 * Slower but hauls 10 ore per trip with a 2s mine time. Shown as
 * "HEAVY MINER" in the Drone Bay UI. Driven by MiningCircuitManager. */
export class HeavyDrone extends DroneBase {
  static readonly COST = 150;
  static readonly MINE_TIME = 2.0; // seconds per mining cycle — GDD §11

  constructor(x: number, y: number) {
    super('heavy', x, y, 40, 10, HeavyDrone.MINE_TIME);
  }
}
