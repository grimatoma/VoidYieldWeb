import { EventBus } from './EventBus';

export interface TutorialState {
  step: number;      // 1–7 = active step, 0 = not started/done
  completed: boolean;
  skipped: boolean;
}

export interface TutorialStepDef {
  id: number;
  title: string;
  description: string;
  targetElementId: string | null;  // CSS selector for highlight, null if canvas
  autoAdvanceEvent: string | null; // EventBus event name that auto-advances
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 1,
    title: 'Orientation',
    description: 'Welcome to VoidYield.\nYou are stranded on Asteroid A1 with a mining tool and 200 credits.\nYour goal: automate your operation and build a spaceship to escape.',
    targetElementId: null,
    autoAdvanceEvent: null,
  },
  {
    id: 2,
    title: 'Survey a Deposit',
    description: 'Walk up to an ore deposit (the colored circles on the map) and press [E] to survey it.\nDeposits show their ore type and yield.',
    targetElementId: '#hud-storage',
    autoAdvanceEvent: 'deposit:surveyed',
  },
  {
    id: 3,
    title: 'Build a Harvester',
    description: 'Harvesters automatically mine deposits while you do other work.\nWalk to an Industrial Site (yellow square) and interact with it to place a Harvester.',
    targetElementId: null,
    autoAdvanceEvent: 'harvester:built',
  },
  {
    id: 4,
    title: 'Collect Ore',
    description: 'Press [E] near a deposit to mine ore into your personal inventory.\nYour storage bar (top center) will fill up.',
    targetElementId: '#hud-storage',
    autoAdvanceEvent: 'ore:collected',
  },
  {
    id: 5,
    title: 'Sell Your Ore',
    description: 'Walk to the Storage Depot and press [E] to deposit and sell your ore.\nCredits are shown in the top-right corner.',
    targetElementId: '#hud-credits',
    autoAdvanceEvent: 'ore:sold',
  },
  {
    id: 6,
    title: 'Buy a Drone',
    description: 'Walk to the Drone Bay (blue BAY marker) and press [E] to purchase a Scout Drone.\nDrones automate your mining and hauling loop.',
    targetElementId: '#hud-drones',
    autoAdvanceEvent: 'drone:purchased',
  },
  {
    id: 7,
    title: 'Automate Your Operation',
    description: "You've unlocked the automation loop!\nBuild a second Harvester and assign your drone to maintain it.\nKeep building and automating to fund your escape rocket.",
    targetElementId: null,
    autoAdvanceEvent: null,
  },
];

class TutorialManager {
  private _state: TutorialState = { step: 0, completed: false, skipped: false };
  private _listenersRegistered = false;

  get step(): number { return this._state.step; }
  get completed(): boolean { return this._state.completed; }
  get skipped(): boolean { return this._state.skipped; }

  /** Returns true if the tutorial should be shown to this player. */
  shouldShow(): boolean {
    return !this._state.completed && !this._state.skipped;
  }

  /** Returns true if the tutorial is currently active. */
  isActive(): boolean {
    return this._state.step > 0 && !this._state.completed && !this._state.skipped;
  }

  getCurrentStep(): TutorialStepDef | null {
    return TUTORIAL_STEPS.find(s => s.id === this._state.step) ?? null;
  }

  /** Start the tutorial from step 1 (or resume from saved step). */
  start(): void {
    if (this._state.completed || this._state.skipped) return;
    if (this._state.step === 0) this._state.step = 1;
    this._registerListeners();
    EventBus.emit('tutorial:step_changed', this._state.step);
  }

  /** Advance to a specific step (or complete if > 7). */
  advance(toStep: number): void {
    if (!this.isActive()) return;
    if (toStep > TUTORIAL_STEPS.length) {
      this._complete();
      return;
    }
    this._state.step = toStep;
    EventBus.emit('tutorial:step_changed', toStep);
  }

  /** Skip the entire tutorial. */
  skip(): void {
    this._state.skipped = true;
    this._state.step = 0;
    EventBus.emit('tutorial:completed');
  }

  serialize(): TutorialState {
    return { ...this._state };
  }

  deserialize(data?: Partial<TutorialState>): void {
    if (!data) return;
    this._state = {
      step: data.step ?? 0,
      completed: data.completed ?? false,
      skipped: data.skipped ?? false,
    };
  }

  private _complete(): void {
    this._state.completed = true;
    this._state.step = 0;
    EventBus.emit('tutorial:completed');
  }

  private _registerListeners(): void {
    if (this._listenersRegistered) return;
    this._listenersRegistered = true;

    EventBus.on('deposit:surveyed', () => {
      if (this._state.step === 2) this.advance(3);
    });
    EventBus.on('harvester:built', () => {
      if (this._state.step === 3) this.advance(4);
    });
    EventBus.on('ore:collected', () => {
      if (this._state.step === 4) this.advance(5);
    });
    EventBus.on('ore:sold', () => {
      if (this._state.step === 5) this.advance(6);
    });
    EventBus.on('drone:purchased', () => {
      if (this._state.step === 6) this.advance(7);
    });
  }
}

export const tutorialManager = new TutorialManager();
