import { describe, it, expect, beforeEach } from 'vitest';
import { RoadNetwork } from '../../src/services/RoadNetwork';

describe('RoadNetwork', () => {
  let net: RoadNetwork;

  beforeEach(() => {
    net = new RoadNetwork();
  });

  it('starts empty', () => {
    expect(net.getAll()).toHaveLength(0);
  });

  it('adds a road tile', () => {
    net.add(2, 3);
    expect(net.hasRoad(2, 3)).toBe(true);
  });

  it('has no road at unset cell', () => {
    expect(net.hasRoad(0, 0)).toBe(false);
  });

  it('removes a road tile and returns true', () => {
    net.add(1, 1);
    const removed = net.remove(1, 1);
    expect(removed).toBe(true);
    expect(net.hasRoad(1, 1)).toBe(false);
  });

  it('returns false when removing a non-existent tile', () => {
    expect(net.remove(9, 9)).toBe(false);
  });

  it('getAll returns all added tiles', () => {
    net.add(0, 0);
    net.add(1, 2);
    net.add(3, 4);
    const all = net.getAll();
    expect(all).toHaveLength(3);
    expect(all).toContainEqual({ row: 0, col: 0 });
    expect(all).toContainEqual({ row: 1, col: 2 });
    expect(all).toContainEqual({ row: 3, col: 4 });
  });

  it('deduplicates add calls', () => {
    net.add(2, 2);
    net.add(2, 2);
    expect(net.getAll()).toHaveLength(1);
  });

  it('clear removes all tiles', () => {
    net.add(0, 0);
    net.add(1, 1);
    net.clear();
    expect(net.getAll()).toHaveLength(0);
  });

  it('serialize returns array of string keys', () => {
    net.add(1, 3);
    net.add(4, 2);
    const data = net.serialize();
    expect(data).toContain('1,3');
    expect(data).toContain('4,2');
    expect(data).toHaveLength(2);
  });

  it('deserialize restores road state', () => {
    net.deserialize(['0,1', '2,4']);
    expect(net.hasRoad(0, 1)).toBe(true);
    expect(net.hasRoad(2, 4)).toBe(true);
    expect(net.getAll()).toHaveLength(2);
  });

  it('deserialize replaces existing state', () => {
    net.add(9, 9);
    net.deserialize(['1,1']);
    expect(net.hasRoad(9, 9)).toBe(false);
    expect(net.hasRoad(1, 1)).toBe(true);
  });
});
