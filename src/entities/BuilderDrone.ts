import { DroneBase } from './DroneBase';

export class BuilderDrone extends DroneBase {
  static readonly COST = 200;

  constructor(x: number, y: number) {
    super('builder', x, y, 45, 15);
  }
}
