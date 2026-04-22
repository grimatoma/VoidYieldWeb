import { DroneBase } from './DroneBase';

// TODO(drone-behavior): implement REPAIR task per docs/specs/04_drone_swarm.md §3 Tier-1 REPAIR (fetch Scrap Metal/Alloy Rods, repair harvesters/buildings/cargo ships back to 100% efficiency). Requires tech node 2.S unlock gating. Currently a purchasable stub that just sits idle.
export class RepairDrone extends DroneBase {
  static readonly COST = 800;

  constructor(x: number, y: number) {
    super('repair', x, y, 90, 0);
  }
}
