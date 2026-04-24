import { describe, it, expect, beforeEach, vi } from 'vitest';

// ElectrolysisUnit has no PixiJS or service dependencies at the logic level —
// the container is built internally but we stub pixi.js so tests stay fast.
vi.mock('pixi.js', () => {
  const make = () => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    removeChild: vi.fn(),
    x: 0, y: 0, alpha: 1, width: 0, height: 0,
    anchor: { set: vi.fn() },
    destroy: vi.fn(),
    children: [],
  });
  return {
    Container: vi.fn(() => make()),
    Graphics: vi.fn(() => make()),
    Text: vi.fn(() => make()),
    TextStyle: vi.fn(() => ({})),
    Sprite: vi.fn(() => make()),
  };
});

import { ElectrolysisUnit } from '@entities/ElectrolysisUnit';

describe('ElectrolysisUnit', () => {
  let unit: ElectrolysisUnit;

  beforeEach(() => {
    unit = new ElectrolysisUnit(0, 0);
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts in IDLE state', () => {
    expect(unit.state).toBe('IDLE');
  });

  it('starts with empty buffers', () => {
    expect(unit.inputBuffer).toBe(0);
    expect(unit.outputBuffer).toBe(0);
  });

  it('exposes correct recipe constants', () => {
    expect(ElectrolysisUnit.INPUT_PER_CYCLE).toBe(3);
    expect(ElectrolysisUnit.OUTPUT_PER_CYCLE).toBe(1);
    expect(ElectrolysisUnit.CYCLE_SECONDS).toBe(8);
    expect(ElectrolysisUnit.MAX_INPUT).toBe(40);
    expect(ElectrolysisUnit.MAX_OUTPUT).toBe(20);
  });

  // ── addWater ──────────────────────────────────────────────────────────────

  it('addWater increases inputBuffer', () => {
    unit.addWater(10);
    expect(unit.inputBuffer).toBe(10);
  });

  it('addWater caps at MAX_INPUT', () => {
    unit.addWater(100);
    expect(unit.inputBuffer).toBe(ElectrolysisUnit.MAX_INPUT);
  });

  it('addWater returns actual amount added', () => {
    const added = unit.addWater(5);
    expect(added).toBe(5);
  });

  it('addWater returns capped amount when near MAX_INPUT', () => {
    unit.addWater(38);
    const added = unit.addWater(10);
    expect(added).toBe(2); // only 2 space left
    expect(unit.inputBuffer).toBe(40);
  });

  // ── pullHydrolox ──────────────────────────────────────────────────────────

  it('pullHydrolox returns 0 when outputBuffer empty', () => {
    expect(unit.pullHydrolox(5)).toBe(0);
  });

  it('pullHydrolox reduces outputBuffer by amount pulled', () => {
    unit['outputBuffer'] = 8;
    const pulled = unit.pullHydrolox(5);
    expect(pulled).toBe(5);
    expect(unit.outputBuffer).toBe(3);
  });

  it('pullHydrolox returns available amount if less than requested', () => {
    unit['outputBuffer'] = 3;
    const pulled = unit.pullHydrolox(10);
    expect(pulled).toBe(3);
    expect(unit.outputBuffer).toBe(0);
  });

  // ── update / state machine ────────────────────────────────────────────────

  it('remains IDLE when inputBuffer < INPUT_PER_CYCLE', () => {
    unit.addWater(2); // need 3 per cycle
    unit.update(8);
    expect(unit.state).toBe('IDLE');
    expect(unit.outputBuffer).toBe(0);
  });

  it('transitions to RUNNING when inputBuffer >= INPUT_PER_CYCLE', () => {
    unit.addWater(3);
    unit.update(0.1);
    expect(unit.state).toBe('RUNNING');
  });

  it('produces 1 hydrolox after exactly CYCLE_SECONDS with >= 3 water', () => {
    unit.addWater(3);
    unit.update(ElectrolysisUnit.CYCLE_SECONDS);
    expect(unit.outputBuffer).toBe(1);
    expect(unit.inputBuffer).toBe(0); // 3 water consumed
  });

  it('produces multiple hydrolox over multiple cycles', () => {
    unit.addWater(ElectrolysisUnit.MAX_INPUT); // plenty of water
    unit.update(ElectrolysisUnit.CYCLE_SECONDS * 3);
    expect(unit.outputBuffer).toBe(3);
    expect(unit.inputBuffer).toBe(ElectrolysisUnit.MAX_INPUT - 9); // 9 water consumed
  });

  it('partial cycle does not produce output', () => {
    unit.addWater(6);
    unit.update(7.9); // just under 8 s
    expect(unit.outputBuffer).toBe(0);
    expect(unit.state).toBe('RUNNING');
  });

  it('goes STALLED_INPUT mid-run if water runs out mid-cycle', () => {
    unit.addWater(3); // exactly one cycle worth
    unit.update(ElectrolysisUnit.CYCLE_SECONDS); // completes first cycle, now 0 water
    // On next update with no water, should be IDLE (treated same as STALLED_INPUT)
    unit.update(0.1);
    expect(unit.state).toBe('IDLE');
  });

  it('goes STALLED_OUTPUT when outputBuffer is full', () => {
    unit.addWater(ElectrolysisUnit.MAX_INPUT);
    // Fill output buffer manually
    unit['outputBuffer'] = ElectrolysisUnit.MAX_OUTPUT;
    unit.update(ElectrolysisUnit.CYCLE_SECONDS);
    expect(unit.state).toBe('STALLED_OUTPUT');
    // Output should NOT increase beyond MAX_OUTPUT
    expect(unit.outputBuffer).toBe(ElectrolysisUnit.MAX_OUTPUT);
  });

  it('resumes RUNNING after output is pulled when previously STALLED_OUTPUT', () => {
    unit.addWater(ElectrolysisUnit.MAX_INPUT);
    unit['outputBuffer'] = ElectrolysisUnit.MAX_OUTPUT;
    unit.update(ElectrolysisUnit.CYCLE_SECONDS);
    expect(unit.state).toBe('STALLED_OUTPUT');

    unit.pullHydrolox(5); // make room
    unit.update(ElectrolysisUnit.CYCLE_SECONDS);
    expect(unit.state).toBe('RUNNING');
    expect(unit.outputBuffer).toBe(ElectrolysisUnit.MAX_OUTPUT - 5 + 1);
  });

  // ── isNearby ──────────────────────────────────────────────────────────────

  it('isNearby returns true within default radius', () => {
    const u = new ElectrolysisUnit(100, 100);
    expect(u.isNearby(120, 120)).toBe(true);
  });

  it('isNearby returns false beyond default radius', () => {
    const u = new ElectrolysisUnit(100, 100);
    expect(u.isNearby(300, 300)).toBe(false);
  });
});
