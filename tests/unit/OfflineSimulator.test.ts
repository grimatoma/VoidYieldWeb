import { describe, it, expect } from 'vitest';
import { simulateOffline } from '@services/OfflineSimulator';

describe('simulateOffline', () => {
  it('returns 0 credits for empty simulation', () => {
    const result = simulateOffline(0, new Map(), [], []);
    expect(result.totalCreditsGained).toBe(0);
    expect(result.events.length).toBe(0);
  });

  it('caps simulation at 8 hours', () => {
    const result = simulateOffline(100_000, new Map(), [], []);
    expect(result.durationSeconds).toBe(8 * 3600);
  });

  it('simulates ore mining correctly', () => {
    const stockpile = new Map<string, number>();
    const harvesters = [{ oreType: 'vorax', unitsPerSec: 10, hopperCapacity: 1000 }];
    const result = simulateOffline(60, stockpile, harvesters, []);
    // 60s / 30s steps = 2 steps × 10 units/s × 30s = 600 units
    expect(result.totalOreMined['vorax']).toBeCloseTo(600, 0);
  });

  it('simulates trade route completions', () => {
    const routes = [{ cargoType: 'krysite', tripTimeSec: 60, cargoQty: 100 }];
    // 300s / 60s = 5 route completions; krysite = 5 CR each → 500 CR × 5 = 2500 CR
    const result = simulateOffline(300, new Map(), [], routes);
    expect(result.routesCompleted).toBeGreaterThan(0);
    expect(result.totalCreditsGained).toBeGreaterThan(0);
  });

  it('returns correct duration', () => {
    const result = simulateOffline(3600, new Map(), [], []);
    expect(result.durationSeconds).toBe(3600);
  });

  it('returns stalledHarvesters count', () => {
    const result = simulateOffline(3601, new Map(), [{ oreType: 'vorax', unitsPerSec: 1, hopperCapacity: 100 }], []);
    expect(typeof result.stalledHarvesters).toBe('number');
  });
});
