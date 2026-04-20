import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const make = () => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    addChild: vi.fn(),
    x: 0, y: 0, visible: true,
  });
  return {
    Graphics: vi.fn().mockImplementation(make),
    Container: vi.fn().mockImplementation(make),
    Text: vi.fn().mockImplementation(make),
    TextStyle: vi.fn(),
    Application: vi.fn(),
  };
});

vi.mock('@services/GameState', () => ({
  gameState: { credits: 200, addCredits: vi.fn() },
}));

import { DroneBase } from '@entities/DroneBase';
import { ScoutDrone } from '@entities/ScoutDrone';

describe('DroneBase', () => {
  it('starts IDLE', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    expect(drone.state).toBe('IDLE');
  });

  it('transitions to MOVING_TO_TARGET when task pushed and update called', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    drone.pushTask({ type: 'MINE', targetX: 100, targetY: 0, executeDurationSec: 2.0 });
    drone.update(0.016);
    expect(drone.state).toBe('MOVING_TO_TARGET');
  });

  it('moves toward target each frame', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    drone.pushTask({ type: 'MINE', targetX: 200, targetY: 0, executeDurationSec: 2.0 });
    drone.update(0.016);
    drone.update(1.0);    // moves 60px
    expect(drone.x).toBeGreaterThan(0);
  });

  it('enters EXECUTING when within 8px of target', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    drone.pushTask({ type: 'MINE', targetX: 4, targetY: 0, executeDurationSec: 2.0 });
    drone.update(0.016);  // transitions to MOVING
    drone.update(0.016);  // within range
    expect(drone.state).toBe('EXECUTING');
  });

  it('calls onExecute and returns to IDLE after timer', () => {
    const onExecute = vi.fn();
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    drone.pushTask({ type: 'MINE', targetX: 4, targetY: 0, executeDurationSec: 0.5, onExecute });
    drone.update(0.016); // IDLE → MOVING
    drone.update(0.016); // reaches target → EXECUTING
    drone.update(1.0);   // timer expires
    expect(onExecute).toHaveBeenCalled();
    expect(drone.state).toBe('IDLE');
  });

  it('pushTask returns false when queue is full (5 tasks)', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    const task = { type: 'MINE' as const, targetX: 0, targetY: 0, executeDurationSec: 1 };
    for (let i = 0; i < 5; i++) drone.pushTask(task);
    expect(drone.pushTask(task)).toBe(false);
  });

  it('clearTasks empties queue and resets to IDLE', () => {
    const drone = new DroneBase('scout', 0, 0, 60, 3);
    drone.pushTask({ type: 'MINE', targetX: 100, targetY: 0, executeDurationSec: 2 });
    drone.clearTasks();
    expect(drone.getTasks().length).toBe(0);
    expect(drone.state).toBe('IDLE');
  });

  it('ScoutDrone has correct speed, carry, and cost', () => {
    const drone = new ScoutDrone(10, 20);
    expect(drone.speed).toBe(60);
    expect(drone.carryCapacity).toBe(3);
    expect(ScoutDrone.COST).toBe(25);
    expect(drone.x).toBe(10);
    expect(drone.y).toBe(20);
  });
});
