import { describe, it, expect, beforeEach } from 'vitest';
import { strandingManager } from '@services/StrandingManager';

describe('StrandingManager', () => {
  beforeEach(() => strandingManager.reset());

  it('starts with 100 fuel and not stranded', () => {
    expect(strandingManager.rocketFuel).toBe(100);
    expect(strandingManager.isStranded).toBe(false);
  });

  it('arriveAtPlanetB sets fuel to 20 and strands player', () => {
    strandingManager.arriveAtPlanetB();
    expect(strandingManager.rocketFuel).toBe(20);
    expect(strandingManager.isStranded).toBe(true);
  });

  it('addFuel reduces stranding when fuel >= 100', () => {
    strandingManager.arriveAtPlanetB();
    strandingManager.addFuel(80);
    expect(strandingManager.rocketFuel).toBe(100);
    expect(strandingManager.isStranded).toBe(false);
    expect(strandingManager.canLaunch).toBe(true);
  });

  it('consumeFuelForLaunch returns false if not enough fuel', () => {
    strandingManager.arriveAtPlanetB();  // 20 RF
    expect(strandingManager.consumeFuelForLaunch(100)).toBe(false);
  });

  it('consumeFuelForLaunch succeeds with enough fuel', () => {
    expect(strandingManager.consumeFuelForLaunch(100)).toBe(true);
    expect(strandingManager.rocketFuel).toBe(0);
  });

  it('serialize/deserialize roundtrip', () => {
    strandingManager.arriveAtPlanetB();
    strandingManager.addFuel(30);
    const data = strandingManager.serialize();
    strandingManager.reset();
    strandingManager.deserialize(data);
    expect(strandingManager.rocketFuel).toBe(50);
    expect(strandingManager.isStranded).toBe(true);
  });
});
