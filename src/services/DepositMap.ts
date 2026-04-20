import { Deposit } from '@entities/Deposit';
import type { Container } from 'pixi.js';
import type { DepositData, WaypointData } from '@data/types';

export class DepositMap {
  private deposits = new Map<string, Deposit>();
  private waypoints = new Map<string, WaypointData>();

  /** Instantiate deposits and add their containers to the given world container. */
  loadPlanet(depositDataArray: DepositData[], worldContainer: Container): void {
    // Clear previous
    for (const d of this.deposits.values()) worldContainer.removeChild(d.container);
    this.deposits.clear();
    this.waypoints.clear();
    for (const data of depositDataArray) {
      const dep = new Deposit(data);
      this.deposits.set(data.depositId, dep);
      worldContainer.addChild(dep.container);
    }
  }

  getDeposit(id: string): Deposit | undefined {
    return this.deposits.get(id);
  }

  /** Returns the nearest non-exhausted deposit within `radius` px of (x, y), or null. */
  getNearestDeposit(x: number, y: number, radius: number): Deposit | null {
    let nearest: Deposit | null = null;
    let bestDist = radius;
    for (const dep of this.deposits.values()) {
      if (dep.data.isExhausted) continue;
      const dx = dep.data.x - x;
      const dy = dep.data.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; nearest = dep; }
    }
    return nearest;
  }

  addWaypoint(wp: WaypointData): void {
    this.waypoints.set(wp.depositId, wp);
  }

  getWaypoint(depositId: string): WaypointData | undefined {
    return this.waypoints.get(depositId);
  }

  getAllWaypoints(): WaypointData[] {
    return Array.from(this.waypoints.values());
  }

  serializeDeposits(): DepositData[] {
    return Array.from(this.deposits.values()).map(d => d.serialize());
  }

  serializeWaypoints(): WaypointData[] {
    return this.getAllWaypoints();
  }
}

export const depositMap = new DepositMap();
