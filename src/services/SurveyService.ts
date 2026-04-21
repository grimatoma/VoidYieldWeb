/**
 * SurveyService — spec 02 core state machine.
 *
 * Modes: INACTIVE → QUICK_READ → PASSIVE_SCAN → FULL_SCAN → DEEP_SCAN
 * The player must hold still (no movement) for the scan to progress.
 * If the player moves, progress resets to 0 and stage drops back to QUICK_READ.
 */
import type { Deposit } from '@entities/Deposit';
import type { WaypointData } from '@data/types';
import { EventBus } from './EventBus';
import { depositMap } from './DepositMap';

export type ScanStage = 'QUICK_READ' | 'PASSIVE_SCAN' | 'FULL_SCAN' | 'DEEP_SCAN';

// Stage thresholds in seconds of uninterrupted stillness.
const STAGE_THRESHOLDS: Record<ScanStage, number> = {
  QUICK_READ:   0,
  PASSIVE_SCAN: 2,
  FULL_SCAN:    6,
  DEEP_SCAN:    15,
};

// Scan range in pixels (Tier I).
const SCAN_RANGE = 60;

// Movement threshold in px/s — below this counts as "still".
const MOVE_THRESHOLD = 5;

export interface NearbyDepositInfo {
  deposit: Deposit;
  distance: number;
  concentration: number; // 1–100 with ±15% Tier I noise
}

export class SurveyServiceImpl {
  isActive: boolean = false;
  scanStage: ScanStage = 'QUICK_READ';
  /** 0–1 within current stage duration window (used for progress ring). */
  scanProgress: number = 0;
  nearestDeposits: NearbyDepositInfo[] = [];
  waypoints: WaypointData[] = [];

  private _scanAccum: number = 0; // total still-time in seconds
  private _prevX: number = 0;
  private _prevY: number = 0;
  private _lastStageNotified: ScanStage = 'QUICK_READ';

  toggle(): void {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this._reset();
    }
    EventBus.emit('survey:mode_changed', this.isActive);
  }

  private _reset(): void {
    this._scanAccum = 0;
    this.scanProgress = 0;
    this.scanStage = 'QUICK_READ';
    this._lastStageNotified = 'QUICK_READ';
    this.nearestDeposits = [];
  }

  update(delta: number, playerX: number, playerY: number, playerMoving: boolean): void {
    if (!this.isActive) return;

    // Compute velocity from position delta to supplement the moving flag.
    const dpx = playerX - this._prevX;
    const dpy = playerY - this._prevY;
    const speed = delta > 0 ? Math.sqrt(dpx * dpx + dpy * dpy) / delta : 0;
    this._prevX = playerX;
    this._prevY = playerY;

    const moving = playerMoving || speed > MOVE_THRESHOLD;

    // Sample nearby deposits (always, even while moving — for Quick Read).
    this._sampleDeposits(playerX, playerY);

    if (moving) {
      // Reset scan progress on movement.
      this._scanAccum = 0;
      this.scanProgress = 0;
      this.scanStage = 'QUICK_READ';
      this._lastStageNotified = 'QUICK_READ';
      return;
    }

    // Accumulate still-time.
    this._scanAccum += delta;

    // Determine current stage and progress within it.
    if (this._scanAccum < STAGE_THRESHOLDS.PASSIVE_SCAN) {
      this.scanStage = 'QUICK_READ';
      this.scanProgress = this._scanAccum / STAGE_THRESHOLDS.PASSIVE_SCAN;
    } else if (this._scanAccum < STAGE_THRESHOLDS.FULL_SCAN) {
      this.scanStage = 'PASSIVE_SCAN';
      const start = STAGE_THRESHOLDS.PASSIVE_SCAN;
      const end   = STAGE_THRESHOLDS.FULL_SCAN;
      this.scanProgress = (this._scanAccum - start) / (end - start);
    } else if (this._scanAccum < STAGE_THRESHOLDS.DEEP_SCAN) {
      this.scanStage = 'FULL_SCAN';
      const start = STAGE_THRESHOLDS.FULL_SCAN;
      const end   = STAGE_THRESHOLDS.DEEP_SCAN;
      this.scanProgress = (this._scanAccum - start) / (end - start);
    } else {
      this.scanStage = 'DEEP_SCAN';
      this.scanProgress = 1;
    }

    this.scanProgress = Math.min(1, Math.max(0, this.scanProgress));

    // Emit scan_complete on stage transitions (once per transition).
    if (this.scanStage !== this._lastStageNotified && this.scanStage !== 'QUICK_READ') {
      this._lastStageNotified = this.scanStage;
      const nearest = this.nearestDeposits[0];
      if (nearest) {
        EventBus.emit('survey:scan_complete', this.scanStage, nearest.deposit.data.depositId, nearest.concentration);
      }
    }
  }

  private _sampleDeposits(px: number, py: number): void {
    const result: NearbyDepositInfo[] = [];
    for (const dep of depositMap.getAll()) {
      if (dep.data.isExhausted) continue;
      const dx = dep.x - px;
      const dy = dep.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= SCAN_RANGE) {
        // Tier I precision: ±15% noise on concentrationPeak.
        const noise = 1 + (Math.random() * 0.3 - 0.15);
        const concentration = Math.max(1, Math.min(100, dep.data.concentrationPeak * noise));
        result.push({ deposit: dep, distance: dist, concentration });
      }
    }
    // Sort by distance ascending.
    result.sort((a, b) => a.distance - b.distance);
    this.nearestDeposits = result;
  }

  placeWaypoint(deposit: Deposit): void {
    const existing = this.waypoints.findIndex(w => w.depositId === deposit.data.depositId);
    const noise = 1 + (Math.random() * 0.3 - 0.15);
    const concentration = Math.max(1, Math.min(100, deposit.data.concentrationPeak * noise));
    const wp: WaypointData = {
      depositId: deposit.data.depositId,
      x: deposit.x,
      y: deposit.y,
      oreType: deposit.data.oreType,
      concentration,
      analysisComplete: false,
    };
    if (existing >= 0) {
      this.waypoints[existing] = wp;
    } else {
      this.waypoints.push(wp);
    }
    depositMap.addWaypoint(wp);
    EventBus.emit('survey:waypoint_placed', deposit.data.depositId, deposit.x, deposit.y);
  }

  getWaypoints(): readonly WaypointData[] {
    return this.waypoints;
  }

  removeWaypoint(depositId: string): void {
    this.waypoints = this.waypoints.filter(w => w.depositId !== depositId);
  }

  clearWaypoints(): void {
    this.waypoints = [];
  }
}

export const surveyService = new SurveyServiceImpl();
