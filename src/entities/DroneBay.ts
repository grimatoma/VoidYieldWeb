import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { makeAnimatedSprite } from '@services/SpriteSheetHelper';
import { DroneBase } from './DroneBase';
import { ScoutDrone } from './ScoutDrone';
import { RefineryDrone } from './RefineryDrone';
import { HeavyDrone } from './HeavyDrone';
import { SurveyDrone } from './SurveyDrone';
import { BuilderDrone } from './BuilderDrone';
import { CargoDrone } from './CargoDrone';
import { RepairDrone } from './RepairDrone';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import { assetManager } from '@services/AssetManager';
import { fleetManager } from '@services/FleetManager';
import type { DroneType } from '@data/types';

export class DroneBay {
  readonly container: Container;
  x: number;
  y: number;
  readonly serviceRadius = 400;

  private _drones: DroneBase[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    const anim = makeAnimatedSprite('sheet_drone_bay', { frameCount: 8, frameWidth: 64, frameHeight: 64 });
    if (anim) {
      anim.anchor.set(0.5);
      this.container.addChild(anim);
    } else if (assetManager.has('building_drone_bay')) {
      const s = new Sprite(assetManager.texture('building_drone_bay'));
      s.anchor.set(0.5);
      s.width = 64;
      s.height = 64;
      this.container.addChild(s);
    } else {
      const gfx = new Graphics();
      gfx.rect(-16, -16, 32, 32).stroke({ color: 0x2196F3, width: 2 }).fill(0x0D1B3E);
      this.container.addChild(gfx);
    }

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#2196F3' });
    const label = new Text({ text: 'DRONE BAY', style });
    label.anchor.set(0.5);
    label.y = 40;
    this.container.addChild(label);
  }

  getDrones(): readonly DroneBase[] {
    return this._drones;
  }

  /**
   * Generic purchase method for all drone types.
   * Deduct credits and return a new drone at this bay's position.
   * Returns null if insufficient credits.
   */
  purchase(droneType: DroneType, worldContainer: Container): DroneBase | null {
    const costs: Record<DroneType, number> = {
      scout: ScoutDrone.COST,
      heavy: HeavyDrone.COST,
      refinery: RefineryDrone.COST,
      survey: SurveyDrone.COST,
      builder: BuilderDrone.COST,
      cargo: CargoDrone.COST,
      repair: RepairDrone.COST,
    };

    const cost = costs[droneType];
    if (gameState.credits < cost) return null;

    gameState.addCredits(-cost);

    const factories: Record<DroneType, (x: number, y: number) => DroneBase> = {
      scout: (x, y) => new ScoutDrone(x, y),
      heavy: (x, y) => new HeavyDrone(x, y),
      refinery: (x, y) => new RefineryDrone(x, y),
      survey: (x, y) => new SurveyDrone(x, y),
      builder: (x, y) => new BuilderDrone(x, y),
      cargo: (x, y) => new CargoDrone(x, y),
      repair: (x, y) => new RepairDrone(x, y),
    };

    const drone = factories[droneType](this.x, this.y);
    worldContainer.addChild(drone.container);
    this._drones.push(drone);
    fleetManager.add(drone);
    EventBus.emit('drone:purchased', droneType);
    return drone;
  }

  /**
   * Deduct 25 CR and return a new ScoutDrone at this bay's position.
   * Returns null if insufficient credits.
   * @deprecated Use purchase() instead
   */
  purchaseScout(worldContainer: Container): ScoutDrone | null {
    const drone = this.purchase('scout', worldContainer);
    return drone as ScoutDrone | null;
  }

  /**
   * @deprecated Use purchase() instead
   */
  purchaseRefineryDrone(worldContainer: Container): RefineryDrone | null {
    const drone = this.purchase('refinery', worldContainer);
    return drone as RefineryDrone | null;
  }

  /**
   * @deprecated Use purchase() instead
   */
  purchaseHeavyDrone(worldContainer: Container): HeavyDrone | null {
    const drone = this.purchase('heavy', worldContainer);
    return drone as HeavyDrone | null;
  }

  isNearby(px: number, py: number, radius = 40): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getInteractionPrompt(): { verb: string; target: string } | null {
    return { verb: 'OPEN', target: 'DRONE BAY' };
  }
}
