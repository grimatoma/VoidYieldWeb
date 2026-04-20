import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { defaultSaveData } from '@services/SaveManager';

describe('GameState', () => {
  let gs: GameState;

  beforeEach(() => {
    gs = new GameState();
  });

  it('starts with 200 credits', () => {
    expect(gs.credits).toBe(200);
  });

  it('emits credits:changed on addCredits', () => {
    const cb = vi.fn();
    EventBus.on('credits:changed', cb);
    gs.addCredits(100);
    expect(gs.credits).toBe(300);
    expect(cb).toHaveBeenCalledWith(300);
    EventBus.off('credits:changed', cb);
  });

  it('credits cannot go below 0', () => {
    gs.addCredits(-9999);
    expect(gs.credits).toBe(0);
  });

  it('serializes and restores from save', () => {
    gs.addCredits(500);
    gs.addResearchPoints(42);
    const save = { ...defaultSaveData(), ...gs.serialize() };

    const gs2 = new GameState();
    gs2.applyFromSave(save);
    expect(gs2.credits).toBe(700);
    expect(gs2.researchPoints).toBe(42);
  });

  it('reset restores defaults', () => {
    gs.addCredits(10000);
    gs.reset();
    expect(gs.credits).toBe(200);
    expect(gs.researchPoints).toBe(0);
  });
});
