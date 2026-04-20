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

export interface FabricatorSchematic {
  schematicId: string;
  name: string;
  inputTypeA: OreType;
  inputQtyA: number;
  inputTypeB: OreType;
  inputQtyB: number;
  outputType: OreType;
  outputQty: number;
  batchPerHr: number;  // batches per hour (Fabricators are slow, 2-6/hr)
  powerDraw: number;   // 8 per spec
  // Attribute weights for quality calculation (which input's attr matters most)
  // key = attribute abbrev, value = { inputSlot: 'A'|'B', weight: 0-1 }
  attributeWeights?: Record<string, { slot: 'A' | 'B'; weight: number }>;
}

export const FABRICATOR_SCHEMATICS: Record<string, FabricatorSchematic> = {
  drill_head: {
    schematicId: 'drill_head',
    name: 'Drill Head',
    inputTypeA: 'steel_bars',
    inputQtyA: 2,
    inputTypeB: 'alloy_rods',
    inputQtyB: 1,
    outputType: 'steel_bars',  // placeholder - in full game would be a new 'drill_head' OreType
    outputQty: 1,
    batchPerHr: 3,
    powerDraw: 8,
    attributeWeights: {
      UT: { slot: 'B', weight: 0.6 },
      MA: { slot: 'A', weight: 0.25 },
      OQ: { slot: 'A', weight: 0.15 },
    },
  },
  refined_alloy: {
    schematicId: 'refined_alloy',
    name: 'Refined Alloy',
    inputTypeA: 'alloy_rods',
    inputQtyA: 2,
    inputTypeB: 'steel_bars',
    inputQtyB: 1,
    outputType: 'alloy_rods',
    outputQty: 2,
    batchPerHr: 6,
    powerDraw: 8,
    attributeWeights: {
      OQ: { slot: 'A', weight: 0.7 },
      MA: { slot: 'B', weight: 0.3 },
    },
  },
};

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
  gas_compressor: {
    schematicId: 'gas_compressor',
    name: 'Gas Compressor',
    inputType: 'gas',
    inputQty: 1,
    outputType: 'compressed_gas',
    outputQty: 1,
    batchPerMin: 10,
    powerDraw: 3,
  },
  alloy_refinery: {
    schematicId: 'alloy_refinery',
    name: 'Alloy Refinery',
    inputType: 'krysite',
    inputQty: 1,
    outputType: 'alloy_rods',
    outputQty: 1,
    batchPerMin: 6,
    powerDraw: 3,
  },
};
