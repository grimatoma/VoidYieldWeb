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

  get credits(): number { return this._credits; }
  get researchPoints(): number { return this._researchPoints; }
  get currentPlanet(): string { return this._currentPlanet; }
  get phaseFlags(): Readonly<Record<string, number>> { return this._phaseFlags; }
  get sectorNumber(): number { return this._sectorNumber; }
  get paused(): boolean { return this._paused; }

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

  setPaused(paused: boolean): void {
    this._paused = paused;
    EventBus.emit('game:paused', paused);
  }

  setCurrentPlanet(planet: string): void {
    this._currentPlanet = planet;
    EventBus.emit('scene:changed', planet);
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
    this._paused = false;
  }
}

export const gameState = new GameState();
