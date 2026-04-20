export type OreType = 'vorax' | 'krysite' | 'gas';
export type SizeClass = 'small' | 'medium' | 'large';

export interface QualityLot {
  oreType: OreType;
  quantity: number;
  attributes: Record<string, number>; // empty for M2, filled at M9
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
