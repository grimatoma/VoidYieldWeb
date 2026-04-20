import EventEmitter from 'eventemitter3';

export type GameEvents = {
  'game:saved': [];
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
  'sector:reset': [selectedBonus: string];
  'offline:simulation_needed': [offlineSeconds: number];
  'offline:dispatched': [];
  'fleet:count_changed': [count: number];
};

class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
