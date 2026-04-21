/**
 * Scene-scoped registry of axis-aligned wall colliders and navigation
 * waypoints. Walls block straight-line movement; waypoints are intermediate
 * nav nodes (gate approaches, detour corners) used by pathfinding to route
 * around walls.
 *
 * Gates are represented as gaps in the registered wall set (no special gate
 * object), plus one or more waypoints just outside each gate so drones can
 * path through them.
 *
 * Only PlanetA1Scene currently registers walls; other scenes leave the
 * registry empty, in which case every movement and path is unobstructed.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface ObstacleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

class ObstacleManager {
  private walls: ObstacleRect[] = [];
  private waypoints: Vec2[] = [];

  clear(): void {
    this.walls = [];
    this.waypoints = [];
  }

  addWall(r: ObstacleRect): void {
    this.walls.push(r);
  }

  addWaypoint(p: Vec2): void {
    this.waypoints.push({ x: p.x, y: p.y });
  }

  getWalls(): readonly ObstacleRect[] {
    return this.walls;
  }

  getWaypoints(): readonly Vec2[] {
    return this.waypoints;
  }

  /** True if a circle (cx, cy, radius) overlaps any registered wall. */
  isBlocked(cx: number, cy: number, radius: number): boolean {
    for (const w of this.walls) {
      if (circleRectIntersect(cx, cy, radius, w)) return true;
    }
    return false;
  }

  /** True if the straight segment A→B crosses any registered wall. */
  segmentBlocked(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const w of this.walls) {
      if (segmentRectIntersect(x1, y1, x2, y2, w)) return true;
    }
    return false;
  }

  /**
   * Pathfind from (fx, fy) to (tx, ty) via registered waypoints using a
   * visibility-graph Dijkstra. Returns the sequence of hops ending at the
   * target (the starting point is excluded). If the direct path is clear,
   * returns `[{x: tx, y: ty}]`. If no path exists, returns the direct target
   * so the caller still has something to aim at.
   */
  findPath(fx: number, fy: number, tx: number, ty: number): Vec2[] {
    if (!this.segmentBlocked(fx, fy, tx, ty)) {
      return [{ x: tx, y: ty }];
    }

    const nodes: Vec2[] = [
      { x: fx, y: fy },
      ...this.waypoints.map(w => ({ x: w.x, y: w.y })),
      { x: tx, y: ty },
    ];
    const N = nodes.length;
    const SRC = 0;
    const DST = N - 1;

    const adj: Array<Array<{ to: number; cost: number }>> = [];
    for (let i = 0; i < N; i++) adj.push([]);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (!this.segmentBlocked(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const cost = Math.sqrt(dx * dx + dy * dy);
          adj[i].push({ to: j, cost });
          adj[j].push({ to: i, cost });
        }
      }
    }

    const dist = new Array<number>(N).fill(Infinity);
    const prev = new Array<number>(N).fill(-1);
    const visited = new Array<boolean>(N).fill(false);
    dist[SRC] = 0;
    for (let iter = 0; iter < N; iter++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < N; i++) {
        if (!visited[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1) break;
      visited[u] = true;
      for (const e of adj[u]) {
        const nd = dist[u] + e.cost;
        if (nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = u;
        }
      }
    }

    if (dist[DST] === Infinity) {
      return [{ x: tx, y: ty }];
    }

    const hops: Vec2[] = [];
    let cur = DST;
    while (prev[cur] !== -1) {
      hops.push(nodes[cur]);
      cur = prev[cur];
    }
    hops.reverse();
    return hops;
  }
}

function circleRectIntersect(cx: number, cy: number, r: number, rect: ObstacleRect): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function segmentRectIntersect(
  x1: number, y1: number, x2: number, y2: number, rect: ObstacleRect,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;

  for (let axis = 0; axis < 2; axis++) {
    const origin = axis === 0 ? x1 : y1;
    const dir = axis === 0 ? dx : dy;
    const lo = axis === 0 ? rect.x : rect.y;
    const hi = axis === 0 ? rect.x + rect.w : rect.y + rect.h;

    if (Math.abs(dir) < 1e-9) {
      if (origin < lo || origin > hi) return false;
    } else {
      let t1 = (lo - origin) / dir;
      let t2 = (hi - origin) / dir;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return false;
    }
  }

  return tmin < 1 && tmax > 0;
}

export const obstacleManager = new ObstacleManager();
