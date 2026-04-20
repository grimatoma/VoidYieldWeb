export type OreType = 'vorax' | 'krysite' | 'gas' | 'steel_bars' | 'compressed_gas' | 'water' | 'alloy_rods' | 'rocket_fuel' | 'shards' | 'aethite' | 'void_cores';

export type RocketComponentType = 'hull' | 'engine' | 'fuel_tank' | 'avionics' | 'landing_gear';

export interface RocketComponentData {
  componentType: RocketComponentType;
  name: string;
  carrySlots: number;  // how many inventory slots it occupies
  attributes: QualityAttributes;
}
export type SizeClass = 'small' | 'medium' | 'large';
export type QualityGrade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface QualityAttributes {
  OQ?: number; // Overall Quality (1–1000)
  CR?: number; // Crystallinity
  CD?: number; // Crystal Density
  DR?: number; // Ductility Rating
  FL?: number; // Flow Rate
  HR?: number; // Hardness Rating
  MA?: number; // Malleability
  PE?: number; // Purity/Efficiency
  SR?: number; // Structural Rigidity
  UT?: number; // Utility Rating
  ER?: number; // Extraction Rate modifier
}

export function getQualityGrade(oq: number): QualityGrade {
  if (oq >= 950) return 'S';
  if (oq >= 800) return 'A';
  if (oq >= 600) return 'B';
  if (oq >= 400) return 'C';
  if (oq >= 200) return 'D';
  return 'F';
}

export interface QualityLot {
  oreType: OreType;
  quantity: number;
  attributes: QualityAttributes;
}

export interface DepositData {
  depositId: string;
  oreType: OreType;
  x: number;
  y: number;
  concentrationPeak: number; // 0–100
  yieldRemaining: number;
  sizeClass: SizeClass;
  isExhausted: boolean;
  qualityAttributes?: QualityAttributes;
}

export interface WaypointData {
  depositId: string;
  x: number;
  y: number;
  oreType: OreType;
  concentration: number;
  analysisComplete: boolean;
}

export type DroneTaskType = 'MINE' | 'CARRY' | 'IDLE';
export type DroneState = 'IDLE' | 'MOVING_TO_TARGET' | 'EXECUTING';
export type DroneType = 'scout' | 'heavy' | 'refinery' | 'survey' | 'builder' | 'cargo';

export interface DroneTask {
  type: DroneTaskType;
  targetX: number;
  targetY: number;
  executeDurationSec: number;  // 2.0 for MINE, 0.3 for CARRY
  onExecute?: () => void;
}

export type RouteStatus = 'IDLE' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERING' | 'STALLED';
export type CargoClass = 'bulk' | 'refined' | 'components';

export interface TradeRoute {
  routeId: string;
  sourcePlanet: string;
  destPlanet: string;
  cargoType: OreType;
  cargoQty: number;       // units per trip
  cargoClass: CargoClass;
  status: RouteStatus;
  tripTimeSec: number;    // real seconds for one trip
  tripsCompleted: number;
  elapsedSec: number;     // time since last dispatch
  autoDispatch: boolean;  // false for M11 (manual only)
}
