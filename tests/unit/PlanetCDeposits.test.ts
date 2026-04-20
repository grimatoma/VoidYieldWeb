import { describe, it, expect } from 'vitest';
import { DEPOSITS_C } from '@data/deposits_c';

describe('DEPOSITS_C', () => {
  it('has at least 15 deposits', () => {
    expect(DEPOSITS_C.length).toBeGreaterThanOrEqual(15);
  });

  it('includes void_touched_ore', () => {
    expect(DEPOSITS_C.some(d => d.oreType === 'void_touched_ore')).toBe(true);
  });

  it('includes resonance_shards', () => {
    expect(DEPOSITS_C.some(d => d.oreType === 'resonance_shards')).toBe(true);
  });

  it('includes dark_gas', () => {
    expect(DEPOSITS_C.some(d => d.oreType === 'dark_gas')).toBe(true);
  });

  it('void-touched ore has wide OQ variance (some low, some high)', () => {
    const vtOre = DEPOSITS_C.filter(d => d.oreType === 'void_touched_ore');
    const oqValues = vtOre.map(d => d.qualityAttributes?.OQ ?? 500);
    const min = Math.min(...oqValues);
    const max = Math.max(...oqValues);
    expect(max - min).toBeGreaterThan(500); // wide variance
  });
});
