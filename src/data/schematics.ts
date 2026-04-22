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
  attributeWeights?: Record<string, number>;
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
    outputType: 'drill_head',
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
    attributeWeights: {
      OQ: { slot: 'A', weight: 0.5 },
      PE: { slot: 'B', weight: 0.5 },
    },
  },
  hull: {
    schematicId: 'hull',
    name: 'Rocket Hull',
    inputTypeA: 'steel_bars',
    inputQtyA: 4,
    inputTypeB: 'alloy_rods',
    inputQtyB: 2,
    outputType: 'hull',
    outputQty: 1,
    batchPerHr: 1,
    powerDraw: 8,
    attributeWeights: {
      SR: { slot: 'A', weight: 0.6 },
      MA: { slot: 'B', weight: 0.25 },
      OQ: { slot: 'A', weight: 0.15 },
    },
  },
  engine: {
    schematicId: 'engine',
    name: 'Rocket Engine',
    inputTypeA: 'alloy_rods',
    inputQtyA: 3,
    inputTypeB: 'compressed_gas',
    inputQtyB: 2,
    outputType: 'engine',
    outputQty: 1,
    batchPerHr: 1,
    powerDraw: 8,
    attributeWeights: {
      HR: { slot: 'A', weight: 0.5 },
      PE: { slot: 'B', weight: 0.3 },
      UT: { slot: 'A', weight: 0.2 },
    },
  },
  fuel_tank: {
    schematicId: 'fuel_tank',
    name: 'Fuel Tank',
    inputTypeA: 'alloy_rods',
    inputQtyA: 2,
    inputTypeB: 'processed_resin',
    inputQtyB: 1,
    outputType: 'fuel_tank',
    outputQty: 1,
    batchPerHr: 2,
    powerDraw: 8,
    attributeWeights: {
      PE: { slot: 'B', weight: 0.5 },
      MA: { slot: 'A', weight: 0.3 },
      OQ: { slot: 'A', weight: 0.2 },
    },
  },
  avionics: {
    schematicId: 'avionics',
    name: 'Avionics Suite',
    inputTypeA: 'bio_circuit_boards',
    inputQtyA: 2,
    inputTypeB: 'alloy_rods',
    inputQtyB: 1,
    outputType: 'avionics',
    outputQty: 1,
    batchPerHr: 2,
    powerDraw: 8,
    attributeWeights: {
      UT: { slot: 'A', weight: 0.5 },
      OQ: { slot: 'A', weight: 0.3 },
      CD: { slot: 'A', weight: 0.2 },
    },
  },
  landing_gear: {
    schematicId: 'landing_gear',
    name: 'Landing Gear',
    inputTypeA: 'steel_bars',
    inputQtyA: 2,
    inputTypeB: 'alloy_rods',
    inputQtyB: 1,
    outputType: 'landing_gear',
    outputQty: 1,
    batchPerHr: 3,
    powerDraw: 8,
    attributeWeights: {
      MA: { slot: 'B', weight: 0.5 },
      HR: { slot: 'A', weight: 0.3 },
      OQ: { slot: 'A', weight: 0.2 },
    },
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
  iron_smelter: {
    schematicId: 'iron_smelter',
    name: 'Iron Smelt',
    inputType: 'iron_ore',
    inputQty: 2,
    outputType: 'iron_bar',
    outputQty: 1,
    batchPerMin: 60,  // 1 s per batch
    powerDraw: 3,
  },
  copper_smelter: {
    schematicId: 'copper_smelter',
    name: 'Copper Smelt',
    inputType: 'copper_ore',
    inputQty: 2,
    outputType: 'copper_bar',
    outputQty: 1,
    batchPerMin: 60,  // 1 s per batch
    powerDraw: 3,
  },
  ore_smelter: {
    schematicId: 'ore_smelter',
    name: 'Ore Smelter',
    inputType: 'vorax',
    inputQty: 1,
    outputType: 'steel_bars',
    outputQty: 1,
    batchPerMin: 12,
    powerDraw: 3,
    attributeWeights: {
      OQ: 0.4,
      MA: 0.3,
      HR: 0.3,
    },
  },
  plate_press: {
    schematicId: 'plate_press',
    name: 'Plate Press',
    inputType: 'steel_bars',
    inputQty: 1,
    outputType: 'steel_plates',
    outputQty: 1,
    batchPerMin: 8,
    powerDraw: 3,
    attributeWeights: {
      SR: 0.5,
      MA: 0.3,
      HR: 0.2,
    },
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
    attributeWeights: {
      OQ: 0.4,
      PE: 0.4,
      UT: 0.2,
    },
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
    attributeWeights: {
      OQ: 0.3,
      MA: 0.4,
      HR: 0.3,
    },
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
    attributeWeights: {
      OQ: 0.4,
      PE: 0.5,
      UT: 0.1,
    },
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
    attributeWeights: {
      OQ: 0.3,
      PE: 0.4,
      CD: 0.3,
    },
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
    attributeWeights: {
      OQ: 0.5,
      PE: 0.3,
      UT: 0.2,
    },
  },
};
