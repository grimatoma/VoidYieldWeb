import { describe, it, expect, beforeEach } from 'vitest';
import { TechTree } from '@services/TechTree';
import { gameState } from '@services/GameState';

describe('TechTree', () => {
  let tt: TechTree;

  beforeEach(() => {
    tt = new TechTree();
    gameState.reset();
    gameState.addCredits(500);
    gameState.addResearchPoints(200);
  });

  it('getAllNodes returns all tech nodes', () => {
    expect(tt.getAllNodes().length).toBeGreaterThan(0);
  });

  it('canUnlock free node with enough CR', () => {
    expect(tt.canUnlock('drill_bit_mk2')).toBe(true);
  });

  it('unlock deducts CR and adds unlock', () => {
    const creditsBefore = gameState.credits;
    expect(tt.unlock('drill_bit_mk2')).toBe(true);
    expect(gameState.credits).toBe(creditsBefore - 50);
    expect(gameState.hasUnlock('drill_bit_mk2')).toBe(true);
  });

  it('cannot unlock when prerequisites not met', () => {
    expect(tt.canUnlock('heavy_drone_unlock')).toBe(false);
  });

  it('getTotalEffect sums unlocked nodes', () => {
    tt.unlock('drill_bit_mk2');
    expect(tt.getTotalEffect('mine_speed')).toBeGreaterThan(0);
  });

  it('canUnlock RP node when enough RP', () => {
    expect(tt.canUnlock('improved_drill')).toBe(true);  // 200 RP, costs 50
  });

  it('maxPurchases: cargo_pockets can be bought up to 3 times', () => {
    gameState.addCredits(500);
    tt.unlock('cargo_pockets_1');
    tt.unlock('cargo_pockets_1');
    tt.unlock('cargo_pockets_1');
    expect(tt.canUnlock('cargo_pockets_1')).toBe(false);
  });

  it('isUnlocked returns true after unlock', () => {
    expect(tt.isUnlocked('drill_bit_mk2')).toBe(false);
    tt.unlock('drill_bit_mk2');
    expect(tt.isUnlocked('drill_bit_mk2')).toBe(true);
  });

  it('getNode returns correct node', () => {
    const node = tt.getNode('drill_bit_mk2');
    expect(node).toBeDefined();
    expect(node?.name).toBe('Drill Bit Mk.II');
  });

  it('purchaseCount tracks multi-purchase nodes', () => {
    gameState.addCredits(500);
    expect(tt.purchaseCount('cargo_pockets_1')).toBe(0);
    tt.unlock('cargo_pockets_1');
    expect(tt.purchaseCount('cargo_pockets_1')).toBe(1);
    tt.unlock('cargo_pockets_1');
    expect(tt.purchaseCount('cargo_pockets_1')).toBe(2);
  });

  it('cannot unlock with insufficient credits', () => {
    gameState.setCredits(10);
    expect(tt.canUnlock('drill_bit_mk2')).toBe(false);
  });

  it('cannot unlock with insufficient RP', () => {
    gameState.addResearchPoints(-200);
    expect(tt.canUnlock('improved_drill')).toBe(false);
  });
});
