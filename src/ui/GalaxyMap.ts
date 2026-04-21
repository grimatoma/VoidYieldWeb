/**
 * GalaxyMap — HTML/CSS galaxy map modal with planet nodes and travel buttons.
 * Scales with --hud-scale.
 */
export interface PlanetNode {
  id: string;
  label: string;
  x: number;
  y: number;
  unlocked: boolean;
  current: boolean;
}

const PLANET_POS: Record<string, { x: number; y: number; color: string }> = {
  planet_a1: { x: 25, y: 65, color: '#00B8D4' },
  planet_a2: { x: 45, y: 38, color: '#00B8D4' },
  planet_b:  { x: 62, y: 58, color: '#00B8D4' },
  planet_c:  { x: 78, y: 78, color: '#E91E63' },
  planet_a3: { x: 90, y: 30, color: '#00B8D4' },
};

const ROUTES: Array<[string, string, string]> = [
  ['planet_a1', 'planet_a2', '#334477'],
  ['planet_a2', 'planet_b',  '#334477'],
  ['planet_b',  'planet_a3', '#00B8D4'],
];

export class GalaxyMap {
  private _root: HTMLElement;
  private _mapEl: HTMLElement;
  private _visible = false;
  private _mounted = false;
  private _planetNodes: PlanetNode[] = [];
  private _onTravel?: (planetId: string) => void;
  private _onClick: (e: MouseEvent) => void;

  constructor() {
    this._root = document.createElement('div');
    this._root.className = 'galaxy-panel-root';
    this._root.style.display = 'none';
    this._root.innerHTML = `
      <div class="galaxy-panel-backdrop"></div>
      <div class="galaxy-panel">
        <div class="galaxy-panel-head">
          <span class="galaxy-panel-title">[ GALAXY MAP ]</span>
          <span class="galaxy-panel-hint">[G] or click outside to close</span>
          <button class="galaxy-panel-close" aria-label="Close">✕</button>
        </div>
        <div class="galaxy-panel-map"></div>
      </div>
    `;
    this._mapEl = this._root.querySelector<HTMLElement>('.galaxy-panel-map')!;

    this._onClick = (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('galaxy-panel-backdrop')
          || t.classList.contains('galaxy-panel-close')) {
        this.setVisible(false);
        return;
      }
      if (t.classList.contains('galaxy-travel-btn')) {
        const id = t.getAttribute('data-planet-id');
        if (id && this._onTravel) {
          this._onTravel(id);
          this.setVisible(false);
        }
      }
    };
    this._root.addEventListener('click', this._onClick);
  }

  mount(parent: HTMLElement): void {
    if (this._mounted) return;
    parent.appendChild(this._root);
    this._mounted = true;
  }

  onTravel(cb: (planetId: string) => void): void { this._onTravel = cb; }

  setPlanets(nodes: PlanetNode[]): void {
    this._planetNodes = nodes;
    this._rebuild();
  }

  private _rebuild(): void {
    const starDots = [[15,20],[25,10],[38,18],[52,12],[68,24],[82,15],[30,85],[50,92],[72,86],[88,90]]
      .map(([x, y]) => `<div class="galaxy-star" style="left:${x}%;top:${y}%"></div>`).join('');

    const lines = ROUTES.map(([fromId, toId, color]) => {
      const a = this._planetNodes.find(n => n.id === fromId);
      const b = this._planetNodes.find(n => n.id === toId);
      if (!a?.unlocked || !b?.unlocked) return '';
      const p1 = PLANET_POS[fromId];
      const p2 = PLANET_POS[toId];
      if (!p1 || !p2) return '';
      return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="0.3" stroke-opacity="0.6"/>`;
    }).join('');

    const planets = this._planetNodes.map((node) => {
      const pos = PLANET_POS[node.id] ?? { x: 50, y: 50, color: '#00B8D4' };
      const colorClass = node.current ? 'is-current' : !node.unlocked ? 'is-locked' : '';
      const color = node.current ? '#D4A843' : !node.unlocked ? '#333355' : pos.color;
      const travelBtn = (!node.current && node.unlocked && this._onTravel)
        ? `<button class="galaxy-travel-btn" data-planet-id="${node.id}">TRAVEL</button>`
        : '';
      return `
        <div class="galaxy-planet ${colorClass}" style="left:${pos.x}%;top:${pos.y}%">
          <div class="galaxy-planet-dot" style="background:${color}"></div>
          <div class="galaxy-planet-label">${escapeHtml(node.label)}${node.current ? '<br>[HERE]' : ''}</div>
          ${travelBtn}
        </div>
      `;
    }).join('');

    this._mapEl.innerHTML = `
      ${starDots}
      <svg class="galaxy-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>
      ${planets}
    `;
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this._root.style.display = v ? 'block' : 'none';
    if (v) this._rebuild();
  }

  toggle(): void { this.setVisible(!this._visible); }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this._root.removeEventListener('click', this._onClick);
    this._root.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}
