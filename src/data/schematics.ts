import type { OreType } from './types';

export interface Schematic {
  schematicId: string;
  name: string;
  inputType: OreType;
  inputQty: number;
  outputType: OreType;
  outputQty: number;
  batchPerMin: number;
  powerDraw: number;
}

export const SCHEMATICS: Record<string, Schematic> = {
  ore_smelter: {
    schematicId: 'ore_smelter',
    name: 'Ore Smelter',
    inputType: 'vorax',
    inputQty: 1,
    outputType: 'steel_bars',
    outputQty: 1,
    batchPerMin: 12,
    powerDraw: 3,
  },
};
