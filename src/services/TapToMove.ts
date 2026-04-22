import type { Player } from '@entities/Player';
import { depositMap } from './DepositMap';
import { miningService } from './MiningService';

/** How generous the hit-box is when resolving a tap to a deposit. The
 *  deposit's visual radius is ~16px; we add slop so thumb taps land. */
const TAP_PICK_RADIUS = 32;

/**
 * Route a world-space tap to either a path-following walk or an
 * auto-interact walk-and-mine. Called by every planet scene's
 * `camera.onTap` handler.
 *
 * - If the tap lands near an active (non-exhausted) ore deposit, walk the
 *   player to that deposit via pathfinding and auto-start hold-mining on
 *   arrival. Any previously running auto-mine is cancelled first so a new
 *   tap always takes precedence.
 * - Otherwise, just walk toward the tap point.
 */
export function handleWorldTap(player: Player, wx: number, wy: number): void {
  // Any new tap cancels any in-progress auto-mine from a prior arrival so
  // the player stops hammering the previous rock if you re-route mid-hold.
  miningService.onInteractReleased();

  const deposit = depositMap.getNearestDeposit(wx, wy, TAP_PICK_RADIUS);
  if (deposit && !deposit.data.isExhausted) {
    const dx = deposit.data.x;
    const dy = deposit.data.y;
    player.setMoveTarget(dx, dy, () => {
      miningService.onInteract(player.x, player.y);
    });
    return;
  }
  player.setMoveTarget(wx, wy);
}
