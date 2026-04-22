import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { GridFootprint } from '@services/BuildGrid';

export const CELL_SIZE = 88; // pixels per grid cell
export const GRID_ORIGIN = { x: 260, y: 50 }; // top-left of the 5x5 grid, centered in 960×540

export function gridToWorld(row: number, col: number): { x: number; y: number } {
  return {
    x: GRID_ORIGIN.x + col * CELL_SIZE + CELL_SIZE / 2,
    y: GRID_ORIGIN.y + row * CELL_SIZE + CELL_SIZE / 2,
  };
}

const BUILDING_COLORS: Record<string, number> = {
  storage:    0x1A3A5C,
  furnace:    0x5C1A1A,
  marketplace: 0x1A5C2A,
  drone_depot: 0x3A1A5C,
};

const BUILDING_LABELS: Record<string, string> = {
  storage:    'STORAGE',
  furnace:    'FURNACE',
  marketplace: 'MARKET',
  drone_depot: 'DRONES',
};

export class PlacedBuilding {
  readonly container: Container;
  readonly buildingId: string;
  readonly buildingType: string;
  row: number;
  col: number;
  footprint: GridFootprint;

  constructor(
    buildingId: string,
    buildingType: string,
    row: number,
    col: number,
    footprint: GridFootprint
  ) {
    this.buildingId = buildingId;
    this.buildingType = buildingType;
    this.row = row;
    this.col = col;
    this.footprint = footprint;

    this.container = new Container();

    const color = BUILDING_COLORS[buildingType] ?? 0x333333;
    const label = BUILDING_LABELS[buildingType] ?? buildingType.toUpperCase();
    const w = footprint.cols * CELL_SIZE - 4;
    const h = footprint.rows * CELL_SIZE - 4;

    const body = new Graphics();
    body.rect(-w / 2, -h / 2, w, h).fill(color);
    body.rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: 0x4A6080 });
    this.container.addChild(body);

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: '#D4A843',
      align: 'center',
    });
    const text = new Text({ text: label, style: textStyle });
    text.anchor.set(0.5);
    this.container.addChild(text);

    this.syncPosition();
  }

  /** Move the container to match current row/col. Call after placement or move. */
  syncPosition(): void {
    const world = gridToWorld(this.row, this.col);
    // For multi-cell footprints, offset so the container is centered on the entire footprint
    this.container.x = GRID_ORIGIN.x + this.col * CELL_SIZE + (this.footprint.cols * CELL_SIZE) / 2;
    this.container.y = GRID_ORIGIN.y + this.row * CELL_SIZE + (this.footprint.rows * CELL_SIZE) / 2;
    void world; // gridToWorld used for single-cell default, container handles footprint centering
  }

  /** Create a semi-transparent ghost for placement preview. */
  static createGhost(buildingType: string, footprint: GridFootprint): PlacedBuilding {
    const ghost = new PlacedBuilding('__ghost__', buildingType, 0, 0, footprint);
    ghost.container.alpha = 0.5;
    return ghost;
  }

  /** Tint green when placement is valid, red when invalid/out-of-bounds. */
  setGhostValid(valid: boolean): void {
    this.container.tint = valid ? 0x00FF88 : 0xFF4444;
  }

  destroy(): void { this.container.destroy({ children: true }); }
}
