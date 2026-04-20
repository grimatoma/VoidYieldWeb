import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager } from '@services/InputManager';

function fireKey(code: string, type: 'keydown' | 'keyup'): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

describe('InputManager', () => {
  let im: InputManager;

  beforeEach(() => {
    im = new InputManager();
    im.mount();
  });

  it('detects held actions', () => {
    fireKey('KeyW', 'keydown');
    expect(im.isHeld('player_move_up')).toBe(true);
    fireKey('KeyW', 'keyup');
    expect(im.isHeld('player_move_up')).toBe(false);
  });

  it('tracks just-pressed until flush', () => {
    fireKey('KeyE', 'keydown');
    expect(im.wasJustPressed('interact')).toBe(true);
    im.flush();
    expect(im.wasJustPressed('interact')).toBe(false);
  });

  it('tracks just-released until flush', () => {
    fireKey('KeyQ', 'keydown');
    fireKey('KeyQ', 'keyup');
    expect(im.wasJustReleased('survey_tool_toggle')).toBe(true);
    im.flush();
    expect(im.wasJustReleased('survey_tool_toggle')).toBe(false);
  });

  it('fires onAction callbacks', () => {
    const cb = vi.fn();
    im.onAction(cb);
    fireKey('KeyP', 'keydown');
    expect(cb).toHaveBeenCalledWith('production_dashboard', true);
    fireKey('KeyP', 'keyup');
    expect(cb).toHaveBeenCalledWith('production_dashboard', false);
  });

  it('all 20 primary bindings resolve correctly', () => {
    const expectedPairs: Array<[string, string]> = [
      ['KeyW', 'player_move_up'], ['KeyS', 'player_move_down'],
      ['KeyA', 'player_move_left'], ['KeyD', 'player_move_right'],
      ['KeyE', 'interact'], ['KeyQ', 'survey_tool_toggle'],
      ['KeyZ', 'zone_paint'], ['KeyR', 'retool_factory'],
      ['KeyT', 'fleet_panel'], ['KeyF', 'fleet_dispatch'],
      ['KeyG', 'galaxy_map'], ['KeyL', 'logistics_overlay'],
      ['KeyP', 'production_dashboard'], ['KeyO', 'production_overlay'],
      ['KeyB', 'coverage_overlay'], ['KeyI', 'inventory'],
      ['KeyJ', 'journal'], ['Tab', 'cycle_panels'],
      ['Escape', 'pause_menu'], ['F11', 'fullscreen_toggle'],
    ];
    for (const [code, action] of expectedPairs) {
      fireKey(code, 'keydown');
      expect(im.isHeld(action as Parameters<typeof im.isHeld>[0])).toBe(true);
      fireKey(code, 'keyup');
    }
  });

  it('unmount stops listening', () => {
    im.unmount();
    fireKey('KeyW', 'keydown');
    expect(im.isHeld('player_move_up')).toBe(false);
  });
});
