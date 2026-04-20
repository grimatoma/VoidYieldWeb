import type { TradeRoute, OreType } from '@data/types';
import { EventBus } from './EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

// Planet storage depots registry — scenes register their depot here
const _planetDepots = new Map<string, StorageDepot>();

class LogisticsManager {
  private _routes: TradeRoute[] = [];
  private _nextRouteId = 1;

  /** Scenes call this on enter to register their storage depot. */
  registerPlanet(planetId: string, depot: StorageDepot): void {
    _planetDepots.set(planetId, depot);
  }

  unregisterPlanet(planetId: string): void {
    _planetDepots.delete(planetId);
  }

  /** Create a new manual trade route. */
  addRoute(params: {
    sourcePlanet: string;
    destPlanet: string;
    cargoType: OreType;
    cargoQty: number;
    cargoClass: 'bulk' | 'refined' | 'components';
    tripTimeSec?: number;
  }): TradeRoute {
    const route: TradeRoute = {
      routeId: `route-${this._nextRouteId++}`,
      sourcePlanet: params.sourcePlanet,
      destPlanet: params.destPlanet,
      cargoType: params.cargoType,
      cargoQty: params.cargoQty,
      cargoClass: params.cargoClass,
      status: 'IDLE',
      tripTimeSec: params.tripTimeSec ?? 180, // 3 min default
      tripsCompleted: 0,
      elapsedSec: 0,
      autoDispatch: false,
    };
    this._routes.push(route);
    return route;
  }

  removeRoute(routeId: string): void {
    this._routes = this._routes.filter(r => r.routeId !== routeId);
  }

  /** Manually dispatch a route. Pulls cargo from source depot and starts transit. */
  dispatch(routeId: string): boolean {
    const route = this._routes.find(r => r.routeId === routeId);
    if (!route || route.status !== 'IDLE') return false;

    const srcDepot = _planetDepots.get(route.sourcePlanet);
    if (!srcDepot) return false;

    const pulled = srcDepot.pull(route.cargoType, route.cargoQty);
    if (pulled === 0) {
      route.status = 'STALLED';
      return false;
    }

    // Store actual cargo on route (may be partial)
    (route as any)._cargoLoaded = pulled;
    route.status = 'IN_TRANSIT';
    route.elapsedSec = 0;
    return true;
  }

  /** Update all active routes. delta = seconds. */
  update(delta: number): void {
    for (const route of this._routes) {
      if (route.status !== 'IN_TRANSIT') continue;
      route.elapsedSec += delta;
      if (route.elapsedSec >= route.tripTimeSec) {
        this._deliver(route);
      }
    }
  }

  private _deliver(route: TradeRoute): void {
    const destDepot = _planetDepots.get(route.destPlanet);
    const loaded = (route as any)._cargoLoaded ?? route.cargoQty;
    if (destDepot) {
      destDepot.deposit([{ oreType: route.cargoType, quantity: loaded, attributes: {} }]);
    }
    route.tripsCompleted++;
    route.elapsedSec = 0;
    route.status = 'IDLE';
    EventBus.emit('inventory:changed');
  }

  getRoutes(): readonly TradeRoute[] { return this._routes; }

  getRoute(routeId: string): TradeRoute | undefined {
    return this._routes.find(r => r.routeId === routeId);
  }

  reset(): void {
    this._routes = [];
    this._nextRouteId = 1;
    _planetDepots.clear();
  }
}

export const logisticsManager = new LogisticsManager();
