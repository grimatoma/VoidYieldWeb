import type { DepositData } from '@data/types';

export const OUTPOST_DEPOSITS: DepositData[] = [
  // Three iron_ore deposits — right of the centered 5×5 grid (grid ends at x≈700)
  { depositId: 'iron_1', oreType: 'iron_ore', x: 730, y: 150, concentrationPeak: 80, yieldRemaining: 120, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_2', oreType: 'iron_ore', x: 770, y: 220, concentrationPeak: 70, yieldRemaining: 100, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_3', oreType: 'iron_ore', x: 720, y: 290, concentrationPeak: 60, yieldRemaining: 80, sizeClass: 'small', isExhausted: false },
  // Two copper_ore deposits — further right
  { depositId: 'copper_1', oreType: 'copper_ore', x: 850, y: 160, concentrationPeak: 75, yieldRemaining: 90, sizeClass: 'medium', isExhausted: false },
  { depositId: 'copper_2', oreType: 'copper_ore', x: 880, y: 240, concentrationPeak: 65, yieldRemaining: 70, sizeClass: 'small', isExhausted: false },
  // One water deposit — top right
  { depositId: 'water_1', oreType: 'water', x: 790, y: 80, concentrationPeak: 90, yieldRemaining: 200, sizeClass: 'large', isExhausted: false },
];
