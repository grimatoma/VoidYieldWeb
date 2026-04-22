import { DroneBase } from './DroneBase';

// TODO(drone-behavior): implement inter-planet Cargo drone behavior per docs/specs/04_drone_swarm.md §2 (moves cargo between planets via Cargo Ship Bay; interacts with LogisticsManager routes). Currently a purchasable stub that just sits idle.
export class CargoDrone extends DroneBase {
  static readonly COST = 500;

  constructor(x: number, y: number) {
    super('cargo', x, y, 35, 20);
  }
}
