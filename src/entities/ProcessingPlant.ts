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

  private inputDepot: StorageDepot | null = null;
  private outputDepot: StorageDepot | null = null;
  private batchTimer = 0;
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

    // Plant label
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#00B8D4' });
    this.label = new Text({ text: 'P', style });
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
    if (!this.inputDepot || !this.outputDepot) {
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

      // Try to pull input
      const inputAvailable = this.inputDepot.pull(this.schematic.inputType, this.schematic.inputQty);

      if (inputAvailable > 0) {
        // Produce output lot
        const outputLot: QualityLot = {
          oreType: this.schematic.outputType as OreType,
          quantity: this.schematic.outputQty,
          attributes: {},
        };
        this.outputDepot.deposit([outputLot]);
        this.state = 'RUNNING';
      } else {
        this.state = 'STALLED';
      }
    }
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
