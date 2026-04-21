import { DroneBase } from './DroneBase';

export class SurveyDrone extends DroneBase {
  static readonly COST = 150;

  constructor(x: number, y: number) {
    super('survey', x, y, 35, 0);
  }
}
