import { EventBus } from './EventBus';

export interface GridFootprint { rows: number; cols: number; }

export interface PlacedEntry {
  buildingId: string;    // unique instance ID
  buildingType: string;  // 'storage' | 'furnace' | 'marketplace' | 'drone_depot'
  row: number;
  col: number;
  footprint: GridFootprint;
}

export class BuildGrid {
  static readonly COLS = 5;
  static readonly ROWS = 5;

  private entries: PlacedEntry[] = [];

  /** Returns true if all cells [row..row+footprint.rows-1][col..col+footprint.cols-1] are empty and in-bounds. */
  canPlace(row: number, col: number, footprint: GridFootprint): boolean {
    if (row < 0 || col < 0) return false;
    if (row + footprint.rows > BuildGrid.ROWS) return false;
    if (col + footprint.cols > BuildGrid.COLS) return false;
    for (let r = row; r < row + footprint.rows; r++) {
      for (let c = col; c < col + footprint.cols; c++) {
        if (this.getBuildingAt(r, c) !== null) return false;
      }
    }
    return true;
  }

  /** Places a building. Throws if canPlace returns false. */
  place(entry: PlacedEntry): void {
    if (!this.canPlace(entry.row, entry.col, entry.footprint)) {
      throw new Error(
        `BuildGrid: cannot place "${entry.buildingId}" at [${entry.row},${entry.col}] — cell occupied or out of bounds`
      );
    }
    this.entries.push({ ...entry });
    EventBus.emit('grid:placed', entry.buildingId, entry.row, entry.col);
  }

  /** Removes a building from the grid. No-op if not found. Returns removed entry or null. */
  pickup(buildingId: string): PlacedEntry | null {
    const idx = this.entries.findIndex(e => e.buildingId === buildingId);
    if (idx === -1) return null;
    const [removed] = this.entries.splice(idx, 1);
    EventBus.emit('grid:picked-up', buildingId);
    return removed;
  }

  /** Returns the entry whose footprint covers (row, col), or null. */
  getBuildingAt(row: number, col: number): PlacedEntry | null {
    for (const entry of this.entries) {
      if (
        row >= entry.row &&
        row < entry.row + entry.footprint.rows &&
        col >= entry.col &&
        col < entry.col + entry.footprint.cols
      ) {
        return entry;
      }
    }
    return null;
  }

  getAll(): readonly PlacedEntry[] { return this.entries; }

  serialize(): PlacedEntry[] { return [...this.entries]; }
  deserialize(data: PlacedEntry[]): void { this.entries = [...data]; }
}

export const buildGrid = new BuildGrid();
