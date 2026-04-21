import { Text } from 'pixi.js';
import { HarvesterBase } from './HarvesterBase';
import type { HarvesterTier } from '@data/types';

export class CrystalHarvester extends HarvesterBase {
  static readonly SPECS: Record<HarvesterTier, { ber: number; hopperCapacity: number; fuelPerHour: number; costCr: number }> = {
    personal: { ber: 4,  hopperCapacity: 400,   fuelPerHour: 4,  costCr: 200  },
    medium:   { ber: 9,  hopperCapacity: 1200,  fuelPerHour: 10, costCr: 700  },
    heavy:    { ber: 18, hopperCapacity: 3500,  fuelPerHour: 22, costCr: 2200 },
    elite:    { ber: 40, hopperCapacity: 10000, fuelPerHour: 50, costCr: 8000 },
  };

  private identifier: Text;

  constructor(worldX: number, worldY: number, oreType: 'krysite' | 'aethite', concentration: number, tier: HarvesterTier = 'personal') {
    const spec = CrystalHarvester.SPECS[tier];
    super({
      ber: spec.ber,
      hopperCapacity: spec.hopperCapacity,
      fuelPerHour: spec.fuelPerHour,
      oreType,
      worldX,
      worldY,
      depositConcentration: concentration,
    });

    // Add identifier text "CH" for CrystalHarvester
    this.identifier = new Text({
      text: 'CH',
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
