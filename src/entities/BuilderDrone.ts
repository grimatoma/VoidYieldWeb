import { DroneBase } from './DroneBase';

// TODO(drone-behavior): implement BUILD + AUTO-BUILD per docs/specs/04_drone_swarm.md §3 (fetch blueprint materials, construct buildings on industrial sites). Currently a purchasable stub that just sits idle.
export class BuilderDrone extends DroneBase {
  static readonly COST = 200;

  constructor(x: number, y: number) {
    super('builder', x, y, 45, 15);
  }
}
