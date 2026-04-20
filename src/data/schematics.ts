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
  bio_circuit_board: {
    schematicId: 'bio_circuit_board',
    name: 'Bio-Circuit Board',
    inputTypeA: 'alloy_rods',
    inputQtyA: 1,
    inputTypeB: 'processed_resin',
    inputQtyB: 1,
    outputType: 'bio_circuit_boards',
    outputQty: 1,
    batchPerHr: 3,
    powerDraw: 8,
  },
};

export interface AssemblySchematic {
  schematicId: string;
  name: string;
  inputTypeA: OreType;
  inputQtyA: number;
  inputTypeB: OreType;
  inputQtyB: number;
  inputTypeC: OreType;
  inputQtyC: number;
  outputType: OreType;
  outputQty: number;
  batchPerHr: number;
  powerDraw: number;
}

export const ASSEMBLY_SCHEMATICS: Record<string, AssemblySchematic> = {
  rocket_engine: {
    schematicId: 'rocket_engine',
    name: 'Rocket Engine',
    inputTypeA: 'steel_bars',
    inputQtyA: 2,
    inputTypeB: 'alloy_rods',
    inputQtyB: 2,
    inputTypeC: 'compressed_gas',
    inputQtyC: 3,
    outputType: 'rocket_fuel',
    outputQty: 5,
    batchPerHr: 2,
    powerDraw: 15,
  },
  warp_capacitor: {
    schematicId: 'warp_capacitor',
    name: 'Warp Capacitor',
    inputTypeA: 'void_cores',
    inputQtyA: 1,
    inputTypeB: 'alloy_rods',
    inputQtyB: 2,
    inputTypeC: 'resonance_shards',
    inputQtyC: 3,
    outputType: 'warp_components',
    outputQty: 1,
    batchPerHr: 1,
    powerDraw: 15,
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
  fuel_synthesizer: {
    schematicId: 'fuel_synthesizer',
    name: 'Fuel Synthesizer',
    inputType: 'compressed_gas',
    inputQty: 3,
    outputType: 'rocket_fuel',
    outputQty: 1,
    batchPerMin: 4,
    powerDraw: 3,
  },
  bio_extractor: {
    schematicId: 'bio_extractor',
    name: 'Bio-Extractor',
    inputType: 'bio_resin',
    inputQty: 1,
    outputType: 'processed_resin',
    outputQty: 1,
    batchPerMin: 5,
    powerDraw: 3,
  },
  ration_synthesizer: {
    schematicId: 'ration_synthesizer',
    name: 'Ration Synthesizer',
    inputType: 'processed_resin',
    inputQty: 1,
    outputType: 'processed_rations',
    outputQty: 1,
    batchPerMin: 8,
    powerDraw: 3,
  },
};
