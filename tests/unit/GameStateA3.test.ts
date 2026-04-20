import { describe, it, expect, beforeEach } from 'vitest';
import { gameState } from '@services/GameState';

describe('GameState A3 unlock', () => {
  beforeEach(() => {
    // Reset relevant fields
    (gameState as any)._a2Visited = false;
    (gameState as any)._voidCoresProduced = 0;
    (gameState as any)._a3Unlocked = false;
  });

  it('starts with A3 locked', () => {
    expect(gameState.a3Unlocked).toBe(false);
  });

  it('visiting A2 alone does not unlock A3', () => {
    gameState.visitA2();
    expect(gameState.a3Unlocked).toBe(false);
  });

  it('producing 10 void cores alone does not unlock A3', () => {
    gameState.addVoidCoresProduced(10);
    expect(gameState.a3Unlocked).toBe(false);
  });

  it('visiting A2 AND 10 void cores unlocks A3', () => {
    gameState.visitA2();
    gameState.addVoidCoresProduced(10);
    expect(gameState.a3Unlocked).toBe(true);
  });

  it('partial void cores plus A2 visit does not unlock', () => {
    gameState.visitA2();
    gameState.addVoidCoresProduced(9);
    expect(gameState.a3Unlocked).toBe(false);
  });
});
