/**
 * FleetPanel — HTML/CSS fleet roster panel. Scales with --hud-scale.
 */
import { fleetManager } from '@services/FleetManager';

export class FleetPanel {
  private _root: HTMLElement;
  private _body: HTMLElement;
  private _summary: HTMLElement;
  private _visible = false;
  private _mounted = false;

  constructor() {
    this._root = document.createElement('div');
    this._root.className = 'fleet-panel';
    this._root.style.display = 'none';
    this._root.innerHTML = `
      <div class="fleet-panel-head">
        <span class="fleet-panel-title">[ FLEET ]</span>
        <span class="fleet-panel-hint">[T] close</span>
      </div>
      <div class="fleet-panel-body"></div>
      <div class="fleet-panel-summary"></div>
    `;
    this._body = this._root.querySelector<HTMLElement>('.fleet-panel-body')!;
    this._summary = this._root.querySelector<HTMLElement>('.fleet-panel-summary')!;
  }

  mount(parent: HTMLElement): void {
    if (this._mounted) return;
    parent.appendChild(this._root);
    this._mounted = true;
  }

  private _refresh(): void {
    const drones = fleetManager.getDrones();
    if (drones.length === 0) {
      this._body.innerHTML = `<div class="fleet-empty">No drones in fleet.</div>`;
      this._summary.textContent = '';
      return;
    }

    const rows = drones.map((d) => {
      const task = d.peekTask();
      const taskStr = task ? `${task.type}→(${Math.round(task.targetX)},${Math.round(task.targetY)})` : '---';
      return `
        <div class="fleet-row" data-state="${d.state}">
          <span class="fleet-row-id">${d.id}</span>
          <span class="fleet-row-type">${d.droneType}</span>
          <span class="fleet-row-state">[${d.state.slice(0, 4)}]</span>
          <span class="fleet-row-task">${taskStr}</span>
        </div>
      `;
    }).join('');
    this._body.innerHTML = rows;

    const active = fleetManager.getActive().length;
    this._summary.textContent = `Active: ${active}/${drones.length}  Idle: ${drones.length - active}`;
  }

  toggle(): void {
    this._visible = !this._visible;
    this._root.style.display = this._visible ? 'block' : 'none';
    if (this._visible) this._refresh();
  }

  update(): void {
    if (this._visible) this._refresh();
  }

  get visible(): boolean { return this._visible; }

  destroy(): void { this._root.remove(); }
}
