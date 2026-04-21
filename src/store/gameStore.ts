/**
 * gameStore — reactive signal layer for the HTML UI.
 *
 * Signals are the source of truth for the HUD and future HTML panels.
 * Services (GameState, FleetManager) write to these signals whenever
 * their internal state changes.  UI components read via effect().
 *
 * No imports from game services here — services import gameStore, not
 * the other way around, keeping the dependency graph acyclic.
 */
import { signal } from '@preact/signals-core';

/** Player credit balance (CR). */
export const credits = signal<number>(200);

/** ID of the planet the player is currently on (e.g. 'a1', 'planet_b'). */
export const currentPlanet = signal<string>('a1');

/** Total units currently held across all storage depots on the active planet. */
export const storageUsed = signal<number>(0);

/** Maximum storage capacity on the active planet (Phase 0 default: 1000). */
export const storageMax = signal<number>(1000);

/** Total drones registered with FleetManager. */
export const droneCount = signal<number>(0);

/**
 * Per-planet resource rail data (mock 11). Holds carried (inventory) and
 * pool (depot stockpile) counts for the three primary flavored ores.
 * Scenes update this object each frame. The HUD reads via effect().
 */
export interface PlanetResources {
  vorax:   { carried: number; pool: number; cap: number };
  krysite: { carried: number; pool: number; cap: number };
  aethite: { carried: number; pool: number; cap: number };
}

export const planetResources = signal<PlanetResources>({
  vorax:   { carried: 0, pool: 0, cap: 50 },
  krysite: { carried: 0, pool: 0, cap: 50 },
  aethite: { carried: 0, pool: 0, cap: 50 },
});

/** Outpost identifier shown in the HUD header (e.g. "A1"). */
export const outpostId = signal<string>('A1');
