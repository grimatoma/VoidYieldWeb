import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { QualityLot } from '@data/types';
import type { FabricatorSchematic } from '@data/schematics';
import type { StorageDepot } from './StorageDepot';
import { powerManager } from '@services/PowerManager';
import { consumptionManager } from '@services/ConsumptionManager';

export type FabricatorState = 'RUNNING' | 'STALLED_A' | 'STALLED_B' | 'NO_POWER' | 'IDLE';

export class Fabricator {
  readonly x: number;
  readonly y: number;
  readonly container: Container;
  readonly schematic: FabricatorSchematic;
  state: FabricatorState = 'IDLE';

  private inputDepot: StorageDepot | null = null;
  private outputDepot: StorageDepot | null = null;
  private batchTimer = 0;
  private label!: Text;

  constructor(worldX: number, worldY: number, schematic: FabricatorSchematic) {
    this.x = worldX;
    this.y = worldY;
    this.schematic = schematic;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: wider rect 56x40 with amber border (2-slot building)
    const body = new Graphics();
    body.rect(-28, -20, 56, 40).fill(0x2A1A3A);
    body.rect(-28, -20, 56, 40).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(body);

    // "F" label
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#D4A843' });
    this.label = new Text({ text: 'F', style });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);

    // Register power consumption
    powerManager.registerConsumer(schematic.powerDraw);
  }

  link(inputDepot: StorageDepot, outputDepot: StorageDepot): void {
    this.inputDepot = inputDepot;
    this.outputDepot = outputDepot;
  }

  update(delta: number): void {
    if (!this.inputDepot || !this.outputDepot) {
      this.state = 'IDLE';
      return;
    }

    const throttle = powerManager.throttleMultiplier;
    if (throttle === 0) {
      this.state = 'NO_POWER';
      return;
    }

    // batchPerHr → seconds per batch
    const batchInterval = 3600 / this.schematic.batchPerHr;
    this.batchTimer += delta * throttle * consumptionManager.productivityMultiplier;

    if (this.batchTimer >= batchInterval) {
      this.batchTimer -= batchInterval;

      // Check input A
      const availA = this.inputDepot.pull(this.schematic.inputTypeA, this.schematic.inputQtyA);
      if (availA < this.schematic.inputQtyA) {
        // put back what we took (partial pull)
        // StorageDepot.deposit accepts QualityLot[]
        if (availA > 0) {
          this.inputDepot.deposit([{ oreType: this.schematic.inputTypeA, quantity: availA, attributes: {} }]);
        }
        this.state = 'STALLED_A';
        return;
      }

      // Check input B
      const availB = this.inputDepot.pull(this.schematic.inputTypeB, this.schematic.inputQtyB);
      if (availB < this.schematic.inputQtyB) {
        // return both
        this.inputDepot.deposit([
          { oreType: this.schematic.inputTypeA, quantity: availA, attributes: {} },
          { oreType: this.schematic.inputTypeB, quantity: availB, attributes: {} },
        ]);
        this.state = 'STALLED_B';
        return;
      }

      // Produce output
      const outputLot: QualityLot = {
        oreType: this.schematic.outputType,
        quantity: this.schematic.outputQty,
        attributes: {},
      };
      this.outputDepot.deposit([outputLot]);
      this.state = 'RUNNING';
    }
  }

  destroy(): void {
    powerManager.unregisterConsumer(this.schematic.powerDraw);
  }
}
