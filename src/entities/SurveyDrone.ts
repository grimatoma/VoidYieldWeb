import { DroneBase } from './DroneBase';

// TODO(drone-behavior): implement SAMPLE/AUTO-SURVEY per docs/specs/04_drone_swarm.md §3 (walk survey grid, mark deposits, deliver samples to Research Lab). Currently a purchasable stub that just sits idle.
export class SurveyDrone extends DroneBase {
  static readonly COST = 150;

  constructor(x: number, y: number) {
    super('survey', x, y, 35, 0);
  }
}
