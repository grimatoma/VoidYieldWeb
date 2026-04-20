import type { DepositData } from './types';

/** Planet A3 (Void Nexus) deposits — 20 deposits, highest quality caps, wide variance */
export const DEPOSITS_A3: DepositData[] = [
  // Ferrovoid deposits (A3-exclusive primary ore)
  { depositId: 'a3-d1', oreType: 'ferrovoid', x: 400, y: 300, concentrationPeak: 90, yieldRemaining: 180, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 850, CR: 700, DR: 800, FL: 750, ER: 900, PE: 600 } },
  { depositId: 'a3-d2', oreType: 'ferrovoid', x: 800, y: 500, concentrationPeak: 85, yieldRemaining: 200, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 920, CR: 650, CD: 750, DR: 850, ER: 950 } },
  { depositId: 'a3-d3', oreType: 'ferrovoid', x: 1200, y: 700, concentrationPeak: 80, yieldRemaining: 160, sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 780, CR: 600, FL: 820, ER: 880, MA: 500 } },
  { depositId: 'a3-d4', oreType: 'ferrovoid', x: 600, y: 900, concentrationPeak: 95, yieldRemaining: 220, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 960, CR: 800, CD: 900, ER: 970, FL: 700 } },

  // Aethite deposits (high HR + SR)
  { depositId: 'a3-d5', oreType: 'aethite', x: 1600, y: 300, concentrationPeak: 70, yieldRemaining: 120, sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 800, HR: 850, SR: 900, PE: 700, UT: 600 } },
  { depositId: 'a3-d6', oreType: 'aethite', x: 2000, y: 500, concentrationPeak: 75, yieldRemaining: 100, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 880, HR: 920, SR: 850, MA: 600 } },

  // Void Cores deposits (rare, very high OQ)
  { depositId: 'a3-d7', oreType: 'void_cores', x: 2400, y: 400, concentrationPeak: 40, yieldRemaining: 30, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 980, CR: 900, CD: 950, DR: 800, ER: 990 } },
  { depositId: 'a3-d8', oreType: 'void_cores', x: 3000, y: 600, concentrationPeak: 35, yieldRemaining: 25, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 970, CR: 880, FL: 750, ER: 980, PE: 850 } },

  // Krysite deposits (high CD + MA)
  { depositId: 'a3-d9', oreType: 'krysite', x: 300, y: 1400, concentrationPeak: 78, yieldRemaining: 150, sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 820, CD: 900, MA: 850, PE: 700, SR: 600 } },
  { depositId: 'a3-d10', oreType: 'krysite', x: 900, y: 1600, concentrationPeak: 72, yieldRemaining: 130, sizeClass: 'medium', isExhausted: false,
    qualityAttributes: { OQ: 760, CD: 860, MA: 800, DR: 550 } },

  // Vorax deposits (foundation ore, high FL + DR)
  { depositId: 'a3-d11', oreType: 'vorax', x: 1400, y: 1200, concentrationPeak: 88, yieldRemaining: 250, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 720, FL: 880, DR: 900, UT: 700, PE: 650 } },
  { depositId: 'a3-d12', oreType: 'vorax', x: 2000, y: 1400, concentrationPeak: 82, yieldRemaining: 200, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 680, FL: 820, DR: 850, ER: 500 } },

  // Gas deposits (high PE + ER — Void Gas)
  { depositId: 'a3-d13', oreType: 'gas', x: 2600, y: 1200, concentrationPeak: 92, yieldRemaining: 300, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 840, PE: 900, ER: 880, FL: 750 } },
  { depositId: 'a3-d14', oreType: 'gas', x: 3200, y: 1000, concentrationPeak: 88, yieldRemaining: 280, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 800, PE: 860, ER: 840, MA: 500 } },

  // Warp Components deposits (rare manufactured-grade ore)
  { depositId: 'a3-d15', oreType: 'warp_components', x: 1800, y: 1800, concentrationPeak: 30, yieldRemaining: 15, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 990, CR: 950, CD: 970, ER: 990, FL: 900, DR: 880 } },

  // Resonance Shards (A3 variant — very high SR + MA)
  { depositId: 'a3-d16', oreType: 'resonance_shards', x: 2800, y: 1600, concentrationPeak: 55, yieldRemaining: 50, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 900, SR: 950, MA: 900, PE: 800 } },
  { depositId: 'a3-d17', oreType: 'resonance_shards', x: 3400, y: 1800, concentrationPeak: 50, yieldRemaining: 45, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 880, SR: 920, MA: 880, ER: 750 } },

  // Ferrovoid deep seam deposits (deeper, higher risk/reward)
  { depositId: 'a3-d18', oreType: 'ferrovoid', x: 1000, y: 2200, concentrationPeak: 60, yieldRemaining: 300, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 700, CR: 500, DR: 600, FL: 900, ER: 800 } },
  { depositId: 'a3-d19', oreType: 'ferrovoid', x: 2200, y: 2400, concentrationPeak: 65, yieldRemaining: 280, sizeClass: 'large', isExhausted: false,
    qualityAttributes: { OQ: 980, CR: 750, CD: 800, ER: 960, DR: 700 } },
  { depositId: 'a3-d20', oreType: 'void_cores', x: 3600, y: 2200, concentrationPeak: 25, yieldRemaining: 20, sizeClass: 'small', isExhausted: false,
    qualityAttributes: { OQ: 995, CR: 990, CD: 990, DR: 990, FL: 980, HR: 970, MA: 960, PE: 950, SR: 980, UT: 970, ER: 990 } },
];
