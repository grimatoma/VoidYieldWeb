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
