import { EventBus } from '@services/EventBus';
import { gameState } from '@services/GameState';
import { sectorManager } from '@services/SectorManager';

export class SectorCompleteOverlay {
  private _root!: HTMLElement;
  private _visible = false;

  mount(parent: HTMLElement): void {
    this._root = document.createElement('div');
    this._root.className = 'sector-overlay-root';
    this._root.style.display = 'none';
    parent.appendChild(this._root);
    EventBus.on('sector:complete', () => this.show());
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
    const existing = sectorManager.sectorBonuses;
    const bonusLine = existing.length > 0
      ? `<div class="sector-active-bonuses">ACTIVE BONUSES: ${existing.join(', ')}</div>`
      : '';

    const statsData: [string, string][] = [
      ['SECTOR', `#${gameState.sectorNumber}`],
      ['CREDITS REMAINING', `${gameState.credits.toLocaleString()} CR`],
      ['RESEARCH POINTS', `${gameState.researchPoints} RP`],
      ['VOID CORES PRODUCED', `${gameState.voidCoresProduced}`],
      ['TECH NODES UNLOCKED', `${gameState.techTreeUnlocks.length} / 47`],
    ];

    const statsHtml = statsData.map(([label, val]) => `
      <div class="sector-stat-row">
        <span class="sector-stat-label">${label}:</span>
        <span class="sector-stat-val">${val}</span>
      </div>
    `).join('');

    this._root.innerHTML = `
      <div class="sector-modal">
        <h1 class="sector-title">SURVEY COMPLETE</h1>
        <p class="sector-subtitle">ALL DEPOSITS CATALOGUED<br>SECTOR EXTRACTION AT MAXIMUM EFFICIENCY</p>
        <div class="sector-stats">${statsHtml}</div>
        ${bonusLine}
        <button class="sector-prestige-btn" id="sector-prestige-btn">INITIATE PRESTIGE</button>
      </div>
    `;

    this._root.querySelector('#sector-prestige-btn')!.addEventListener('click', () => {
      this.hide();
      EventBus.emit('prestige:initiate');
    });
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this._root?.remove();
  }
}
