/**
 * SurveyJournalPanel — [J] key panel listing all survey waypoints.
 * Uses the .trade-panel CSS class pattern.
 */
import type { WaypointData } from '@data/types';
import { surveyService } from '@services/SurveyService';

export class SurveyJournalPanel {
  private _root: HTMLElement | null = null;
  private _list: HTMLElement | null = null;
  private _visible = false;
  private _onKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this._onKeydown = (e) => {
      if (!this._visible) return;
      if (e.code === 'Escape' || e.code === 'KeyJ') {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeydown, true);
  }

  get visible(): boolean { return this._visible; }

  mount(parent: HTMLElement): void {
    const el = document.createElement('div');
    el.id = 'survey-journal-panel';
    el.className = 'trade-panel';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="trade-panel-head">
        <h2>SURVEY JOURNAL</h2>
        <button class="trade-panel-close" aria-label="close">&#x2715;</button>
      </div>
      <div class="survey-journal-list" id="survey-journal-list">
        <div class="storage-empty">No waypoints surveyed yet.</div>
      </div>
    `;
    parent.appendChild(el);
    this._root = el;
    this._list = el.querySelector('#survey-journal-list');

    el.querySelector('.trade-panel-close')!.addEventListener('click', () => this.close());
  }

  open(): void {
    if (!this._root) return;
    this._root.style.display = '';
    this._visible = true;
  }

  close(): void {
    if (!this._root) return;
    this._root.style.display = 'none';
    this._visible = false;
  }

  /** Re-render the waypoint list. Call before open() to ensure fresh data. */
  refresh(waypoints: readonly WaypointData[]): void {
    if (!this._list) return;
    if (waypoints.length === 0) {
      this._list.innerHTML = '<div class="storage-empty">No waypoints surveyed yet.</div>';
      return;
    }
    this._list.innerHTML = waypoints.map(wp => {
      const label = wp.oreType.toUpperCase().replace(/_/g, ' ');
      const date = new Date().toISOString().slice(0, 10); // placeholder — real date would be stored in WaypointData
      const pct = Math.round(wp.concentration);
      return `<div class="survey-journal-row" data-id="${wp.depositId}">
        <div class="survey-journal-row-info">
          <span class="survey-journal-ore">${label}</span>
          <span class="survey-journal-meta">${pct}% &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; (${Math.round(wp.x)}, ${Math.round(wp.y)})</span>
          <span class="survey-journal-status">SURVEYED</span>
        </div>
        <button class="survey-journal-remove" data-id="${wp.depositId}">REMOVE</button>
      </div>`;
    }).join('');

    // Wire REMOVE buttons.
    this._list.querySelectorAll<HTMLButtonElement>('.survey-journal-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['id'];
        if (!id) return;
        surveyService.removeWaypoint(id);
        this.refresh(surveyService.getWaypoints());
      });
    });
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    this._root?.remove();
    this._root = null;
  }
}
