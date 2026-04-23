export class RoadNetwork {
  private _roads = new Set<string>();

  private key(row: number, col: number): string { return `${row},${col}`; }

  add(row: number, col: number): void { this._roads.add(this.key(row, col)); }

  remove(row: number, col: number): boolean {
    const k = this.key(row, col);
    if (!this._roads.has(k)) return false;
    this._roads.delete(k);
    return true;
  }

  hasRoad(row: number, col: number): boolean { return this._roads.has(this.key(row, col)); }

  getAll(): Array<{ row: number; col: number }> {
    return [...this._roads].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  clear(): void { this._roads.clear(); }

  serialize(): string[] { return [...this._roads]; }

  deserialize(data: string[]): void { this._roads = new Set(data); }
}

export const roadNetwork = new RoadNetwork();
