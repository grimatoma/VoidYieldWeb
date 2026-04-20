import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchLab } from '@entities/ResearchLab';
import { gameState } from '@services/GameState';

describe('ResearchLab', () => {
  let lab: ResearchLab;

  beforeEach(() => {
    lab = new ResearchLab(0, 0);
    gameState.reset();
  });

  it('has correct RP rate and cost constants', () => {
    expect(ResearchLab.RP_PER_MIN).toBe(1.0);
    expect(ResearchLab.COST_CR).toBe(1500);
    expect(ResearchLab.CRYSTAL_COST).toBe(30);
  });

  it('does not emit RP before 60 seconds', () => {
    const rpBefore = gameState.researchPoints;
    lab.update(30);
    expect(gameState.researchPoints).toBe(rpBefore);
  });

  it('emits 1 RP after 60 seconds', () => {
    const rpBefore = gameState.researchPoints;
    lab.update(61);
    expect(gameState.researchPoints).toBe(rpBefore + 1.0);
  });

  it('accumulates RP over multiple updates', () => {
    const rpBefore = gameState.researchPoints;
    lab.update(61);
    lab.update(61);
    expect(gameState.researchPoints).toBe(rpBefore + 2.0);
  });

  it('isNearby returns true within radius', () => {
    lab = new ResearchLab(0, 0);
    expect(lab.isNearby(30, 0)).toBe(true);
    expect(lab.isNearby(59, 0)).toBe(true);
    expect(lab.isNearby(61, 0)).toBe(false);
  });

  it('isNearby uses custom radius', () => {
    lab = new ResearchLab(0, 0);
    expect(lab.isNearby(100, 0, 150)).toBe(true);
    expect(lab.isNearby(160, 0, 150)).toBe(false);
  });

  it('has correct container position', () => {
    lab = new ResearchLab(100, 200);
    expect(lab.x).toBe(100);
    expect(lab.y).toBe(200);
    expect(lab.container.x).toBe(100);
    expect(lab.container.y).toBe(200);
  });

  it('container is a valid PixiJS Container', () => {
    expect(lab.container).toBeDefined();
    expect(lab.container.children.length).toBeGreaterThan(0);
  });
});
