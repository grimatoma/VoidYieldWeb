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
