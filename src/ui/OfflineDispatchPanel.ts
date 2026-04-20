import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { OfflineSimulationResult } from '@services/OfflineSimulator';
import { EventBus } from '@services/EventBus';

/** Format seconds into HH:MM:SS */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export class OfflineDispatchPanel {
  readonly container: Container;
  private app: Application;
  private _visible = false;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.container.visible = false;
    app.stage.addChild(this.container);
  }

  show(result: OfflineSimulationResult): void {
    this._visible = true;
    this.container.visible = true;
    this.container.removeChildren();
    this._build(result);
  }

  hide(): void {
    this._visible = false;
    this.container.visible = false;
  }

  private _build(result: OfflineSimulationResult): void {
    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Semi-transparent backdrop
    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(bg);

    // Panel body
    const PW = Math.min(640, W - 40);
    const PH = Math.min(480, H - 40);
    const PX = (W - PW) / 2;
    const PY = (H - PH) / 2;

    const panel = new Graphics();
    panel.rect(PX, PY, PW, PH).fill(0x0D1B3E);
    panel.rect(PX, PY, PW, PH).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(panel);

    // Header
    const headerStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 18, fill: '#D4A843' });
    const header = new Text({ text: '◆ EMPIRE DISPATCH ◆', style: headerStyle });
    header.anchor.set(0.5, 0);
    header.x = W / 2;
    header.y = PY + 16;
    this.container.addChild(header);

    const durationStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#00B8D4' });
    const duration = new Text({
      text: `OFFLINE FOR ${formatDuration(result.durationSeconds)} — SIMULATION COMPLETE`,
      style: durationStyle,
    });
    duration.anchor.set(0.5, 0);
    duration.x = W / 2;
    duration.y = PY + 44;
    this.container.addChild(duration);

    // Divider line
    const div = new Graphics();
    div.rect(PX + 16, PY + 68, PW - 32, 1).fill(0xD4A843);
    this.container.addChild(div);

    // Summary stats
    const statY = PY + 82;
    const colX1 = PX + 24;
    const colX2 = PX + PW / 2 + 8;

    const summaryItems: [string, string][] = [
      ['CREDITS GAINED', `+${result.totalCreditsGained.toLocaleString()} CR`],
      ['ROUTES COMPLETED', `${result.routesCompleted}`],
      ['HARVESTERS STALLED', result.stalledHarvesters > 0 ? `${result.stalledHarvesters} ⚠` : '0'],
      ['ORE COLLECTED', Object.keys(result.totalOreMined).length > 0 ? `${Object.keys(result.totalOreMined).length} types` : 'NONE'],
    ];

    const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#AAAAAA' });
    const valStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#D4A843' });

    summaryItems.forEach(([label, val], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? colX1 : colX2;
      const y = statY + row * 28;

      const lText = new Text({ text: label + ':', style: labelStyle });
      lText.x = x;
      lText.y = y;
      this.container.addChild(lText);

      const vText = new Text({ text: val, style: valStyle });
      vText.x = x;
      vText.y = y + 14;
      this.container.addChild(vText);
    });

    // Event log (last 8 events)
    const logY = statY + 76;
    const recentEvents = result.events.slice(-8);
    const logHeader = new Text({ text: '— RECENT ACTIVITY —', style: new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#00B8D4' }) });
    logHeader.x = PX + 16;
    logHeader.y = logY - 18;
    this.container.addChild(logHeader);

    recentEvents.forEach((ev, i) => {
      const typeColors: Record<string, string> = {
        mining: '#888844', factory: '#44AA88', logistics: '#4488AA',
        colony: '#AA8844', stall: '#AA4444', discovery: '#44AAAA',
      };
      const evText = new Text({
        text: `[${formatDuration(ev.timestamp)}] ${ev.description}`,
        style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: typeColors[ev.type] ?? '#CCCCCC' }),
      });
      evText.x = PX + 16;
      evText.y = logY + i * 20;
      this.container.addChild(evText);
    });

    // Close button
    const closeY = PY + PH - 52;
    const closeBtn = new Graphics();
    closeBtn.rect(W / 2 - 100, closeY, 200, 40).fill(0x1A3050);
    closeBtn.rect(W / 2 - 100, closeY, 200, 40).stroke({ width: 2, color: 0xD4A843 });
    closeBtn.interactive = true;
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', () => {
      this.hide();
      EventBus.emit('offline:dispatched');
    });
    this.container.addChild(closeBtn);

    const closeBtnStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: '#D4A843' });
    const closeBtnLabel = new Text({ text: 'VIEW DASHBOARD', style: closeBtnStyle });
    closeBtnLabel.anchor.set(0.5);
    closeBtnLabel.x = W / 2;
    closeBtnLabel.y = closeY + 20;
    this.container.addChild(closeBtnLabel);
  }

  get visible(): boolean { return this._visible; }

  destroy(): void {
    this.container.parent?.removeChild(this.container);
  }
}
