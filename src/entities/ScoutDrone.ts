import { DroneBase } from './DroneBase';

export class ScoutDrone extends DroneBase {
  static readonly COST = 25;

  constructor(x: number, y: number) {
    super('scout', x, y, 60, 3);
  }
}
