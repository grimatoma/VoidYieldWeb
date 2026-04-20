import { DroneBase } from './DroneBase';

export class RefineryDrone extends DroneBase {
  static readonly COST = 75;

  constructor(x: number, y: number) {
    super('refinery', x, y, 50, 8);
  }
}
