import { EventBus } from './EventBus';

/**
 * Anything the player can press E on. Minimal contract so both deposits and
 * buildings can register.
 */
export interface Interactable {
  readonly x: number;
  readonly y: number;
  /** Reach-check: is the player within range? */
  isNearby(px: number, py: number, radius?: number): boolean;
  /** Verb + target shown in the world-space prompt, e.g. "MINE VORAX". */
  getInteractionPrompt(): { verb: string; target: string; progress?: number } | null;
}

export interface InteractionTarget {
  ref: Interactable;
  worldX: number;
  worldY: number;
  verb: string;
  target: string;
  progress: number; // 0..1 (hold-to-mine progress or similar)
}

/**
 * Per-frame "nearest interactable" resolver. Scenes register their
 * interactable candidates in enter() and clear on exit().
 */
class InteractionManagerImpl {
  private candidates: Interactable[] = [];
  private _current: InteractionTarget | null = null;
  private _reachRadius = 48;

  register(c: Interactable): void {
    if (!this.candidates.includes(c)) this.candidates.push(c);
  }

  unregister(c: Interactable): void {
    const i = this.candidates.indexOf(c);
    if (i >= 0) this.candidates.splice(i, 1);
  }

  clear(): void {
    this.candidates = [];
    if (this._current) {
      this._current = null;
      EventBus.emit('interaction:target', null);
    }
  }

  get current(): InteractionTarget | null { return this._current; }

  /** Call from scene.update. Picks nearest with an active prompt. */
  update(px: number, py: number): void {
    let best: Interactable | null = null;
    let bestD2 = this._reachRadius * this._reachRadius;
    let bestPrompt: { verb: string; target: string; progress?: number } | null = null;
    for (const c of this.candidates) {
      const prompt = c.getInteractionPrompt();
      if (!prompt) continue;
      const dx = c.x - px;
      const dy = c.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = c;
        bestPrompt = prompt;
      }
    }
    if (best && bestPrompt) {
      const next: InteractionTarget = {
        ref: best,
        worldX: best.x,
        worldY: best.y,
        verb: bestPrompt.verb,
        target: bestPrompt.target,
        progress: bestPrompt.progress ?? 0,
      };
      if (
        !this._current ||
        this._current.ref !== next.ref ||
        this._current.verb !== next.verb ||
        this._current.target !== next.target ||
        this._current.progress !== next.progress
      ) {
        this._current = next;
        EventBus.emit('interaction:target', next);
      }
    } else if (this._current) {
      this._current = null;
      EventBus.emit('interaction:target', null);
    }
  }
}

export const interactionManager = new InteractionManagerImpl();
