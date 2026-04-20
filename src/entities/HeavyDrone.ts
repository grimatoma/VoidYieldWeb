import { DroneBase } from './DroneBase';

export class HeavyDrone extends DroneBase {
  static readonly COST = 150;

  constructor(x: number, y: number) {
    super('heavy', x, y, 40, 10);
  }
}
