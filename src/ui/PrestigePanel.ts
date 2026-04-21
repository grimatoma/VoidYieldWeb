import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';
import { sectorManager } from '@services/SectorManager';
import type { SectorBonus } from '@services/SectorManager';
import { SECTOR_BONUS_DESCRIPTIONS } from '@services/SectorManager';

const ALL_BONUSES: SectorBonus[] = [
  'veteran_miner', 'fleet_commander', 'survey_expert', 'trade_connections',
  'refined_tastes', 'research_heritage', 'harvester_legacy', 'fuel_surplus',
  'pioneer_spirit', 'void_walker',
];

export class PrestigePanel {
  private _root!: HTMLElement;
  private _visible = false;

  mount(parent: HTMLElement): void {
    this._root = document.createElement('div');
    this._root.className = 'prestige-panel-root';
    this._root.style.display = 'none';
    parent.appendChild(this._root);
    EventBus.on('prestige:initiate', () => this.show());
  }

  show(): void {
    this._visible = true;
    this._root.style.display = 'flex';
    this._render();
  }

  hide(): void {
    this._visible = false;
    this._root.style.display = 'none';
  }

  private _render(): void {
    const cardsHtml = ALL_BONUSES.map(bonus => {
      const owned = sectorManager.hasSectorBonus(bonus);
      const name = bonus.replace(/_/g, ' ').toUpperCase();
      const desc = SECTOR_BONUS_DESCRIPTIONS[bonus] ?? '';
      return `
        <button class="prestige-card ${owned ? 'prestige-card--owned' : ''}" data-bonus="${bonus}">
          <div class="prestige-card-name">${name}</div>
          <div class="prestige-card-desc">${desc}</div>
          ${owned ? '<div class="prestige-card-owned">✓ OWNED</div>' : ''}
        </button>
      `;
    }).join('');

    this._root.innerHTML = `
      <div class="prestige-modal">
        <h1 class="prestige-title">SELECT SECTOR BONUS</h1>
        <p class="prestige-sub">Sector ${gameState.sectorNumber} complete. Choose your next sector bonus.</p>
        <div class="prestige-grid">${cardsHtml}</div>
        <button class="prestige-back-btn" id="prestige-back-btn">BACK</button>
      </div>
    `;

    this._root.querySelectorAll<HTMLButtonElement>('.prestige-card').forEach(card => {
      card.addEventListener('click', () => {
        const bonus = card.dataset.bonus as SectorBonus;
        sectorManager.applyPrestigeAndReset(bonus);
        this.hide();
        EventBus.emit('scene:travel', 'planet_a1');
      });
    });

    this._root.querySelector('#prestige-back-btn')!.addEventListener('click', () => {
      this.hide();
      EventBus.emit('prestige:initiate');
    });
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this._root?.remove();
  }
}
