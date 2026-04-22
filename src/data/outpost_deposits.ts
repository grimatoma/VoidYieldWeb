import type { DepositData } from '@data/types';

export const OUTPOST_DEPOSITS: DepositData[] = [
  // Three iron_ore deposits, left cluster
  { depositId: 'iron_1', oreType: 'iron_ore', x: 680, y: 140, concentrationPeak: 80, yieldRemaining: 120, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_2', oreType: 'iron_ore', x: 720, y: 200, concentrationPeak: 70, yieldRemaining: 100, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_3', oreType: 'iron_ore', x: 660, y: 240, concentrationPeak: 60, yieldRemaining: 80, sizeClass: 'small', isExhausted: false },
  // Two copper_ore deposits, right cluster
  { depositId: 'copper_1', oreType: 'copper_ore', x: 820, y: 160, concentrationPeak: 75, yieldRemaining: 90, sizeClass: 'medium', isExhausted: false },
  { depositId: 'copper_2', oreType: 'copper_ore', x: 860, y: 230, concentrationPeak: 65, yieldRemaining: 70, sizeClass: 'small', isExhausted: false },
  // One water deposit, top
  { depositId: 'water_1', oreType: 'water', x: 760, y: 90, concentrationPeak: 90, yieldRemaining: 200, sizeClass: 'large', isExhausted: false },
];
