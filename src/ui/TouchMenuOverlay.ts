import type { InputAction } from '@services/InputManager';
import { inputManager } from '@services/InputManager';

type MenuEntry = {
  action: InputAction;
  label: string;
  key: string;
};

type MenuSection = {
  title: string;
  entries: MenuEntry[];
};

const SECTIONS: MenuSection[] = [
  {
    title: 'VIEWS',
    entries: [
      { action: 'galaxy_map',           label: 'Galaxy Map',       key: 'G' },
      { action: 'inventory',            label: 'Inventory',        key: 'I' },
      { action: 'journal',              label: 'Survey Journal',   key: 'J' },
      { action: 'fleet_panel',          label: 'Fleet Command',    key: 'T' },
      { action: 'production_dashboard', label: 'Production',       key: 'P' },
      { action: 'logistics_overlay',    label: 'Logistics',        key: 'L' },
    ],
  },
  {
    title: 'OVERLAYS',
    entries: [
      { action: 'production_overlay', label: 'Production View', key: 'O' },
      { action: 'coverage_overlay',   label: 'Coverage',        key: 'B' },
      { action: 'survey_tool_toggle', label: 'Survey Tool',     key: 'Q' },
    ],
  },
  {
    title: 'TOOLS',
    entries: [
      { action: 'zone_paint',      label: 'Zone Paint',  key: 'Z' },
      { action: 'retool_factory',  label: 'Retool',      key: 'R' },
      { action: 'interact',        label: 'Interact',    key: 'E' },
      { action: 'fleet_dispatch',  label: 'Dispatch',    key: 'F' },
    ],
  },
  {
    title: 'SYSTEM',
    entries: [
      { action: 'pause_menu',        label: 'Pause / Close', key: 'Esc' },
      { action: 'cycle_panels',      label: 'Close All',     key: 'Tab' },
      { action: 'fullscreen_toggle', label: 'Fullscreen',    key: 'F11' },
      { action: 'debug_toggle',      label: 'Debug Panel',   key: '~'   },
    ],
  },
];

/**
 * TouchMenuOverlay — always-visible on-screen menu button that expands into a
 * dropdown of every menu / overlay / tool action. Each entry dispatches the
 * corresponding InputAction through InputManager, so the behavior mirrors a
 * keyboard tap exactly. Enables full menu access on touchscreens and any
 * device where the user doesn't have (or can't use) a keyboard.
 */
export class TouchMenuOverlay {
  private _root: HTMLElement;
  private _toggleBtn: HTMLButtonElement;
  private _panel: HTMLElement;
  private _visible = false;
  private _onDocClick: (e: MouseEvent) => void;

  constructor() {
    this._root = document.createElement('div');
    this._root.id = 'touch-menu';
    this._root.className = 'touch-menu';

    this._toggleBtn = document.createElement('button');
    this._toggleBtn.type = 'button';
    this._toggleBtn.className = 'touch-menu-toggle';
    this._toggleBtn.setAttribute('aria-label', 'Open menu');
    this._toggleBtn.setAttribute('aria-expanded', 'false');
    this._toggleBtn.innerHTML = '<span class="touch-menu-icon" aria-hidden="true">≡</span><span class="touch-menu-toggle-label">MENU</span>';
    this._toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggle();
    });

    this._panel = document.createElement('div');
    this._panel.className = 'touch-menu-panel';
    this._panel.setAttribute('role', 'menu');
    this._panel.style.display = 'none';
    this._panel.addEventListener('click', (e) => e.stopPropagation());
    this._buildPanel();

    this._root.appendChild(this._toggleBtn);
    this._root.appendChild(this._panel);

    this._onDocClick = () => {
      if (this._visible) this._setOpen(false);
    };
  }

  private _buildPanel(): void {
    for (const section of SECTIONS) {
      const header = document.createElement('div');
      header.className = 'touch-menu-section-title';
      header.textContent = section.title;
      this._panel.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'touch-menu-grid';
      for (const entry of section.entries) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-menu-item';
        btn.setAttribute('role', 'menuitem');
        btn.setAttribute('data-action', entry.action);
        btn.innerHTML = `<span class="touch-menu-item-label">${entry.label}</span><span class="touch-menu-item-key">${entry.key}</span>`;
        btn.addEventListener('click', () => this._activate(entry.action));
        grid.appendChild(btn);
      }
      this._panel.appendChild(grid);
    }
  }

  private _activate(action: InputAction): void {
    // Fullscreen must be triggered from a direct user gesture — dispatching
    // through InputManager works because we're still inside the click handler
    // call stack when the listener fires requestFullscreen().
    inputManager.dispatch(action);
    // Close the menu after picking an item so the game view is unobstructed.
    this._setOpen(false);
  }

  private _toggle(): void {
    this._setOpen(!this._visible);
  }

  private _setOpen(open: boolean): void {
    if (open === this._visible) return;
    this._visible = open;
    this._panel.style.display = open ? 'block' : 'none';
    this._toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    this._toggleBtn.classList.toggle('touch-menu-toggle--open', open);
    if (open) {
      document.addEventListener('click', this._onDocClick);
    } else {
      document.removeEventListener('click', this._onDocClick);
    }
  }

  get visible(): boolean { return this._visible; }
  get root(): HTMLElement { return this._root; }

  mount(parent: HTMLElement): void { parent.appendChild(this._root); }

  destroy(): void {
    document.removeEventListener('click', this._onDocClick);
    this._root.remove();
  }
}
