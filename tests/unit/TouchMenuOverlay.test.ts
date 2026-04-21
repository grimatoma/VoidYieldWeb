// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TouchMenuOverlay } from '@ui/TouchMenuOverlay';
import { inputManager } from '@services/InputManager';

describe('TouchMenuOverlay', () => {
  let parent: HTMLElement;
  let menu: TouchMenuOverlay;

  beforeEach(() => {
    document.body.innerHTML = '';
    parent = document.createElement('div');
    document.body.appendChild(parent);
    menu = new TouchMenuOverlay();
    menu.mount(parent);
  });

  afterEach(() => {
    menu.destroy();
  });

  it('mounts a toggle button and hidden panel', () => {
    const toggle = parent.querySelector<HTMLButtonElement>('.touch-menu-toggle');
    const panel  = parent.querySelector<HTMLElement>('.touch-menu-panel');
    expect(toggle).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(panel!.style.display).toBe('none');
    expect(menu.visible).toBe(false);
  });

  it('opens and closes when the toggle button is clicked', () => {
    const toggle = parent.querySelector<HTMLButtonElement>('.touch-menu-toggle')!;
    toggle.click();
    expect(menu.visible).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(menu.visible).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('exposes a button for every keyboard-bound menu action', () => {
    const expected = [
      'galaxy_map', 'inventory', 'journal',
      'fleet_panel', 'production_dashboard', 'logistics_overlay',
      'production_overlay', 'coverage_overlay', 'survey_tool_toggle',
      'zone_paint', 'retool_factory', 'interact', 'fleet_dispatch',
      'menu_toggle', 'pause_menu', 'cycle_panels', 'fullscreen_toggle',
    ];
    const actions = Array.from(parent.querySelectorAll<HTMLButtonElement>('.touch-menu-item'))
      .map(b => b.getAttribute('data-action'));
    for (const a of expected) {
      expect(actions).toContain(a);
    }
  });

  it('dispatches the bound input action and closes the menu on item click', () => {
    const cb = vi.fn();
    const unsub = inputManager.onAction(cb);
    try {
      const toggle = parent.querySelector<HTMLButtonElement>('.touch-menu-toggle')!;
      toggle.click();
      expect(menu.visible).toBe(true);

      const galaxyBtn = parent.querySelector<HTMLButtonElement>(
        '.touch-menu-item[data-action="galaxy_map"]',
      )!;
      galaxyBtn.click();

      expect(cb).toHaveBeenCalledWith('galaxy_map', true);
      expect(cb).toHaveBeenCalledWith('galaxy_map', false);
      expect(menu.visible).toBe(false);
    } finally {
      unsub();
    }
  });

  it('closes when clicking outside the panel', () => {
    const toggle = parent.querySelector<HTMLButtonElement>('.touch-menu-toggle')!;
    toggle.click();
    expect(menu.visible).toBe(true);

    document.body.click();
    expect(menu.visible).toBe(false);
  });

  it('toggles when the menu_toggle action fires (M key)', () => {
    expect(menu.visible).toBe(false);
    inputManager.dispatch('menu_toggle');
    expect(menu.visible).toBe(true);
    inputManager.dispatch('menu_toggle');
    expect(menu.visible).toBe(false);
  });

  it('stops toggling after destroy', () => {
    menu.destroy();
    inputManager.dispatch('menu_toggle');
    expect(menu.visible).toBe(false);
  });
});
