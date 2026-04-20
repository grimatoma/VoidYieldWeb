import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { RocketComponentData, RocketComponentType } from '@data/types';
import type { StorageDepot } from './StorageDepot';

export type LaunchpadState = 'BUILDING' | 'READY' | 'LAUNCHING' | 'LAUNCHED';

export class Launchpad {
  readonly x: number;
  readonly y: number;
  readonly container: Container;
  state: LaunchpadState = 'BUILDING';

  private components = new Map<RocketComponentType, RocketComponentData>();
  private _fuelUnits = 0;
  static readonly FUEL_REQUIRED = 100;
  static readonly FUEL_CAP = 150;

  private body!: Graphics;
  private rocketGraphic!: Graphics;
  private statusText!: Text;
  onLaunchReady?: () => void;  // callback when all ready

  constructor(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Visual: large 64×80 rect with amber border (3 slots wide)
    this.body = new Graphics();
    this.body.rect(-32, -40, 64, 80).fill(0x1A2A1A);
    this.body.rect(-32, -40, 64, 80).stroke({ width: 2, color: 0xD4A843 });
    this.container.addChild(this.body);

    // Rocket ghost silhouette (triangle = rocket tip, rect = body)
    this.rocketGraphic = new Graphics();
    this._drawRocket();
    this.container.addChild(this.rocketGraphic);

    // Status label
    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#D4A843' });
    this.statusText = new Text({ text: 'LPAD\n0/5', style });
    this.statusText.anchor.set(0.5, 1);
    this.statusText.y = 36;
    this.container.addChild(this.statusText);
  }

  private _drawRocket(): void {
    this.rocketGraphic.clear();
    const installed = this.components.size;
    const alpha = 0.15 + (installed / 5) * 0.7;  // ghost → solid
    // Simple rocket shape: narrow rect topped with triangle
    this.rocketGraphic.rect(-8, -35, 16, 28).fill({ color: 0x888888, alpha });
    // Tip (triangle via poly)
    this.rocketGraphic.poly([-8, -35, 8, -35, 0, -48]).fill({ color: 0xAAAAAA, alpha });
    // Engine nozzle
    this.rocketGraphic.rect(-10, -7, 20, 6).fill({ color: 0x666666, alpha });
  }

  private _updateStatus(): void {
    const installed = this.components.size;
    this.statusText.text = `LPAD\n${installed}/5`;
    this._drawRocket();

    // Check launch ready
    if (installed === 5 && this._fuelUnits >= Launchpad.FUEL_REQUIRED && this.state === 'BUILDING') {
      this.state = 'READY';
      this.onLaunchReady?.();
    }
  }

  /** Install a rocket component. Returns true if newly installed. */
  installComponent(component: RocketComponentData): boolean {
    if (this.components.has(component.componentType)) return false;
    this.components.set(component.componentType, component);
    this._updateStatus();
    return true;
  }

  /** Load fuel from a storage depot. Returns units loaded. */
  loadFuel(depot: StorageDepot): number {
    const needed = Launchpad.FUEL_CAP - this._fuelUnits;
    if (needed <= 0) return 0;
    const pulled = depot.pull('rocket_fuel', needed);
    this._fuelUnits += pulled;
    this._updateStatus();
    return pulled;
  }

  getInstalledComponents(): Map<RocketComponentType, RocketComponentData> {
    return this.components;
  }

  get fuelUnits(): number { return this._fuelUnits; }
  get componentsInstalled(): number { return this.components.size; }
  get isLaunchReady(): boolean {
    return this.components.size === 5 && this._fuelUnits >= Launchpad.FUEL_REQUIRED;
  }

  /** Trigger launch sequence. Returns true if launched. */
  launch(): boolean {
    if (!this.isLaunchReady) return false;
    this.state = 'LAUNCHING';
    this._fuelUnits -= Launchpad.FUEL_REQUIRED;
    // Clear rocket graphic (it has "launched")
    this.rocketGraphic.clear();
    this.statusText.text = 'LPAD\nLNCD';
    this.state = 'LAUNCHED';
    return true;
  }

  isNearby(px: number, py: number, radius = 60): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }
}
