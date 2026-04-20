import { describe, it, expect } from 'vitest';
import { TECH_NODES } from '@data/tech_tree_nodes';

describe('TECH_NODES expanded', () => {
  it('has at least 40 nodes', () => {
    expect(TECH_NODES.length).toBeGreaterThanOrEqual(40);
  });

  it('all nodes have required fields', () => {
    for (const node of TECH_NODES) {
      expect(node.nodeId).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect([1, 2, 3]).toContain(node.branch);
      expect(typeof node.rpCost).toBe('number');
      expect(typeof node.crCost).toBe('number');
      expect(Array.isArray(node.prerequisites)).toBe(true);
    }
  });

  it('all prerequisites reference existing nodeIds', () => {
    const ids = new Set(TECH_NODES.map(n => n.nodeId));
    for (const node of TECH_NODES) {
      for (const prereq of node.prerequisites) {
        expect(ids.has(prereq), `${node.nodeId} prereq "${prereq}" not found`).toBe(true);
      }
    }
  });

  it('branch 1 has extraction nodes', () => {
    const b1 = TECH_NODES.filter(n => n.branch === 1);
    expect(b1.length).toBeGreaterThan(8);
  });

  it('branch 2 has processing nodes', () => {
    const b2 = TECH_NODES.filter(n => n.branch === 2);
    expect(b2.length).toBeGreaterThan(8);
  });

  it('branch 3 has expansion nodes', () => {
    const b3 = TECH_NODES.filter(n => n.branch === 3);
    expect(b3.length).toBeGreaterThan(8);
  });
});
