import { describe, it, expect, beforeEach } from 'vitest';
import { obstacleManager } from '@services/ObstacleManager';

describe('ObstacleManager', () => {
  beforeEach(() => {
    obstacleManager.clear();
  });

  it('returns not blocked when registry is empty', () => {
    expect(obstacleManager.isBlocked(0, 0, 10)).toBe(false);
    expect(obstacleManager.segmentBlocked(0, 0, 1000, 1000)).toBe(false);
  });

  it('isBlocked detects circle overlapping a wall', () => {
    obstacleManager.addWall({ x: 100, y: 100, w: 50, h: 50 });
    expect(obstacleManager.isBlocked(125, 125, 5)).toBe(true);
    expect(obstacleManager.isBlocked(200, 200, 5)).toBe(false);
  });

  it('isBlocked respects the collision radius against a wall edge', () => {
    obstacleManager.addWall({ x: 100, y: 100, w: 50, h: 50 });
    // Circle center at x=95, radius 10 — reaches wall edge (x=100). Touching,
    // but the check is strict (< r²), so not blocked.
    expect(obstacleManager.isBlocked(90, 125, 10)).toBe(false);
    expect(obstacleManager.isBlocked(95, 125, 10)).toBe(true);
  });

  it('segmentBlocked detects a line crossing a wall', () => {
    obstacleManager.addWall({ x: 100, y: 0, w: 10, h: 200 });
    expect(obstacleManager.segmentBlocked(0, 100, 200, 100)).toBe(true);
    // Segment that stays entirely on one side
    expect(obstacleManager.segmentBlocked(0, 100, 50, 100)).toBe(false);
    // Segment that passes above the wall
    expect(obstacleManager.segmentBlocked(0, -10, 200, -10)).toBe(false);
  });

  it('findPath returns direct target when unobstructed', () => {
    const hops = obstacleManager.findPath(0, 0, 100, 100);
    expect(hops).toEqual([{ x: 100, y: 100 }]);
  });

  it('findPath routes around a wall via registered waypoints', () => {
    // A vertical wall between source (0,100) and target (200,100)
    obstacleManager.addWall({ x: 90, y: 0, w: 20, h: 200 });
    // Add a waypoint above the wall so the path can go around
    obstacleManager.addWaypoint({ x: 100, y: -50 });

    const hops = obstacleManager.findPath(0, 100, 200, 100);
    // Must go via the waypoint, not direct
    expect(hops.length).toBeGreaterThanOrEqual(2);
    expect(hops[hops.length - 1]).toEqual({ x: 200, y: 100 });
    // Middle hop sits at the registered waypoint
    expect(hops[0]).toEqual({ x: 100, y: -50 });
  });

  it('findPath for the outpost compound routes a drone through the gate', () => {
    // Mirror the PlanetA1 compound setup: square walls with a south gate.
    const left = 1080;
    const right = 1720;
    const top = 730;
    const bottom = 1270;
    const thick = 14;
    const gateL = 1330;
    const gateR = 1470;
    obstacleManager.addWall({ x: left, y: top, w: right - left, h: thick });
    obstacleManager.addWall({ x: left, y: top, w: thick, h: bottom - top });
    obstacleManager.addWall({ x: right - thick, y: top, w: thick, h: bottom - top });
    obstacleManager.addWall({ x: left, y: bottom - thick, w: gateL - left, h: thick });
    obstacleManager.addWall({ x: gateR, y: bottom - thick, w: right - gateR, h: thick });
    obstacleManager.addWaypoint({ x: 1400, y: bottom + 30 });
    obstacleManager.addWaypoint({ x: left - 30, y: bottom + 30 });
    obstacleManager.addWaypoint({ x: right + 30, y: bottom + 30 });
    obstacleManager.addWaypoint({ x: left - 30, y: top - 30 });
    obstacleManager.addWaypoint({ x: right + 30, y: top - 30 });

    // Drone inside compound heading for a deposit to the west — direct path
    // crosses the left wall, so pathing must detour via the south gate.
    const hops = obstacleManager.findPath(1400, 1000, 300, 900);
    expect(hops.length).toBeGreaterThanOrEqual(2);
    expect(hops[hops.length - 1]).toEqual({ x: 300, y: 900 });
    // First hop should be the gate approach just outside the south wall.
    expect(hops[0].y).toBeGreaterThan(bottom);
  });

  it('clear resets walls and waypoints', () => {
    obstacleManager.addWall({ x: 0, y: 0, w: 10, h: 10 });
    obstacleManager.addWaypoint({ x: 100, y: 100 });
    obstacleManager.clear();
    expect(obstacleManager.getWalls().length).toBe(0);
    expect(obstacleManager.getWaypoints().length).toBe(0);
  });
});
