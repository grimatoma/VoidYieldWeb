import type { TradeRoute, OreType, CargoShipType, CargoShipSpec } from '@data/types';
import { EventBus } from './EventBus';
import type { StorageDepot } from '@entities/StorageDepot';

// Planet storage depots registry — scenes register their depot here
const _planetDepots = new Map<string, StorageDepot>();

export const CARGO_SHIP_SPECS: Record<CargoShipType, CargoShipSpec> = {
  bulk_freighter: { type: 'bulk_freighter', capacity: 1200, fuelPerTrip: 30, allowedCargoClasses: ['bulk'] },
  liquid_tanker: { type: 'liquid_tanker', capacity: 800, fuelPerTrip: 45, allowedCargoClasses: ['bulk', 'refined'] },
  container_ship: { type: 'container_ship', capacity: 600, fuelPerTrip: 30, allowedCargoClasses: ['components', 'refined'] },
  heavy_transport: { type: 'heavy_transport', capacity: 3600, fuelPerTrip: 90, allowedCargoClasses: ['bulk', 'refined', 'components'] },
};

class LogisticsManager {
  private _routes: TradeRoute[] = [];
  private _nextRouteId = 1;

  constructor() {
    // Clear routes on prestige so SectorManager needn't call us directly
    EventBus.on('prestige:reset', () => {
      this.clearRoutes();
    });
  }

  /** Scenes call this on enter to register their storage depot. */
  registerPlanet(planetId: string, depot: StorageDepot): void {
    _planetDepots.set(planetId, depot);
  }

  unregisterPlanet(planetId: string): void {
    _planetDepots.delete(planetId);
  }

  getDepot(planetId: string): StorageDepot | undefined {
    return _planetDepots.get(planetId);
  }

  clearRoutes(): void {
    this._routes = [];
  }

  /** Create a new manual trade route. */
  addRoute(params: {
    sourcePlanet: string;
    destPlanet: string;
    cargoType: OreType;
    cargoQty: number;
    cargoClass: 'bulk' | 'refined' | 'components';
    tripTimeSec?: number;
    shipType?: CargoShipType;
    autoDispatchThreshold?: number;
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
      shipType: params.shipType ?? 'bulk_freighter',
      autoDispatchThreshold: params.autoDispatchThreshold ?? 0,
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

    // Enforce cargo class constraint
    const shipSpec = CARGO_SHIP_SPECS[route.shipType];
    if (!shipSpec.allowedCargoClasses.includes(route.cargoClass)) {
      console.warn(`Ship type ${route.shipType} cannot carry cargo class ${route.cargoClass}`);
      return false;
    }

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
    // Auto-dispatch logic
    for (const route of this._routes) {
      if (route.status !== 'IDLE' || route.autoDispatchThreshold <= 0) continue;

      const srcDepot = _planetDepots.get(route.sourcePlanet);
      if (!srcDepot) continue;

      const available = srcDepot.getStockpile().get(route.cargoType) ?? 0;
      const threshold = route.autoDispatchThreshold * route.cargoQty;
      if (available >= threshold) {
        this.dispatch(route.routeId);
      }
    }

    // Transit logic
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

  /** Restore trade routes from a saved snapshot (e.g. on game load). */
  loadRoutes(routes: unknown[]): void {
    this._routes = [];
    this._nextRouteId = 1;
    for (const raw of routes) {
      const r = raw as TradeRoute;
      if (!r || !r.routeId) continue;
      this._routes.push({ ...r });
      // Keep nextRouteId ahead of any restored id
      const numericPart = parseInt(r.routeId.replace('route-', ''), 10);
      if (!isNaN(numericPart) && numericPart >= this._nextRouteId) {
        this._nextRouteId = numericPart + 1;
      }
    }
  }

  reset(): void {
    this._routes = [];
    this._nextRouteId = 1;
    _planetDepots.clear();
    // Note: CARGO_SHIP_SPECS is constant and does not reset
  }
}

export const logisticsManager = new LogisticsManager();
