import type { DepositData } from '@data/types';

// Grid right edge: x=700 (GRID_ORIGIN.x=260 + 5 cols × 88px).
// Deposits are spread to the right, starting ~160px clear of the grid edge.
export const OUTPOST_DEPOSITS: DepositData[] = [
  // Iron ore cluster — east of the build grid
  { depositId: 'iron_1', oreType: 'iron_ore', x: 870, y: 155, concentrationPeak: 80, yieldRemaining: 120, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_2', oreType: 'iron_ore', x: 920, y: 255, concentrationPeak: 70, yieldRemaining: 100, sizeClass: 'medium', isExhausted: false },
  { depositId: 'iron_3', oreType: 'iron_ore', x: 860, y: 350, concentrationPeak: 60, yieldRemaining:  80, sizeClass: 'small',  isExhausted: false },
  // Copper ore cluster — further east
  { depositId: 'copper_1', oreType: 'copper_ore', x: 1060, y: 165, concentrationPeak: 75, yieldRemaining: 90, sizeClass: 'medium', isExhausted: false },
  { depositId: 'copper_2', oreType: 'copper_ore', x: 1080, y: 270, concentrationPeak: 65, yieldRemaining: 70, sizeClass: 'small',  isExhausted: false },
  // Water spring — north-east corner
  { depositId: 'water_1', oreType: 'water', x: 970, y:  85, concentrationPeak: 90, yieldRemaining: 200, sizeClass: 'large', isExhausted: false },
];
