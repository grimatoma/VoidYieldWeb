import { DroneBase } from './DroneBase';

// TODO(drone-behavior): implement logistics hauler dispatch per docs/specs/04_drone_swarm.md §3 Tier-1 FUEL/EMPTY + Tier-2 AUTO-HARVEST-SUPPORT. Only the ZoneManager harvester-support circuits work today; CARRY-between-buildings is unimplemented.
export class RefineryDrone extends DroneBase {
  static readonly COST = 75;

  constructor(x: number, y: number) {
    super('refinery', x, y, 50, 8);
  }
}
