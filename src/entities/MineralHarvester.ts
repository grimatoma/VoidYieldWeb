import { HarvesterBase } from './HarvesterBase';
import type { OreType } from '@data/types';

export class MineralHarvester extends HarvesterBase {
  constructor(worldX: number, worldY: number, oreType: OreType, concentration: number) {
    super({
      ber: 5,
      hopperCapacity: 500,
      fuelPerHour: 3,
      oreType,
      worldX,
      worldY,
      depositConcentration: concentration,
    });
  }
}
