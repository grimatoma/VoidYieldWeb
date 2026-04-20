import { EventBus } from './EventBus';
import { SaveData, defaultSaveData } from './SaveManager';

/** Central game state — mirrors Godot's game_state autoload. */
export class GameState {
  private _credits: number = 200;
  private _researchPoints: number = 0;
  private _currentPlanet: string = 'a1';
  private _phaseFlags: Record<string, number> = { a1: 0, planet_b: 0, planet_c: 0, a3: 0 };
  private _sectorNumber: number = 1;
  private _sectorBonuses: string[] = [];
  private _techTreeUnlocks: string[] = [];
  private _paused: boolean = false;
  private _a2Visited: boolean = false;
  private _voidCoresProduced: number = 0;
  private _a3Unlocked: boolean = false;

  get credits(): number { return this._credits; }
  get researchPoints(): number { return this._researchPoints; }
  get currentPlanet(): string { return this._currentPlanet; }
  get phaseFlags(): Readonly<Record<string, number>> { return this._phaseFlags; }
  get sectorNumber(): number { return this._sectorNumber; }
  get paused(): boolean { return this._paused; }
  get a2Visited(): boolean { return this._a2Visited; }
  get voidCoresProduced(): number { return this._voidCoresProduced; }
  get a3Unlocked(): boolean { return this._a3Unlocked; }

  addCredits(amount: number): void {
    this._credits = Math.max(0, this._credits + amount);
    EventBus.emit('credits:changed', this._credits);
  }

  setCredits(amount: number): void {
    this._credits = Math.max(0, amount);
    EventBus.emit('credits:changed', this._credits);
  }

  addResearchPoints(amount: number): void {
    this._researchPoints += amount;
    EventBus.emit('rp:changed', this._researchPoints);
  }

  spendResearchPoints(amount: number): boolean {
    if (this._researchPoints < amount) return false;
    this._researchPoints -= amount;
    EventBus.emit('rp:changed', this._researchPoints);
    return true;
  }

  addUnlock(nodeId: string): void {
    if (!this._techTreeUnlocks.includes(nodeId)) {
      this._techTreeUnlocks.push(nodeId);
    }
  }

  hasUnlock(nodeId: string): boolean {
    return this._techTreeUnlocks.includes(nodeId);
  }

  get techTreeUnlocks(): readonly string[] {
    return this._techTreeUnlocks;
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
    EventBus.emit('game:paused', paused);
  }

  setCurrentPlanet(planet: string): void {
    this._currentPlanet = planet;
    EventBus.emit('scene:changed', planet);
  }

  visitA2(): void {
    this._a2Visited = true;
    this._checkA3Unlock();
  }

  addVoidCoresProduced(n: number): void {
    this._voidCoresProduced += n;
    this._checkA3Unlock();
  }

  private _checkA3Unlock(): void {
    if (!this._a3Unlocked && this._a2Visited && this._voidCoresProduced >= 10) {
      this._a3Unlocked = true;
    }
  }

  serialize(): Partial<SaveData> {
    return {
      credits: this._credits,
      research_points: this._researchPoints,
      current_planet: this._currentPlanet,
      phase_flags: { ...this._phaseFlags },
      sector_number: this._sectorNumber,
      sector_bonuses: [...this._sectorBonuses],
      tech_tree_unlocks: [...this._techTreeUnlocks],
      a2_visited: this._a2Visited,
      void_cores_produced: this._voidCoresProduced,
      a3_unlocked: this._a3Unlocked,
    };
  }

  applyFromSave(data: SaveData): void {
    this._credits = data.credits;
    this._researchPoints = data.research_points;
    this._currentPlanet = data.current_planet;
    this._phaseFlags = { ...data.phase_flags };
    this._sectorNumber = data.sector_number;
    this._sectorBonuses = [...data.sector_bonuses];
    this._techTreeUnlocks = [...data.tech_tree_unlocks];
    this._a2Visited = (data as any).a2_visited ?? false;
    this._voidCoresProduced = (data as any).void_cores_produced ?? 0;
    this._a3Unlocked = (data as any).a3_unlocked ?? false;
  }

  reset(): void {
    const d = defaultSaveData();
    this._credits = d.credits;
    this._researchPoints = d.research_points;
    this._currentPlanet = d.current_planet;
    this._phaseFlags = { ...d.phase_flags };
    this._sectorNumber = d.sector_number;
    this._sectorBonuses = [];
    this._techTreeUnlocks = [];
    this._a2Visited = false;
    this._voidCoresProduced = 0;
    this._a3Unlocked = false;
    this._paused = false;
  }
}

export const gameState = new GameState();
