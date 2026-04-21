/**
 * SettingsManager — localStorage-backed application settings.
 * Handles audio, display, and UI preferences.
 */

const SETTINGS_KEY = 'voidyield_settings';

export interface GameSettings {
  masterVolume: number;      // 0–1, default 1.0
  sfxVolume: number;         // 0–1, default 1.0
  musicVolume: number;       // 0–1, default 0.8
  fullscreenOnStart: boolean; // default false
  uiScale: number;           // 0.6–1.6, default 1.0
  showFps: boolean;          // default false
}

class SettingsManagerImpl {
  private _settings: GameSettings;

  constructor() {
    this._settings = this._load();
  }

  get settings(): Readonly<GameSettings> {
    return this._settings;
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this._settings[key] = value;
    this._save();
  }

  reset(): void {
    this._settings = this._defaults();
    this._save();
  }

  private _defaults(): GameSettings {
    return {
      masterVolume: 1.0,
      sfxVolume: 1.0,
      musicVolume: 0.8,
      fullscreenOnStart: false,
      uiScale: 1.0,
      showFps: false,
    };
  }

  private _load(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return this._defaults();
      }
      return { ...this._defaults(), ...JSON.parse(raw) };
    } catch {
      return this._defaults();
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._settings));
    } catch {
      // localStorage unavailable or quota exceeded; silently fail
    }
  }
}

export const settingsManager = new SettingsManagerImpl();
