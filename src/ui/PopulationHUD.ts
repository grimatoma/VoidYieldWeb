import { consumptionManager } from '@services/ConsumptionManager';
import { EventBus } from '@services/EventBus';

export class PopulationHUD {
  private _root!: HTMLElement;
  private _countEl!: HTMLElement;
  private _gasFill!: HTMLElement;
  private _waterFill!: HTMLElement;
  private _multEl!: HTMLElement;

  mount(parent: HTMLElement): void {
    this._root = document.createElement('div');
    this._root.className = 'pop-hud';
    this._root.innerHTML = `
      <div class="pop-hud-row">
        <span class="pop-hud-label">Pioneers:</span>
        <span class="pop-hud-count">4/0</span>
      </div>
      <div class="pop-hud-row">
        <span class="pop-hud-bar-label">Gas</span>
        <div class="pop-hud-bar-bg"><div class="pop-hud-bar-fill" id="pop-gas-fill"></div></div>
      </div>
      <div class="pop-hud-row">
        <span class="pop-hud-bar-label">H2O</span>
        <div class="pop-hud-bar-bg"><div class="pop-hud-bar-fill" id="pop-water-fill"></div></div>
      </div>
      <div class="pop-hud-row">
        <span class="pop-hud-prod">Prod: 100%</span>
      </div>
    `;
    parent.appendChild(this._root);
    this._countEl = this._root.querySelector('.pop-hud-count')!;
    this._gasFill = this._root.querySelector('#pop-gas-fill')!;
    this._waterFill = this._root.querySelector('#pop-water-fill')!;
    this._multEl = this._root.querySelector('.pop-hud-prod')!;

    EventBus.on('population:changed', this._onPopulation);
    EventBus.on('needs:changed', this._onNeeds);
  }

  private _onPopulation = (count: number, capacity: number): void => {
    this._countEl.textContent = `${count}/${capacity}`;
  };

  private _onNeeds = (gasPct: number, waterPct: number): void => {
    this._gasFill.style.width = `${Math.round(gasPct * 100)}%`;
    this._gasFill.style.background = gasPct >= 1 ? '#4CAF50' : gasPct >= 0.5 ? '#FFC107' : '#F44336';
    this._waterFill.style.width = `${Math.round(waterPct * 100)}%`;
    this._waterFill.style.background = waterPct >= 1 ? '#29B6F6' : waterPct >= 0.5 ? '#FFC107' : '#F44336';
    const mult = consumptionManager.productivityMultiplier;
    this._multEl.textContent = `Prod: ${Math.round(mult * 100)}%`;
  };

  destroy(): void {
    EventBus.off('population:changed', this._onPopulation);
    EventBus.off('needs:changed', this._onNeeds);
    this._root?.remove();
  }
}
