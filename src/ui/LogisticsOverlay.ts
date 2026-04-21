/**
 * LogisticsOverlay — HTML trade-route status panel. Scales with --hud-scale.
 */
import type { TradeRoute } from '@data/types';

export class LogisticsOverlay {
  private _root: HTMLElement;
  private _title: HTMLElement;
  private _body: HTMLElement;
  private _visible = false;
  private _mounted = false;
  private _onDispatch?: (routeId: string) => void;

  constructor() {
    this._root = document.createElement('div');
    this._root.className = 'logistics-panel';
    this._root.style.display = 'none';
    this._root.innerHTML = `
      <div class="logistics-panel-head">
        <span class="logistics-panel-title">[ LOGISTICS ]</span>
        <span class="logistics-panel-hint">[L] close</span>
      </div>
      <div class="logistics-panel-headers">
        <span>ROUTE</span>
        <span>STATUS</span>
        <span>TRIPS</span>
        <span>ETA / AUTO</span>
      </div>
      <div class="logistics-panel-body"></div>
    `;
    this._title = this._root.querySelector<HTMLElement>('.logistics-panel-title')!;
    this._body  = this._root.querySelector<HTMLElement>('.logistics-panel-body')!;

    this._body.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('logistics-dispatch-btn')) {
        const id = t.getAttribute('data-route-id');
        if (id && this._onDispatch) this._onDispatch(id);
      }
    });
  }

  mount(parent: HTMLElement): void {
    if (this._mounted) return;
    parent.appendChild(this._root);
    this._mounted = true;
  }

  onDispatch(cb: (routeId: string) => void): void { this._onDispatch = cb; }

  refresh(routes: readonly TradeRoute[]): void {
    this._title.textContent = `[ LOGISTICS — ${routes.length} routes ]`;
    if (routes.length === 0) {
      this._body.innerHTML = `<div class="logistics-empty">No routes configured.</div>`;
      return;
    }

    const rows = routes.map((route) => {
      const src = route.sourcePlanet.replace('planet_', '').toUpperCase();
      const dst = route.destPlanet.replace('planet_', '').toUpperCase();
      const label = `${src}→${dst} ${route.cargoType}×${route.cargoQty}`;
      let etaStr = '—';
      if (route.status === 'IN_TRANSIT') {
        const remaining = Math.max(0, route.tripTimeSec - route.elapsedSec);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        etaStr = `${mins}m${secs}s`;
      } else if ((route.autoDispatchThreshold ?? 0) > 0) {
        etaStr = '[AUTO]';
      }
      const showBtn = route.status === 'IDLE' || route.status === 'STALLED';
      const pct = route.status === 'IN_TRANSIT'
        ? Math.min(100, (route.elapsedSec / route.tripTimeSec) * 100)
        : 0;

      return `
        <div class="logistics-row logistics-row--${route.status}">
          <span class="logistics-row-label">${escapeHtml(label)}</span>
          <span class="logistics-row-status">${route.status}</span>
          <span class="logistics-row-trips">${route.tripsCompleted}</span>
          <span class="logistics-row-eta">${escapeHtml(etaStr)}</span>
          ${route.status === 'IN_TRANSIT'
            ? `<div class="logistics-row-bar"><div class="logistics-row-fill" style="width:${pct.toFixed(1)}%"></div></div>`
            : ''}
          ${showBtn ? `<button class="logistics-dispatch-btn" data-route-id="${route.routeId}">DISPATCH</button>` : ''}
        </div>
      `;
    }).join('');
    this._body.innerHTML = rows;
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this._root.style.display = v ? 'block' : 'none';
  }

  toggle(): void { this.setVisible(!this._visible); }

  get visible(): boolean { return this._visible; }

  destroy(): void { this._root.remove(); }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}
