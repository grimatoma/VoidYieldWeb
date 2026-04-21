// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@data/tech_tree_nodes', () => ({
  TECH_NODES: [
    {
      nodeId: 'test_node_1',
      name: 'Test Node 1',
      description: 'A test node',
      branch: 1,
      rpCost: 100,
      crCost: 50,
      prerequisites: [],
      effectType: 'test',
      effectValue: 0.1,
    },
    {
      nodeId: 'test_node_2',
      name: 'Test Node 2',
      description: 'Another test node',
      branch: 2,
      rpCost: 200,
      crCost: 75,
      prerequisites: [],
      effectType: 'test',
      effectValue: 0.2,
    },
    {
      nodeId: 'test_node_3',
      name: 'Test Node 3',
      description: 'Third test node',
      branch: 3,
      rpCost: 150,
      crCost: 100,
      prerequisites: [],
      effectType: 'test',
      effectValue: 0.15,
    },
  ],
}));

vi.mock('@services/TechTree', () => ({
  techTree: {
    isUnlocked: vi.fn(() => false),
    canUnlock: vi.fn(() => false),
    unlock: vi.fn(),
    getAllNodes: vi.fn(() => []),
    getTotalEffect: vi.fn(() => 0),
    getMaxEffect: vi.fn(() => 0),
    getMultiplierEffect: vi.fn(() => 1),
    purchaseCount: vi.fn(() => 0),
  },
}));

vi.mock('@services/GameState', () => ({
  gameState: {
    hasUnlock: vi.fn(() => false),
    researchPoints: 0,
    credits: 0,
  },
}));

import { TechTreePanel } from '@ui/TechTreePanel';

describe('TechTreePanel (HTML)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts hidden', () => {
    const panel = new TechTreePanel();
    panel.mount(document.body);
    expect(panel.visible).toBe(false);
    expect(document.querySelector<HTMLElement>('.tech-panel-root')!.style.display).toBe('none');
  });

  it('toggle shows panel', () => {
    const panel = new TechTreePanel();
    panel.mount(document.body);
    panel.toggle();
    expect(panel.visible).toBe(true);
    expect(document.querySelector<HTMLElement>('.tech-panel-root')!.style.display).toBe('block');
  });

  it('toggle twice hides panel', () => {
    const panel = new TechTreePanel();
    panel.mount(document.body);
    panel.toggle();
    panel.toggle();
    expect(panel.visible).toBe(false);
  });

  it('renders a node per tech definition when opened', () => {
    const panel = new TechTreePanel();
    panel.mount(document.body);
    panel.toggle();
    expect(document.querySelectorAll('.tech-node').length).toBe(3);
  });
});
