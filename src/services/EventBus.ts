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
};

class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
