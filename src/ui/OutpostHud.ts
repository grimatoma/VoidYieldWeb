import type { Application } from 'pixi.js';
import { EventBus } from '@services/EventBus';
import { inventory } from '@services/Inventory';
import { gameState } from '@services/GameState';
import type { StorageDepot } from '@entities/StorageDepot';

/**
 * OutpostHud — minimal HTML overlay for the AsteroidOutpostScene.
 * Shows carried ore counts and credit total.
 * Mounts into #ui-layer (the same HTML overlay container used by all UI panels).
 */
export class OutpostHud {
  private _root: HTMLElement | null = null;
  private _storage: StorageDepot | null;
  private _ironOreEl!: HTMLElement;
  private _copperOreEl!: HTMLElement;
  private _waterEl!: HTMLElement;
  private _ironBarEl!: HTMLElement;
  private _copperBarEl!: HTMLElement;
  private _creditsEl!: HTMLElement;

  constructor(storage: StorageDepot) {
    this._storage = storage;
  }

  mount(_app: Application): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._root = document.createElement('div');
    this._root.id = 'outpost-hud';
    this._root.style.cssText = [
      'position:absolute',
      'top:8px',
      'right:8px',
      'background:rgba(13,27,62,0.82)',
      'border:1px solid #2A3A5A',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:13px',
      'padding:8px 12px',
      'line-height:1.6',
      'pointer-events:none',
      'z-index:10',
    ].join(';');

    this._root.innerHTML = `
      <div id="ohud-row-ores">
        IRON ORE: <span id="ohud-iron-ore">0</span>
        &nbsp;&nbsp;COPPER ORE: <span id="ohud-copper-ore">0</span>
        &nbsp;&nbsp;WATER: <span id="ohud-water">0</span>
      </div>
      <div id="ohud-row-bars">
        IRON BAR: <span id="ohud-iron-bar">0</span>
        &nbsp;&nbsp;COPPER BAR: <span id="ohud-copper-bar">0</span>
      </div>
      <div id="ohud-row-credits">
        CREDITS: <span id="ohud-credits">0</span>
      </div>
    `;

    parent.appendChild(this._root);

    this._ironOreEl   = this._root.querySelector('#ohud-iron-ore')!   as HTMLElement;
    this._copperOreEl = this._root.querySelector('#ohud-copper-ore')! as HTMLElement;
    this._waterEl     = this._root.querySelector('#ohud-water')!      as HTMLElement;
    this._ironBarEl   = this._root.querySelector('#ohud-iron-bar')!   as HTMLElement;
    this._copperBarEl = this._root.querySelector('#ohud-copper-bar')! as HTMLElement;
    this._creditsEl   = this._root.querySelector('#ohud-credits')!    as HTMLElement;

    EventBus.on('inventory:changed', this._onInventoryChanged);
    EventBus.on('outpost:inventory-changed', this._onInventoryChanged);
    EventBus.on('credits:changed', this._onCreditsChanged);

    // Initial render
    this._render();
  }

  update(): void {
    this._render();
  }

  unmount(): void {
    EventBus.off('inventory:changed', this._onInventoryChanged);
    EventBus.off('outpost:inventory-changed', this._onInventoryChanged);
    EventBus.off('credits:changed', this._onCreditsChanged);
    this._root?.remove();
    this._root = null;
  }

  private _render(): void {
    if (!this._root) return;
    this._ironOreEl.textContent   = String(inventory.getByType('iron_ore'));
    this._copperOreEl.textContent = String(inventory.getByType('copper_ore'));
    this._waterEl.textContent     = String(inventory.getByType('water'));
    // Bars are deposited to storage by the furnace, not the player's cargo.
    this._ironBarEl.textContent   = String(this._storage?.getBarCount('iron_bar')   ?? 0);
    this._copperBarEl.textContent = String(this._storage?.getBarCount('copper_bar') ?? 0);
    this._creditsEl.textContent   = String(Math.floor(gameState.credits));
  }

  private _onInventoryChanged = (): void => {
    this._render();
  };

  private _onCreditsChanged = (_credits: number): void => {
    this._render();
  };
}
