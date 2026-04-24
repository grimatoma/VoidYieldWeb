import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { OreType, QualityLot } from '@data/types';
import type { Schematic } from '@data/schematics';
import type { StorageDepot } from './StorageDepot';
import { powerManager } from '@services/PowerManager';
import { consumptionManager } from '@services/ConsumptionManager';

export type PlantState = 'RUNNING' | 'STALLED' | 'NO_POWER';

export class ProcessingPlant {
  readonly x: number;
  readonly y: number;
  readonly container: Container;
  readonly schematic: Schematic;
  state: PlantState = 'STALLED';

  /**
   * When true the plant does NOT auto-pull from the input depot on its timer;
   * input must arrive via insertBatch(). When false, the existing auto-pull
   * behaviour runs unchanged.
   */
  manualOnly = false;

  private inputDepot: StorageDepot | null = null;
  private outputDepot: StorageDepot | null = null;
  private batchTimer = 0;
  /** Manual input buffer — units available to consume in the next batch. */
  private _inputBuffer = 0;
  /** Manual output buffer — finished products waiting to be taken. */
  private _outputBuffer = 0;
  private label!: Text;

  constructor(worldX: number, worldY: number, schematic: Schematic) {
    this.x = worldX;
    this.y = worldY;
    this.schematic = schematic;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: dark rect 40x40 with teal border
    const body = new Graphics();
    body.rect(-20, -20, 40, 40).fill(0x1A3A4A);
    body.rect(-20, -20, 40, 40).stroke({ width: 2, color: 0x00B8D4 });
    this.container.addChild(body);

    // Plant label — show abbreviated recipe name
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: '#00B8D4' });
    const abbrev = schematic.name.length > 6 ? schematic.name.slice(0, 6) : schematic.name;
    this.label = new Text({ text: abbrev.toUpperCase(), style });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);

    // Register power consumption
    powerManager.registerConsumer(schematic.powerDraw);
  }

  /**
   * Link input and output depots.
   * The plant will pull inputs from inputDepot and deposit outputs to outputDepot.
   */
  link(inputDepot: StorageDepot, outputDepot: StorageDepot): void {
    this.inputDepot = inputDepot;
    this.outputDepot = outputDepot;
  }

  /**
   * Update plant state and run batches if possible.
   * batchInterval = 60 / batchPerMin seconds
   */
  update(delta: number): void {
    // If not manualOnly and output depot is missing, stall.
    // If manualOnly, we can run even without an outputDepot, as long as outputBuffer isn't full.
    if (!this.manualOnly && !this.outputDepot) {
      this.state = 'STALLED';
      return;
    }

    // manualOnly mode: inputDepot is not required — input comes from insertBatch().
    if (!this.manualOnly && !this.inputDepot) {
      this.state = 'STALLED';
      return;
    }

    // When no outputDepot is linked, stall if the internal fallback buffer is full.
    const maxOutputBuffer = this.schematic.outputQty * 10;
    if (this.manualOnly && !this.outputDepot && this._outputBuffer >= maxOutputBuffer) {
      this.state = 'STALLED';
      return;
    }

    const throttle = powerManager.throttleMultiplier;
    if (throttle === 0) {
      this.state = 'NO_POWER';
      return;
    }

    const batchInterval = 60 / this.schematic.batchPerMin;
    this.batchTimer += delta * throttle * consumptionManager.productivityMultiplier;

    if (this.batchTimer >= batchInterval) {
      this.batchTimer -= batchInterval;

      let inputConsumed = 0;
      if (this.manualOnly) {
        // Consume from the manual input buffer instead of pulling from depot.
        if (this._inputBuffer >= this.schematic.inputQty) {
          this._inputBuffer -= this.schematic.inputQty;
          inputConsumed = this.schematic.inputQty;
        }
      } else {
        // Auto-pull from linked input depot.
        inputConsumed = this.inputDepot!.pull(this.schematic.inputType, this.schematic.inputQty);
      }

      if (inputConsumed > 0) {
        if (this.manualOnly) {
          if (this.outputDepot) {
            // Deposit directly to the linked depot so drones and players can pick it up.
            const outputLot: QualityLot = {
              oreType: this.schematic.outputType as OreType,
              quantity: this.schematic.outputQty,
              attributes: {},
            };
            this.outputDepot.deposit([outputLot]);
          } else {
            this._outputBuffer += this.schematic.outputQty;
          }
          this.state = 'RUNNING';
        } else {
          // Produce output lot and send to depot
          const outputLot: QualityLot = {
            oreType: this.schematic.outputType as OreType,
            quantity: this.schematic.outputQty,
            attributes: {},
          };
          this.outputDepot!.deposit([outputLot]);
          this.state = 'RUNNING';
        }
      } else {
        this.state = 'STALLED';
      }
    }
  }

  /** 0–1 progress through the current batch interval, 0 when no input is loaded. */
  get batchProgress(): number { 
    if (this._inputBuffer < this.schematic.inputQty) return 0;
    const interval = 60 / this.schematic.batchPerMin;
    return Math.min(1, this.batchTimer / interval);
  }

  /** True when the buffer holds enough ore for the next batch. */
  get hasInput(): boolean {
    return this._inputBuffer >= this.schematic.inputQty;
  }

  get inputBuffer(): number { return this._inputBuffer; }
  get outputBuffer(): number { return this._outputBuffer; }

  /**
   * Push ore into the manual input buffer.
   * Only accepted when oreType matches this plant's schematic input.
   * Returns the amount actually accepted (capped by remaining space).
   */
  insertBatch(oreType: OreType, qty: number): number {
    if (oreType !== this.schematic.inputType) return 0;
    const maxBuffer = this.schematic.inputQty * 10;
    const space = Math.max(0, maxBuffer - this._inputBuffer);
    const accepted = Math.min(qty, space);
    this._inputBuffer += accepted;
    return accepted;
  }

  /** Takes accumulated product from the output buffer. */
  takeOutput(): QualityLot | null {
    if (this._outputBuffer <= 0) return null;
    const lot: QualityLot = {
      oreType: this.schematic.outputType as OreType,
      quantity: this._outputBuffer,
      attributes: {},
    };
    this._outputBuffer = 0;
    return lot;
  }

  destroy(): void {
    powerManager.unregisterConsumer(this.schematic.powerDraw);
  }

  isNearby(px: number, py: number, radius = 50): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'OPEN', target: 'PRODUCTION' };
  }
}
