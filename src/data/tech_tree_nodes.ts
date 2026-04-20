export interface TechNode {
  nodeId: string;
  name: string;
  description: string;
  branch: 1 | 2 | 3;
  rpCost: number;
  crCost: number;
  prerequisites: string[];
  effectType: string;
  effectValue: number;
  maxPurchases?: number;  // if set, allows buying multiple times (e.g. cargo_pockets)
}

export const TECH_NODES: TechNode[] = [
  // Branch 0 — Early Purchases (no RP, CR only)
  {
    nodeId: 'drill_bit_mk2',
    name: 'Drill Bit Mk.II',
    description: 'Halves manual mining time.',
    branch: 1,
    rpCost: 0,
    crCost: 50,
    prerequisites: [],
    effectType: 'mine_speed',
    effectValue: 0.5,
  },
  {
    nodeId: 'cargo_pockets_1',
    name: 'Cargo Pockets Mk.I',
    description: 'Carry limit +5. Purchase up to 3 times.',
    branch: 1,
    rpCost: 0,
    crCost: 75,
    prerequisites: [],
    effectType: 'carry_limit',
    effectValue: 5,
    maxPurchases: 3,
  },
  {
    nodeId: 'thruster_boots',
    name: 'Thruster Boots',
    description: 'Player move speed +20%.',
    branch: 1,
    rpCost: 0,
    crCost: 60,
    prerequisites: [],
    effectType: 'player_speed',
    effectValue: 0.2,
  },
  // Branch 1 — Extraction
  {
    nodeId: 'improved_drill',
    name: 'Improved Drill Geometry',
    description: 'Harvester BER +10%.',
    branch: 1,
    rpCost: 50,
    crCost: 0,
    prerequisites: [],
    effectType: 'ber_multiplier',
    effectValue: 0.1,
  },
  {
    nodeId: 'heavy_drone_unlock',
    name: 'Heavy Drone',
    description: 'Unlocks Heavy Drone purchase at Drone Bay (150 CR).',
    branch: 1,
    rpCost: 100,
    crCost: 0,
    prerequisites: ['improved_drill'],
    effectType: 'unlock_drone',
    effectValue: 1,
  },
  {
    nodeId: 'refinery_drone_unlock',
    name: 'Refinery Drone',
    description: 'Unlocks Refinery Drone purchase at Drone Bay (75 CR). Handles FUEL and EMPTY circuits automatically.',
    branch: 1,
    rpCost: 300,
    crCost: 0,
    prerequisites: ['improved_drill'],
    effectType: 'unlock_drone',
    effectValue: 2,
  },
  // Branch 2 — Research/Processing
  {
    nodeId: 'sample_analysis_1',
    name: 'Sample Analysis I',
    description: 'Reduces lab analysis time to 60 s (from 2 min).',
    branch: 2,
    rpCost: 100,
    crCost: 0,
    prerequisites: [],
    effectType: 'lab_time',
    effectValue: 60,
  },
  {
    nodeId: 'metallurgy_1',
    name: 'Metallurgy I',
    description: 'Unlocks Alloy Refinery recipe and Fabricator construction.',
    branch: 2,
    rpCost: 200,
    crCost: 400,
    prerequisites: ['sample_analysis_1'],
    effectType: 'unlock_fabricator_prereq',
    effectValue: 1,
  },
  {
    nodeId: 'fabricator_unlock',
    name: 'Fabricator Unlock',
    description: 'Allows building Fabricators (2-slot, 2-input advanced factories).',
    branch: 2,
    rpCost: 800,
    crCost: 0,
    prerequisites: ['metallurgy_1'],
    effectType: 'unlock_fabricator',
    effectValue: 1,
  },
  // Branch 3 — Logistics
  {
    nodeId: 'logistics_1',
    name: 'Logistics I',
    description: 'Fleet cap +1 (4 total per planet).',
    branch: 3,
    rpCost: 100,
    crCost: 100,
    prerequisites: [],
    effectType: 'fleet_cap',
    effectValue: 1,
  },
];
