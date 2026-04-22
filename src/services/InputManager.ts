/** All action bindings from spec 16 (16_input_map.md). */
export type InputAction =
  | 'player_move_up'
  | 'player_move_down'
  | 'player_move_left'
  | 'player_move_right'
  | 'interact'
  | 'survey_tool_toggle'
  | 'zone_paint'
  | 'retool_factory'
  | 'fleet_panel'
  | 'fleet_dispatch'
  | 'galaxy_map'
  | 'logistics_overlay'
  | 'production_dashboard'
  | 'production_overlay'
  | 'coverage_overlay'
  | 'inventory'
  | 'journal'
  | 'cycle_panels'
  | 'pause_menu'
  | 'menu_toggle'
  | 'fullscreen_toggle'
  | 'camera_zoom_in'
  | 'camera_zoom_out'
  | 'debug_toggle';

type KeyMap = Record<string, InputAction>;

const DEFAULT_BINDINGS: KeyMap = {
  KeyW: 'player_move_up',
  ArrowUp: 'player_move_up',
  KeyS: 'player_move_down',
  ArrowDown: 'player_move_down',
  KeyA: 'player_move_left',
  ArrowLeft: 'player_move_left',
  KeyD: 'player_move_right',
  ArrowRight: 'player_move_right',
  KeyE: 'interact',
  KeyQ: 'survey_tool_toggle',
  KeyZ: 'zone_paint',
  KeyR: 'retool_factory',
  KeyT: 'fleet_panel',
  KeyF: 'fleet_dispatch',
  KeyG: 'galaxy_map',
  KeyL: 'logistics_overlay',
  KeyP: 'production_dashboard',
  KeyO: 'production_overlay',
  KeyB: 'coverage_overlay',
  KeyI: 'inventory',
  KeyJ: 'journal',
  KeyM: 'menu_toggle',
  Tab: 'cycle_panels',
  Escape: 'pause_menu',
  F11: 'fullscreen_toggle',
  Backquote: 'debug_toggle',
};

export class InputManager {
  private held = new Set<InputAction>();
  private justPressed = new Set<InputAction>();
  private justReleased = new Set<InputAction>();
  private bindings: KeyMap;
  private listeners: Array<(action: InputAction, pressed: boolean) => void> = [];

  constructor(bindings: KeyMap = DEFAULT_BINDINGS) {
    this.bindings = { ...bindings };
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  mount(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  unmount(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /** Call once per frame to clear just-pressed/released sets. */
  flush(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  isHeld(action: InputAction): boolean {
    return this.held.has(action);
  }

  wasJustPressed(action: InputAction): boolean {
    return this.justPressed.has(action);
  }

  wasJustReleased(action: InputAction): boolean {
    return this.justReleased.has(action);
  }

  onAction(cb: (action: InputAction, pressed: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /** Returns the current keybinding map (for settings UI). */
  getBindings(): Readonly<KeyMap> {
    return this.bindings;
  }

  /**
   * Dispatch an action programmatically as a tap (press + release) without a
   * real key event. Used by on-screen touch / mouse menu buttons so they go
   * through the same listener pipeline as the keyboard bindings.
   */
  dispatch(action: InputAction): void {
    this.held.add(action);
    this.justPressed.add(action);
    this.listeners.forEach(l => l(action, true));
    this.held.delete(action);
    this.justReleased.add(action);
    this.listeners.forEach(l => l(action, false));
  }

  /** Remap a key. Validates no conflict per spec 16. Returns false on conflict. */
  remap(code: string, action: InputAction): boolean {
    const conflict = this.bindings[code];
    if (conflict && conflict !== action) return false;
    const oldCode = Object.keys(this.bindings).find(k => this.bindings[k] === action);
    if (oldCode) delete this.bindings[oldCode];
    this.bindings[code] = action;
    return true;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const action = this.bindings[e.code];
    if (!action) return;
    if (action === 'fullscreen_toggle' || action === 'cycle_panels' || action === 'debug_toggle') e.preventDefault();
    this.held.add(action);
    this.justPressed.add(action);
    this.listeners.forEach(l => l(action, true));
  }

  private onKeyUp(e: KeyboardEvent): void {
    const action = this.bindings[e.code];
    if (!action) return;
    this.held.delete(action);
    this.justReleased.add(action);
    this.listeners.forEach(l => l(action, false));
  }
}

export const inputManager = new InputManager();
