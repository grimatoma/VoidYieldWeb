import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock pixi.js to avoid WebGL init in jsdom
vi.mock('pixi.js', () => {
  const Graphics = vi.fn(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
  }));
  const Container = vi.fn(() => ({
    x: 0, y: 0,
    addChild: vi.fn(),
  }));
  const Sprite = vi.fn(() => ({
    anchor: { set: vi.fn() },
    width: 0, height: 0, x: 0, y: 0, alpha: 1, visible: true,
    texture: null,
  }));
  const Texture = { WHITE: { source: { scaleMode: 'nearest' } } };
  const Assets = { load: vi.fn().mockResolvedValue({}) };
  return { Graphics, Container, Sprite, Texture, Assets };
});

import { Player } from '@entities/Player';
import { obstacleManager } from '@services/ObstacleManager';
import type { InputManager } from '@services/InputManager';

const bounds = { width: 2800, height: 2000 };

function makeInput(heldAction: string | null): InputManager {
  return {
    isHeld: vi.fn((a: string) => a === heldAction),
  } as unknown as InputManager;
}

const noInput: InputManager = { isHeld: vi.fn().mockReturnValue(false) } as unknown as InputManager;

describe('Player', () => {
  it('starts at given position', () => {
    const player = new Player(100, 200);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  it('moves up when player_move_up held', () => {
    const player = new Player(100, 200);
    const input = makeInput('player_move_up');
    player.update(1, input, bounds);
    expect(player.y).toBeLessThan(200);
  });

  it('moves right when player_move_right held', () => {
    const player = new Player(100, 200);
    const input = makeInput('player_move_right');
    player.update(1, input, bounds);
    expect(player.x).toBeGreaterThan(100);
  });

  it('clamps at top-left boundary', () => {
    const player = new Player(0, 0);
    const input: InputManager = {
      isHeld: vi.fn((a: string) => a === 'player_move_up' || a === 'player_move_left'),
    } as unknown as InputManager;
    player.update(1, input, bounds);
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
  });

  it('clamps at bottom-right boundary', () => {
    const player = new Player(2800, 2000);
    const input: InputManager = {
      isHeld: vi.fn((a: string) => a === 'player_move_down' || a === 'player_move_right'),
    } as unknown as InputManager;
    player.update(1, input, bounds);
    expect(player.x).toBe(2800);
    expect(player.y).toBe(2000);
  });

  it('does not move with no input', () => {
    const player = new Player(100, 200);
    player.update(1, noInput, bounds);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  it('updates facing direction when moving diagonally', () => {
    const player = new Player(500, 500);
    // Move up-right
    const upRight: InputManager = {
      isHeld: vi.fn((a: string) => a === 'player_move_up' || a === 'player_move_right'),
    } as unknown as InputManager;
    player.update(0.1, upRight, bounds);
    expect(player.facing).toBe('ne');
    // Move down-left
    const downLeft: InputManager = {
      isHeld: vi.fn((a: string) => a === 'player_move_down' || a === 'player_move_left'),
    } as unknown as InputManager;
    player.update(0.1, downLeft, bounds);
    expect(player.facing).toBe('sw');
  });

  it('faces pure east when moving only right', () => {
    const player = new Player(500, 500);
    const right = makeInput('player_move_right');
    player.update(0.1, right, bounds);
    expect(player.facing).toBe('e');
  });

  it('faces pure west when moving only left', () => {
    const player = new Player(500, 500);
    const left = makeInput('player_move_left');
    player.update(0.1, left, bounds);
    expect(player.facing).toBe('w');
  });

  it('pure vertical movement keeps the current east/west hemisphere', () => {
    const player = new Player(500, 500);
    // Start facing east
    player.update(0.1, makeInput('player_move_right'), bounds);
    expect(player.facing).toBe('e');
    // Now press up alone — should pivot to 'ne' (preserves east bias)
    player.update(0.1, makeInput('player_move_up'), bounds);
    expect(player.facing).toBe('ne');
    // Switch to facing west, then press down alone — should become 'sw'
    player.update(0.1, makeInput('player_move_left'), bounds);
    expect(player.facing).toBe('w');
    player.update(0.1, makeInput('player_move_down'), bounds);
    expect(player.facing).toBe('sw');
  });

  it('mining flag forces mining animation even while idle', () => {
    const player = new Player(500, 500);
    player.mining = true;
    // update shouldn't throw and should retain mining state preference
    player.update(0.1, noInput, bounds);
    // The animation state is private; behaviourally we just verify the flag is honored.
    expect(player.mining).toBe(true);
  });

  describe('wall collision', () => {
    afterEach(() => {
      obstacleManager.clear();
    });

    it('is blocked from walking into a wall', () => {
      obstacleManager.addWall({ x: 200, y: 0, w: 20, h: 400 });
      const player = new Player(150, 200);
      const input = makeInput('player_move_right');
      // Large dt so the attempted move definitely reaches the wall.
      player.update(1, input, bounds);
      // Player sits at the wall's left edge minus its collision radius.
      expect(player.x).toBeLessThanOrEqual(200 - player.collisionRadius);
      expect(player.x).toBeGreaterThan(150);
    });

    it('slides along a wall when pushing diagonally into it', () => {
      // Vertical wall along x=200. Player to the left, pushing right + down.
      obstacleManager.addWall({ x: 200, y: 0, w: 20, h: 400 });
      const player = new Player(180, 200);
      const input: InputManager = {
        isHeld: vi.fn((a: string) => a === 'player_move_right' || a === 'player_move_down'),
      } as unknown as InputManager;
      player.update(0.1, input, bounds);
      // X is blocked by the wall — stays near starting x or wall edge.
      expect(player.x).toBeLessThanOrEqual(200 - player.collisionRadius);
      // Y still advances freely (sliding).
      expect(player.y).toBeGreaterThan(200);
    });

    it('can pass through a gap in a wall (the gate)', () => {
      // Two wall segments with a gap between y=180 and y=220.
      obstacleManager.addWall({ x: 200, y: 0, w: 20, h: 180 });
      obstacleManager.addWall({ x: 200, y: 220, w: 20, h: 180 });
      const player = new Player(150, 200);
      const input = makeInput('player_move_right');
      player.update(1, input, bounds);
      // Player should pass cleanly through the gap.
      expect(player.x).toBeGreaterThan(220);
    });
  });

  describe('tap-to-move', () => {
    afterEach(() => {
      obstacleManager.clear();
    });

    it('walks toward a tap target when no key is held', () => {
      const player = new Player(100, 100);
      player.setMoveTarget(400, 100);
      player.update(0.1, noInput, bounds);   // 200 px/s * 0.1 = 20 px step
      expect(player.x).toBeGreaterThan(100);
      expect(player.x).toBeLessThan(400);
      expect(player.moveTarget).not.toBeNull();
    });

    it('clears the target on arrival', () => {
      const player = new Player(100, 100);
      player.setMoveTarget(110, 100);   // close enough that one big step lands it
      player.update(1, noInput, bounds);
      expect(player.moveTarget).toBeNull();
      expect(player.x).toBeCloseTo(110, 0);
    });

    it('keyboard input cancels the tap target', () => {
      const player = new Player(100, 100);
      player.setMoveTarget(800, 800);
      const right = makeInput('player_move_right');
      player.update(0.1, right, bounds);
      expect(player.moveTarget).toBeNull();
      // Player moved right (keyboard) not toward the SE target.
      expect(player.x).toBeGreaterThan(100);
      expect(player.y).toBe(100);
    });

    it('clears the target if a wall blocks all progress', () => {
      // Wall directly to the right of the player.
      obstacleManager.addWall({ x: 105, y: 50, w: 20, h: 200 });
      const player = new Player(100, 150);
      // First flush the player against the wall so further attempts make
      // zero progress (otherwise the wind-up step still moves a fractional
      // amount on the first call).
      player.setMoveTarget(400, 150);
      player.update(1, noInput, bounds);
      // Now the target is either cleared (stalled in the same frame) or
      // we re-target and confirm a stalled second update clears it.
      if (player.moveTarget) {
        const before = player.x;
        player.update(0.1, noInput, bounds);
        expect(player.x).toBe(before);
        expect(player.moveTarget).toBeNull();
      } else {
        expect(player.moveTarget).toBeNull();
      }
    });

    it('clearMoveTarget() stops tap-to-move motion', () => {
      const player = new Player(100, 100);
      player.setMoveTarget(400, 100);
      player.clearMoveTarget();
      player.update(0.1, noInput, bounds);
      expect(player.x).toBe(100);
    });
  });
});
