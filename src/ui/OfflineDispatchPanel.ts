import type { OfflineSimulationResult } from '@services/OfflineSimulator';
import { EventBus } from '@services/EventBus';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export class OfflineDispatchPanel {
  private _root!: HTMLElement;
  private _visible = false;

  mount(parent: HTMLElement): void {
    this._root = document.createElement('div');
    this._root.className = 'offline-panel-root';
    this._root.style.display = 'none';
    parent.appendChild(this._root);
  }

  show(result: OfflineSimulationResult): void {
    this._visible = true;
    this._root.style.display = 'flex';
    this._render(result);
  }

  hide(): void {
    this._visible = false;
    this._root.style.display = 'none';
  }

  private _render(result: OfflineSimulationResult): void {
    const summaryItems: [string, string][] = [
      ['CREDITS GAINED', `+${result.totalCreditsGained.toLocaleString()} CR`],
      ['ROUTES COMPLETED', `${result.routesCompleted}`],
      ['HARVESTERS STALLED', result.stalledHarvesters > 0 ? `${result.stalledHarvesters} ⚠` : '0'],
      ['ORE COLLECTED', Object.keys(result.totalOreMined).length > 0 ? `${Object.keys(result.totalOreMined).length} types` : 'NONE'],
    ];

    const statsHtml = summaryItems.map(([label, val]) => `
      <div class="offline-stat">
        <div class="offline-stat-label">${label}</div>
        <div class="offline-stat-val">${val}</div>
      </div>
    `).join('');

    const typeColors: Record<string, string> = {
      mining: '#888844', factory: '#44AA88', logistics: '#4488AA',
      colony: '#AA8844', stall: '#AA4444', discovery: '#44AAAA',
    };
    const recentEvents = result.events.slice(-8);
    const eventsHtml = recentEvents.map(ev => `
      <div class="offline-event" style="color:${typeColors[ev.type] ?? '#CCCCCC'}">
        [${formatDuration(ev.timestamp)}] ${ev.description}
      </div>
    `).join('');

    this._root.innerHTML = `
      <div class="offline-modal">
        <div class="offline-header">◆ EMPIRE DISPATCH ◆</div>
        <div class="offline-duration">OFFLINE FOR ${formatDuration(result.durationSeconds)} — SIMULATION COMPLETE</div>
        <hr class="offline-divider">
        <div class="offline-stats">${statsHtml}</div>
        <div class="offline-event-head">— RECENT ACTIVITY —</div>
        <div class="offline-events">${eventsHtml}</div>
        <button class="offline-close-btn" id="offline-close-btn">VIEW DASHBOARD</button>
      </div>
    `;

    this._root.querySelector('#offline-close-btn')!.addEventListener('click', () => {
      this.hide();
      EventBus.emit('offline:dispatched');
    });
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this._root?.remove();
  }
}
