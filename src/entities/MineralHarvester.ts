import { Text } from 'pixi.js';
import { HarvesterBase } from './HarvesterBase';
import type { OreType, HarvesterTier } from '@data/types';

export class MineralHarvester extends HarvesterBase {
  static readonly SPECS: Record<HarvesterTier, { ber: number; hopperCapacity: number; fuelPerHour: number; costCr: number }> = {
    personal: { ber: 5,  hopperCapacity: 500,   fuelPerHour: 3,  costCr: 150  },
    medium:   { ber: 11, hopperCapacity: 1500,  fuelPerHour: 8,  costCr: 500  },
    heavy:    { ber: 20, hopperCapacity: 4000,  fuelPerHour: 18, costCr: 1500 },
    elite:    { ber: 44, hopperCapacity: 12000, fuelPerHour: 45, costCr: 6000 },
  };

  private identifier: Text;

  constructor(worldX: number, worldY: number, oreType: OreType, concentration: number, tier: HarvesterTier = 'personal') {
    const spec = MineralHarvester.SPECS[tier];
    super({
      ber: spec.ber,
      hopperCapacity: spec.hopperCapacity,
      fuelPerHour: spec.fuelPerHour,
      oreType,
      worldX,
      worldY,
      depositConcentration: concentration,
    });

    // Add identifier text "MH" for MineralHarvester
    this.identifier = new Text({
      text: 'MH',
      style: {
        fontSize: 8,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
      },
    });
    this.identifier.anchor.set(0.5, 0.5);
    this.container.addChild(this.identifier);
  }
}
