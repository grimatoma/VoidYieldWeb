import type { DepositData } from './types';

export const DEPOSITS_B: DepositData[] = [
  // Gas deposits (high PE)
  { depositId: 'b-g1', oreType: 'gas',     x: 400,  y: 500,  concentrationPeak: 75, yieldRemaining: 1500, sizeClass: 'large',  isExhausted: false,
    qualityAttributes: { OQ: 580, PE: 820, FL: 640, CR: 490 } },
  { depositId: 'b-g2', oreType: 'gas',     x: 2800, y: 1800, concentrationPeak: 68, yieldRemaining: 1200, sizeClass: 'large',  isExhausted: false,
    qualityAttributes: { OQ: 540, PE: 890, FL: 600, CR: 460 } },
  // Shards deposits
  { depositId: 'b-s1', oreType: 'shards',  x: 800,  y: 300,  concentrationPeak: 55, yieldRemaining: 600,  sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 680, CR: 850, CD: 790, PE: 440 } },
  { depositId: 'b-s2', oreType: 'shards',  x: 1600, y: 900,  concentrationPeak: 62, yieldRemaining: 800,  sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 720, CR: 910, CD: 820, PE: 380 } },
  { depositId: 'b-s3', oreType: 'shards',  x: 2400, y: 600,  concentrationPeak: 48, yieldRemaining: 500,  sizeClass: 'small',  isExhausted: false,
    qualityAttributes: { OQ: 590, CR: 780, CD: 650, PE: 510 } },
  // Aethite deposits (surface)
  { depositId: 'b-a1', oreType: 'aethite', x: 1200, y: 1400, concentrationPeak: 42, yieldRemaining: 700,  sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 760, CR: 820, MA: 690, PE: 720, CD: 880 } },
  { depositId: 'b-a2', oreType: 'aethite', x: 2000, y: 1200, concentrationPeak: 50, yieldRemaining: 900,  sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 640, CR: 750, MA: 600, PE: 680, CD: 820 } },
];
