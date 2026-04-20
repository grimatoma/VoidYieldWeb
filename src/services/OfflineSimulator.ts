export interface OfflineEventEntry {
  timestamp: number;         // seconds elapsed in simulation
  type: 'mining' | 'factory' | 'logistics' | 'colony' | 'stall' | 'discovery';
  description: string;
  value?: number;            // credits gained, ore mined, etc.
}

export interface OfflineSimulationResult {
  durationSeconds: number;
  events: OfflineEventEntry[];
  totalCreditsGained: number;
  totalOreMined: Record<string, number>;
  stalledHarvesters: number;
  routesCompleted: number;
}

const MAX_OFFLINE_SECONDS = 8 * 3600;  // 8 hours
const STEP_SIZE = 30;                   // 30s per step

/**
 * Run offline simulation for the given number of seconds.
 * This is a simplified simulation — it calculates what "would have happened"
 * based on current game state without actually running the full scene update loop.
 */
export function simulateOffline(
  offlineSeconds: number,
  stockpile: Map<string, number>,
  harvesters: Array<{ oreType: string; unitsPerSec: number; hopperCapacity: number }>,
  routes: Array<{ cargoType: string; tripTimeSec: number; cargoQty: number }>,
): OfflineSimulationResult {
  const duration = Math.min(offlineSeconds, MAX_OFFLINE_SECONDS);
  const steps = Math.floor(duration / STEP_SIZE);
  const events: OfflineEventEntry[] = [];
  let totalCreditsGained = 0;
  const totalOreMined: Record<string, number> = {};
  let stalledHarvesters = 0;
  let routesCompleted = 0;

  // Simple ore accumulation simulation
  for (let step = 0; step < steps; step++) {
    const t = step * STEP_SIZE;

    // Simulate harvesters
    for (const h of harvesters) {
      const mined = h.unitsPerSec * STEP_SIZE;
      totalOreMined[h.oreType] = (totalOreMined[h.oreType] ?? 0) + mined;
      const current = stockpile.get(h.oreType) ?? 0;
      stockpile.set(h.oreType, current + mined);

      // Check stall (hopper overflow after 60 min)
      if (t > 3600 && step % 120 === 0) {
        stalledHarvesters++;
        events.push({
          timestamp: t,
          type: 'stall',
          description: `${h.oreType.replace(/_/g, ' ')} harvester hopper full — production paused`,
        });
      }
    }

    // Simulate trade route completions
    for (const r of routes) {
      if (t > 0 && t % r.tripTimeSec === 0) {
        routesCompleted++;
        const SELL_PRICES: Record<string, number> = {
          vorax: 1, krysite: 5, gas: 0, steel_bars: 5, alloy_rods: 15,
          void_cores: 60, ferrovoid: 12, warp_components: 50, resonance_shards: 15,
        };
        const price = SELL_PRICES[r.cargoType] ?? 1;
        const gained = r.cargoQty * price;
        totalCreditsGained += gained;
        events.push({
          timestamp: t,
          type: 'logistics',
          description: `Route delivered ${r.cargoQty} ${r.cargoType.replace(/_/g, ' ')} (+${gained} CR)`,
          value: gained,
        });
      }
    }
  }

  // Summary events
  if (Object.keys(totalOreMined).length > 0) {
    const oreList = Object.entries(totalOreMined)
      .map(([ore, qty]) => `${Math.floor(qty)} ${ore.replace(/_/g, ' ')}`)
      .join(', ');
    events.unshift({ timestamp: 0, type: 'mining', description: `Total mined: ${oreList}` });
  }

  return { durationSeconds: duration, events, totalCreditsGained, totalOreMined, stalledHarvesters, routesCompleted };
}
