import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { AssemblySchematic } from '@data/schematics';
import type { StorageDepot } from './StorageDepot';
import { powerManager } from '@services/PowerManager';
import { consumptionManager } from '@services/ConsumptionManager';

export type AssemblyState = 'RUNNING' | 'STALLED_A' | 'STALLED_B' | 'STALLED_C' | 'NO_POWER' | 'IDLE';

export class AssemblyComplex {
  readonly x: number;
  readonly y: number;
  readonly container: Container;
  readonly schematic: AssemblySchematic;
  state: AssemblyState = 'IDLE';

  private inputDepot: StorageDepot | null = null;
  private outputDepot: StorageDepot | null = null;
  private batchTimer = 0;

  constructor(worldX: number, worldY: number, schematic: AssemblySchematic) {
    this.x = worldX;
    this.y = worldY;
    this.schematic = schematic;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: large 80×44 rect with purple border (3-slot building)
    const body = new Graphics();
    body.rect(-40, -22, 80, 44).fill(0x1A0A2A);
    body.rect(-40, -22, 80, 44).stroke({ width: 2, color: 0x9C27B0 });
    this.container.addChild(body);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#9C27B0' });
    const label = new Text({ text: 'AC', style });
    label.anchor.set(0.5);
    this.container.addChild(label);

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

    const batchInterval = 3600 / this.schematic.batchPerHr;
    this.batchTimer += delta * throttle * consumptionManager.productivityMultiplier;

    if (this.batchTimer >= batchInterval) {
      this.batchTimer -= batchInterval;

      const a = this.inputDepot.pull(this.schematic.inputTypeA, this.schematic.inputQtyA);
      if (a < this.schematic.inputQtyA) {
        if (a > 0) this.inputDepot.deposit([{ oreType: this.schematic.inputTypeA, quantity: a, attributes: {} }]);
        this.state = 'STALLED_A';
        return;
      }

      const b = this.inputDepot.pull(this.schematic.inputTypeB, this.schematic.inputQtyB);
      if (b < this.schematic.inputQtyB) {
        this.inputDepot.deposit([
          { oreType: this.schematic.inputTypeA, quantity: a, attributes: {} },
          { oreType: this.schematic.inputTypeB, quantity: b, attributes: {} },
        ]);
        this.state = 'STALLED_B';
        return;
      }

      const c = this.inputDepot.pull(this.schematic.inputTypeC, this.schematic.inputQtyC);
      if (c < this.schematic.inputQtyC) {
        this.inputDepot.deposit([
          { oreType: this.schematic.inputTypeA, quantity: a, attributes: {} },
          { oreType: this.schematic.inputTypeB, quantity: b, attributes: {} },
          { oreType: this.schematic.inputTypeC, quantity: c, attributes: {} },
        ]);
        this.state = 'STALLED_C';
        return;
      }

      this.outputDepot.deposit([{ oreType: this.schematic.outputType, quantity: this.schematic.outputQty, attributes: {} }]);
      this.state = 'RUNNING';
    }
  }

  destroy(): void {
    powerManager.unregisterConsumer(this.schematic.powerDraw);
  }
}
