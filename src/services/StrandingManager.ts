import { EventBus } from './EventBus';

class StrandingManager {
  private _rocketFuel = 100;  // starts at 100 for A1 (home planet)
  private _isStranded = false;
  private _arrivalFuel = 20;  // fuel remaining on Planet B arrival

  constructor() {
    // Reset stranding state on prestige; fuel is overridden if fuel_surplus bonus applies
    EventBus.on('prestige:reset', (_bonus: string, startFuel: number) => {
      this.reset();
      if (startFuel !== 100) {
        this.setFuel(startFuel);
      }
    });
  }

  /** Called when player arrives at Planet B for the first time. */
  arriveAtPlanetB(): void {
    this._rocketFuel = this._arrivalFuel;
    this._isStranded = true;
  }

  /** Add rocket fuel (from FuelSynthesizer production). */
  addFuel(units: number): void {
    this._rocketFuel = Math.min(this._rocketFuel + units, 200);
    if (this._rocketFuel >= 100) {
      this._isStranded = false;
    }
  }

  /** Consume fuel for launch. Returns true if successful. */
  consumeFuelForLaunch(units = 100): boolean {
    if (this._rocketFuel < units) return false;
    this._rocketFuel -= units;
    return true;
  }

  get rocketFuel(): number { return this._rocketFuel; }
  get isStranded(): boolean { return this._isStranded; }
  get canLaunch(): boolean { return this._rocketFuel >= 100; }

  /** Set fuel level directly (e.g. for fuel_surplus prestige bonus). */
  setFuel(units: number): void {
    this._rocketFuel = Math.max(0, Math.min(units, 200));
    if (this._rocketFuel >= 100) {
      this._isStranded = false;
    }
  }

  /** For save/load */
  serialize(): { rocketFuel: number; isStranded: boolean } {
    return { rocketFuel: this._rocketFuel, isStranded: this._isStranded };
  }

  deserialize(data: { rocketFuel: number; isStranded: boolean }): void {
    this._rocketFuel = data.rocketFuel;
    this._isStranded = data.isStranded;
  }

  reset(): void {
    this._rocketFuel = 100;
    this._isStranded = false;
  }
}

export const strandingManager = new StrandingManager();
