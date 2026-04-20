import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ScoutDrone } from './ScoutDrone';
import { RefineryDrone } from './RefineryDrone';
import { HeavyDrone } from './HeavyDrone';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';

export class DroneBay {
  readonly container: Container;
  x: number;
  y: number;
  readonly serviceRadius = 400;

  private _drones: ScoutDrone[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const gfx = new Graphics();
    gfx.rect(-16, -16, 32, 32).stroke({ color: 0x2196F3, width: 2 }).fill(0x0D1B3E);
    this.container.addChild(gfx);

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#2196F3' });
    const label = new Text({ text: 'BAY', style });
    label.anchor.set(0.5);
    label.y = -24;
    this.container.addChild(label);
  }

  /**
   * Deduct 25 CR and return a new ScoutDrone at this bay's position.
   * Returns null if insufficient credits.
   */
  purchaseScout(worldContainer: Container): ScoutDrone | null {
    if (gameState.credits < ScoutDrone.COST) return null;
    gameState.addCredits(-ScoutDrone.COST);
    const drone = new ScoutDrone(this.x, this.y);
    worldContainer.addChild(drone.container);
    this._drones.push(drone);
    EventBus.emit('drone:purchased', 'scout');
    return drone;
  }

  getDrones(): readonly ScoutDrone[] {
    return this._drones;
  }

  purchaseRefineryDrone(worldContainer: Container): RefineryDrone | null {
    if (gameState.credits < RefineryDrone.COST) return null;
    gameState.addCredits(-RefineryDrone.COST);
    const drone = new RefineryDrone(this.x, this.y);
    worldContainer.addChild(drone.container);
    EventBus.emit('drone:purchased', 'refinery');
    return drone;
  }

  purchaseHeavyDrone(worldContainer: Container): HeavyDrone | null {
    if (gameState.credits < HeavyDrone.COST) return null;
    gameState.addCredits(-HeavyDrone.COST);
    const drone = new HeavyDrone(this.x, this.y);
    worldContainer.addChild(drone.container);
    EventBus.emit('drone:purchased', 'heavy');
    return drone;
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }
}
