import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { fleetManager } from '@services/FleetManager';

export class FleetPanel {
  readonly container: Container;
  private _visible = false;
  private _listContainer!: Container;
  private _title!: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.x = 10;
    this.container.y = 40;

    const bg = new Graphics();
    bg.rect(0, 0, 300, 280).fill({ color: 0x0D1B3E, alpha: 0.92 });
    bg.rect(0, 0, 300, 280).stroke({ width: 1, color: 0x2196F3 });
    this.container.addChild(bg);

    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: '#2196F3' });
    this._title = new Text({ text: '[ FLEET ]  [T] to close', style: titleStyle });
    this._title.x = 8;
    this._title.y = 8;
    this.container.addChild(this._title);

    this._listContainer = new Container();
    this._listContainer.y = 28;
    this.container.addChild(this._listContainer);
  }

  private _refresh(): void {
    while (this._listContainer.children.length) {
      this._listContainer.removeChildAt(0);
    }

    const drones = fleetManager.getDrones();
    const rowStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#AAAAAA' });

    if (drones.length === 0) {
      const empty = new Text({ text: 'No drones in fleet.', style: rowStyle });
      empty.x = 8;
      this._listContainer.addChild(empty);
      return;
    }

    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      const task = d.peekTask();
      const taskStr = task ? `${task.type}→(${Math.round(task.targetX)},${Math.round(task.targetY)})` : '---';
      const stateColor = d.state === 'IDLE' ? '#666666' : d.state === 'EXECUTING' ? '#4CAF50' : '#2196F3';

      const row = new Text({
        text: `${d.id.padEnd(10)} ${d.droneType.padEnd(10)} [${d.state.slice(0, 4)}] ${taskStr}`,
        style: new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: stateColor }),
      });
      row.x = 8;
      row.y = i * 16;
      this._listContainer.addChild(row);
    }

    // Active / idle count
    const active = fleetManager.getActive().length;
    const countStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#D4A843' });
    const countText = new Text({
      text: `Active: ${active}/${drones.length}  Idle: ${drones.length - active}`,
      style: countStyle,
    });
    countText.x = 8;
    countText.y = drones.length * 16 + 8;
    this._listContainer.addChild(countText);
  }

  toggle(): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
    if (this._visible) this._refresh();
  }

  /** Call every frame when visible to keep counts updated. */
  update(): void {
    if (this._visible) this._refresh();
  }

  get visible(): boolean {
    return this._visible;
  }
}
