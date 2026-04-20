import { EventBus } from './EventBus';

export const FORMAT_VERSION = 1;
const SAVE_KEY = 'voidyield_savegame';
const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

/** Full save schema per spec 15. All fields required unless noted. */
export interface SaveData {
  format_version: number;
  last_save_timestamp: number;
  sector_number: number;
  current_planet: string;
  phase_flags: Record<string, number>;
  credits: number;
  research_points: number;
  tech_tree_unlocks: string[];
  sector_bonuses: string[];
  crafting_schematics_known: string[];
  stockpile_quantities: Record<string, Record<string, unknown>>;
  deposit_map: Record<string, unknown[]>;
  survey_waypoints: Record<string, unknown[]>;
  harvester_states: Record<string, unknown[]>;
  drone_task_queues: Record<string, unknown[]>;
  factory_states: Record<string, unknown[]>;
  population_data: Record<string, unknown>;
  need_satisfaction_state: Record<string, unknown>;
  active_trade_routes: unknown[];
  ship_fleet: unknown[];
  a2_visited?: boolean;
  void_cores_produced?: number;
  a3_unlocked?: boolean;
  planet_c_visited?: boolean;
}

export function defaultSaveData(): SaveData {
  return {
    format_version: FORMAT_VERSION,
    last_save_timestamp: Math.floor(Date.now() / 1000),
    sector_number: 1,
    current_planet: 'a1',
    phase_flags: { a1: 0, planet_b: 0, planet_c: 0, a3: 0 },
    credits: 200,
    research_points: 0,
    tech_tree_unlocks: [],
    sector_bonuses: [],
    crafting_schematics_known: [],
    stockpile_quantities: {},
    deposit_map: {},
    survey_waypoints: {},
    harvester_states: {},
    drone_task_queues: {},
    factory_states: {},
    population_data: {},
    need_satisfaction_state: {},
    active_trade_routes: [],
    ship_fleet: [],
  };
}

export class SaveManager {
  private autosaveHandle: ReturnType<typeof setInterval> | null = null;

  saveGame(data: SaveData): void {
    const snapshot: SaveData = {
      ...data,
      format_version: FORMAT_VERSION,
      last_save_timestamp: Math.floor(Date.now() / 1000),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      EventBus.emit('game:saved');
    } catch (err) {
      console.error('SaveManager: failed to write save', err);
    }
  }

  loadGame(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.format_version !== FORMAT_VERSION) {
        console.warn(`SaveManager: format mismatch (${parsed.format_version} vs ${FORMAT_VERSION}), resetting`);
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('SaveManager: corrupt save, resetting', err);
      return null;
    }
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  startAutosave(getState: () => SaveData): void {
    this.stopAutosave();
    this.autosaveHandle = setInterval(() => {
      this.saveGame(getState());
      EventBus.emit('save:autosave');
    }, AUTOSAVE_INTERVAL_MS);
  }

  stopAutosave(): void {
    if (this.autosaveHandle !== null) {
      clearInterval(this.autosaveHandle);
      this.autosaveHandle = null;
    }
  }
}

export const saveManager = new SaveManager();
