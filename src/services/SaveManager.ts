import { EventBus } from './EventBus';
import type { PlacedEntry } from './BuildGrid';
import type { DroneBaySlotData } from './OutpostDispatcher';

export const FORMAT_VERSION = 3;
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
  sector_manager?: { sectorBonuses: string[]; warpGateBuilt: boolean; galacticHubBuilt: boolean };
  stranding_manager?: { rocketFuel: number; isStranded: boolean };
  tutorial_state?: { step: number; completed: boolean; skipped: boolean };
  max_active_drones?: number;
  outpost?: {
    grid: PlacedEntry[];
    furnaceRecipe: 'iron' | 'copper' | 'off';
    stockpile: Record<string, number>;
    droneSlots: DroneBaySlotData[];
    playerX: number;
    playerY: number;
    roads?: string[];
  };
}

/**
 * Migration table: each key is the FROM version; the function returns a SaveData
 * migrated to the next version. Migrations run in sequence until FORMAT_VERSION
 * is reached, so saves from any past version are always recoverable.
 */
// eslint-disable-next-line @typescript-eslint/no-use-before-define
const MIGRATIONS: Record<number, (data: unknown) => SaveData> = {
  // v1 -> v2: introduced stranding_manager field -- fill missing field with default
  1: (data: unknown) => ({
    ...defaultSaveData(),
    ...(data as Partial<SaveData>),
    format_version: 2,
    stranding_manager: (data as Partial<SaveData>).stranding_manager
      ?? { rocketFuel: 100, isStranded: false },
  }),
  // v2 -> v3: reset per-planet cruft, set current_planet to 'outpost'
  2: (data: unknown) => ({
    ...defaultSaveData(),
    credits: (data as Partial<SaveData>).credits ?? 200,
    research_points: (data as Partial<SaveData>).research_points ?? 0,
    tech_tree_unlocks: (data as Partial<SaveData>).tech_tree_unlocks ?? [],
    format_version: 3,
    current_planet: 'outpost',
  }),
};

export function defaultSaveData(): SaveData {
  return {
    format_version: FORMAT_VERSION,
    last_save_timestamp: Math.floor(Date.now() / 1000),
    sector_number: 1,
    current_planet: 'outpost',
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
      let parsed = JSON.parse(raw) as SaveData;
      // Run migrations in sequence if version is behind
      if (parsed.format_version !== FORMAT_VERSION) {
        let version = parsed.format_version ?? 1;
        if (version > FORMAT_VERSION) {
          console.warn(`SaveManager: save is from a newer version (${version}), resetting`);
          return null;
        }
        console.info(`SaveManager: migrating save from v${version} to v${FORMAT_VERSION}`);
        while (version < FORMAT_VERSION) {
          const migrate = MIGRATIONS[version];
          if (!migrate) {
            console.warn(`SaveManager: no migration path from v${version}, resetting`);
            return null;
          }
          parsed = migrate(parsed) as SaveData;
          version++;
        }
      }

      // Check for offline simulation (5+ minutes since last save)
      const now = Math.floor(Date.now() / 1000);
      const lastSave = parsed.last_save_timestamp ?? now;
      const offlineSeconds = now - lastSave;
      if (offlineSeconds >= 300) {
        // Emit after a short delay so game systems can initialize first
        setTimeout(() => {
          EventBus.emit('offline:simulation_needed', offlineSeconds);
        }, 1000);
      }

      return parsed;
    } catch (err) {
      console.error('SaveManager: corrupt save, resetting', err);
      return null;
    }
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
    EventBus.emit('save:autosave'); // notify any UI watching save state
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
