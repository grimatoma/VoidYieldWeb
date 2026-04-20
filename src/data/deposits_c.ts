import type { DepositData } from './types';

export const DEPOSITS_C: DepositData[] = [
  // Void-Touched Ore (quality scrambled — wide OQ variance is intentional)
  { depositId: 'c-v1', oreType: 'void_touched_ore', x: 600,  y: 400,  concentrationPeak: 70, yieldRemaining: 800,  sizeClass: 'large',  isExhausted: false, qualityAttributes: { OQ: 820, ER: 750, MA: 300 } },
  { depositId: 'c-v2', oreType: 'void_touched_ore', x: 1200, y: 700,  concentrationPeak: 55, yieldRemaining: 600,  sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 180, ER: 900, MA: 850 } },
  { depositId: 'c-v3', oreType: 'void_touched_ore', x: 2000, y: 500,  concentrationPeak: 62, yieldRemaining: 700,  sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 960, ER: 420, MA: 190 } },
  { depositId: 'c-v4', oreType: 'void_touched_ore', x: 3000, y: 800,  concentrationPeak: 48, yieldRemaining: 500,  sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 350, ER: 680, MA: 920 } },
  { depositId: 'c-v5', oreType: 'void_touched_ore', x: 800,  y: 1600, concentrationPeak: 75, yieldRemaining: 900,  sizeClass: 'large',  isExhausted: false, qualityAttributes: { OQ: 740, ER: 810, MA: 560 } },
  { depositId: 'c-v6', oreType: 'void_touched_ore', x: 2500, y: 1800, concentrationPeak: 60, yieldRemaining: 650,  sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 120, ER: 950, MA: 700 } },
  { depositId: 'c-v7', oreType: 'void_touched_ore', x: 1500, y: 2200, concentrationPeak: 50, yieldRemaining: 550,  sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 880, ER: 340, MA: 440 } },
  { depositId: 'c-v8', oreType: 'void_touched_ore', x: 3500, y: 2400, concentrationPeak: 45, yieldRemaining: 400,  sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 500, ER: 770, MA: 660 } },
  // Resonance Crystals (fixed locations, finite)
  { depositId: 'c-r1', oreType: 'resonance_shards', x: 400,  y: 900,  concentrationPeak: 90, yieldRemaining: 120, sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 850, CR: 920, CD: 880 } },
  { depositId: 'c-r2', oreType: 'resonance_shards', x: 1800, y: 1200, concentrationPeak: 90, yieldRemaining: 100, sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 790, CR: 870, CD: 950 } },
  { depositId: 'c-r3', oreType: 'resonance_shards', x: 3200, y: 1500, concentrationPeak: 90, yieldRemaining: 140, sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 910, CR: 960, CD: 840 } },
  // Dark Gas geysers (burst collection — high PE)
  { depositId: 'c-g1', oreType: 'dark_gas', x: 700,  y: 300,  concentrationPeak: 80, yieldRemaining: 500, sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 600, PE: 940, FL: 700 } },
  { depositId: 'c-g2', oreType: 'dark_gas', x: 2200, y: 600,  concentrationPeak: 85, yieldRemaining: 500, sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 580, PE: 900, FL: 750 } },
  { depositId: 'c-g3', oreType: 'dark_gas', x: 3600, y: 1000, concentrationPeak: 78, yieldRemaining: 400, sizeClass: 'small',  isExhausted: false, qualityAttributes: { OQ: 550, PE: 860, FL: 680 } },
  // Ferrovoid (A3-adjacent ore, some deposits on Planet C)
  { depositId: 'c-f1', oreType: 'ferrovoid', x: 1000, y: 2600, concentrationPeak: 60, yieldRemaining: 600, sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 700, ER: 780, CD: 640, MA: 520 } },
  { depositId: 'c-f2', oreType: 'ferrovoid', x: 2800, y: 2700, concentrationPeak: 55, yieldRemaining: 500, sizeClass: 'medium', isExhausted: false, qualityAttributes: { OQ: 650, ER: 720, CD: 590, MA: 480 } },
];
