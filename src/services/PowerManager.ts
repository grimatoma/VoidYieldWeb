export class PowerManager {
  private _generation = 0;   // total Power/sec from generators
  private _consumption = 0;  // total Power/sec from consumers

  registerGenerator(powerPerSec: number): void {
    this._generation += powerPerSec;
  }

  unregisterGenerator(powerPerSec: number): void {
    this._generation = Math.max(0, this._generation - powerPerSec);
  }

  registerConsumer(powerPerSec: number): void {
    this._consumption += powerPerSec;
  }

  unregisterConsumer(powerPerSec: number): void {
    this._consumption = Math.max(0, this._consumption - powerPerSec);
  }

  get balance(): number {
    return this._generation - this._consumption;
  }

  /** 1.0 if power positive, 0.5 if negative, 0 if no generation and consumers exist. */
  get throttleMultiplier(): number {
    if (this._consumption === 0) return 1.0;
    if (this._generation === 0) return 0;
    return this.balance >= 0 ? 1.0 : 0.5;
  }

  reset(): void {
    this._generation = 0;
    this._consumption = 0;
  }
}

export const powerManager = new PowerManager();
