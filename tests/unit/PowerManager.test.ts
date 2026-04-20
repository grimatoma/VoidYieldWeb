import { describe, it, expect, beforeEach } from 'vitest';
import { PowerManager } from '@services/PowerManager';

describe('PowerManager', () => {
  let pm: PowerManager;
  beforeEach(() => { pm = new PowerManager(); });

  it('starts at 0 balance, throttle=1 (no consumers)', () => {
    expect(pm.balance).toBe(0);
    expect(pm.throttleMultiplier).toBe(1.0);
  });

  it('balance = generation - consumption', () => {
    pm.registerGenerator(4);
    pm.registerConsumer(3);
    expect(pm.balance).toBe(1);
  });

  it('throttle=1.0 when balance >= 0', () => {
    pm.registerGenerator(5);
    pm.registerConsumer(3);
    expect(pm.throttleMultiplier).toBe(1.0);
  });

  it('throttle=0.5 when balance negative', () => {
    pm.registerGenerator(2);
    pm.registerConsumer(6);
    expect(pm.throttleMultiplier).toBe(0.5);
  });

  it('throttle=0 when no generation but consumers exist', () => {
    pm.registerConsumer(3);
    expect(pm.throttleMultiplier).toBe(0);
  });

  it('unregister reduces totals', () => {
    pm.registerGenerator(4);
    pm.unregisterGenerator(2);
    expect(pm.balance).toBe(2);
  });
});
