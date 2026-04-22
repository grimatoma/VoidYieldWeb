import EventEmitter from 'eventemitter3';

export type GameEvents = {
  'game:saved': [];
  'game:save-requested': [];
  'game:loaded': [];
  'game:paused': [paused: boolean];
  'credits:changed': [credits: number];
  'rp:changed': [rp: number];
  'scene:changed': [sceneId: string];
  'scene:travel': [planetId: string];
  'fullscreen:toggled': [isFullscreen: boolean];
  'save:autosave': [];
  'inventory:changed': [];
  'population:changed': [count: number, capacity: number];
  'needs:changed': [compressed_gas_pct: number, water_pct: number];
  'warpgate:built': [];
  'galactichub:built': [];
  'sector:complete': [];
  'prestige:initiate': [];
  'prestige:reset': [bonus: string, startFuel: number];
  'sector:reset': [selectedBonus: string];
  'offline:simulation_needed': [offlineSeconds: number];
  'offline:dispatched': [];
  'fleet:count_changed': [count: number];
  'fleet:roster_changed': [];
  'drone:bay_cap_changed': [cap: number];
  'tutorial:step_changed': [step: number];
  'tutorial:completed': [];
  'tutorial:skipped': [];
  'deposit:surveyed': [];
  'harvester:built': [];
  'ore:collected': [oreType: string, qty: number];
  'ore:sold': [credits: number];
  'shop:purchase': [itemId: string];
  'marketplace:buy': [payload: { ore: string; qty: number; cost: number }];
  'marketplace:sell': [payload: { ore: string; qty: number; revenue: number }];
  'drone:purchased': [droneType: string];
  'interaction:target': [target: import('./InteractionManager').InteractionTarget | null];
  'debug:overlay_toggled': [visible: boolean];
  'survey:scan_complete': [stage: string, depositId: string, concentration: number];
  'survey:waypoint_placed': [depositId: string, x: number, y: number];
  'survey:mode_changed': [active: boolean];
};

class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
