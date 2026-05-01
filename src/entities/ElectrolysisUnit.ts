import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CELL_SIZE } from './PlacedBuilding';

export type ElectrolysisState = 'IDLE' | 'RUNNING' | 'STALLED_OUTPUT';

export class ElectrolysisUnit {
  readonly x: number;
  readonly y: number;
  readonly container: Container;

  state: ElectrolysisState = 'IDLE';
  inputBuffer = 0;   // water units
  outputBuffer = 0;  // hydrolox_fuel units

  static readonly INPUT_PER_CYCLE  = 3;
  static readonly OUTPUT_PER_CYCLE = 1;
  static readonly CYCLE_SECONDS    = 8;
  static readonly MAX_INPUT        = 40;
  static readonly MAX_OUTPUT       = 20;

  private _timer = 0;
  private _statusLabel: Text;

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const w = CELL_SIZE - 4;
    const h = CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(0x0A2A3A);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 2, color: 0x00B8D4 });
    this.container.addChild(body);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#00B8D4' });
    this._statusLabel = new Text({ text: 'ELEC\nIDLE', style });
    this._statusLabel.anchor.set(0.5);
    this.container.addChild(this._statusLabel);
  }

  /** Add water to the input buffer. Returns actual amount added. */
  addWater(qty: number): number {
    const space = ElectrolysisUnit.MAX_INPUT - this.inputBuffer;
    const added = Math.min(qty, space);
    this.inputBuffer += added;
    return added;
  }

  /** Pull hydrolox_fuel from the output buffer. Returns actual amount pulled. */
  pullHydrolox(qty: number): number {
    const pulled = Math.min(qty, this.outputBuffer);
    this.outputBuffer -= pulled;
    return pulled;
  }

  isNearby(px: number, py: number, radius = 80): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  update(delta: number): void {
    if (this.inputBuffer < ElectrolysisUnit.INPUT_PER_CYCLE) {
      this.state = 'IDLE';
      this._timer = 0;
      this._updateLabel();
      return;
    }

    if (this.outputBuffer >= ElectrolysisUnit.MAX_OUTPUT) {
      this.state = 'STALLED_OUTPUT';
      this._updateLabel();
      return;
    }

    this.state = 'RUNNING';
    this._timer += delta;

    // Complete as many full cycles as elapsed time allows
    while (
      this._timer >= ElectrolysisUnit.CYCLE_SECONDS &&
      this.inputBuffer >= ElectrolysisUnit.INPUT_PER_CYCLE &&
      this.outputBuffer < ElectrolysisUnit.MAX_OUTPUT
    ) {
      this._timer -= ElectrolysisUnit.CYCLE_SECONDS;
      this.inputBuffer  -= ElectrolysisUnit.INPUT_PER_CYCLE;
      this.outputBuffer += ElectrolysisUnit.OUTPUT_PER_CYCLE;
    }

    // Re-evaluate state after cycles
    if (this.inputBuffer < ElectrolysisUnit.INPUT_PER_CYCLE) {
      this.state = 'IDLE';
      this._timer = 0;
    } else if (this.outputBuffer >= ElectrolysisUnit.MAX_OUTPUT) {
      this.state = 'STALLED_OUTPUT';
    }

    this._updateLabel();
  }

  /** Current cycle progress 0–1 (for overlay progress bar). */
  get cycleProgress(): number {
    if (this.state !== 'RUNNING') return 0;
    return this._timer / ElectrolysisUnit.CYCLE_SECONDS;
  }

  private _updateLabel(): void {
    const stateAbbr = this.state === 'RUNNING' ? 'RUN' : this.state === 'STALLED_OUTPUT' ? 'FULL' : 'IDLE';
    this._statusLabel.text = `ELEC\n${stateAbbr}`;
  }
}
