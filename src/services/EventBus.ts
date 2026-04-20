import EventEmitter from 'eventemitter3';

export type GameEvents = {
  'game:saved': [];
  'game:loaded': [];
  'game:paused': [paused: boolean];
  'credits:changed': [credits: number];
  'rp:changed': [rp: number];
  'scene:changed': [sceneId: string];
  'fullscreen:toggled': [isFullscreen: boolean];
  'save:autosave': [];
  'inventory:changed': [];
  'population:changed': [count: number, capacity: number];
  'needs:changed': [compressed_gas_pct: number, water_pct: number];
};

class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
