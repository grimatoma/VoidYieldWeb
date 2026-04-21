import { DroneBase } from './DroneBase';

export class CargoDrone extends DroneBase {
  static readonly COST = 500;

  constructor(x: number, y: number) {
    super('cargo', x, y, 35, 20);
  }
}
