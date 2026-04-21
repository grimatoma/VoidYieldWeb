import { DroneBase } from './DroneBase';

export class RepairDrone extends DroneBase {
  static readonly COST = 800;

  constructor(x: number, y: number) {
    super('repair', x, y, 90, 0);
  }
}
