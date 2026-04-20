import { HarvesterBase } from './HarvesterBase';

export class GasCollector extends HarvesterBase {
  constructor(worldX: number, worldY: number, concentration: number) {
    super({
      ber: 6,
      hopperCapacity: 200,
      fuelPerHour: 0, // self-powered
      oreType: 'gas',
      worldX,
      worldY,
      depositConcentration: concentration,
    });
  }
}
