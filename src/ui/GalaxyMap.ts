import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface PlanetNode {
  id: string;
  label: string;
  x: number;
  y: number;
  unlocked: boolean;
  current: boolean;
}

export class GalaxyMap {
  readonly container: Container;
  private _bg!: Graphics;
  private _visible = false;
  private _planetNodes: PlanetNode[] = [];
  private _onTravel?: (planetId: string) => void;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Full-screen dimmed background
    this._bg = new Graphics();
    this._bg.rect(0, 0, 9999, 9999).fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(this._bg);

    // Panel background (420×260, centered at 270, 140 for 960x540 screen)
    const panel = new Graphics();
    panel.rect(270, 140, 420, 260).fill({ color: 0x0D1B3E, alpha: 0.97 });
    panel.rect(270, 140, 420, 260).stroke({ width: 1, color: 0xD4A843 });
    this.container.addChild(panel);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#D4A843' });
    const title = new Text({ text: '[ GALAXY MAP ]', style: titleStyle });
    title.x = 278;
    title.y = 148;
    this.container.addChild(title);

    // Close hint
    const hintStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#556677' });
    const hint = new Text({ text: '[G] to close', style: hintStyle });
    hint.x = 610;
    hint.y = 151;
    this.container.addChild(hint);
  }

  /** Set travel callback — called when player clicks Travel on a planet. */
  onTravel(cb: (planetId: string) => void): void {
    this._onTravel = cb;
  }

  /** Update the planet nodes shown in the map. */
  setPlanets(nodes: PlanetNode[]): void {
    this._planetNodes = nodes;
    this._rebuildPlanetVisuals();
  }

  private _rebuildPlanetVisuals(): void {
    // Remove old planet visuals (children after index 3 are planet nodes)
    while (this.container.children.length > 3) {
      this.container.removeChildAt(3);
    }

    // Draw a simple star field background in the panel
    const stars = new Graphics();
    // A few static star dots
    const starPositions = [
      [310, 180],
      [380, 165],
      [450, 175],
      [520, 160],
      [600, 185],
      [660, 170],
      [350, 230],
      [480, 225],
      [560, 240],
      [640, 210],
    ];
    for (const [sx, sy] of starPositions) {
      stars.circle(sx, sy as number, 1).fill(0xFFFFFF);
    }
    this.container.addChild(stars);

    // Planet positions on the map (in panel space)
    const planetMapPositions: Record<string, { x: number; y: number }> = {
      planet_a1: { x: 360, y: 270 },
      planet_a2: { x: 480, y: 200 },
      planet_b: { x: 580, y: 250 },
      planet_c: { x: 640, y: 330 },
      planet_a3: { x: 720, y: 200 },
    };

    for (const node of this._planetNodes) {
      const pos = planetMapPositions[node.id] ?? { x: 480, y: 270 };
      const g = new Graphics();

      // Planet circle — use void-touched pink for planet_c, deep teal for planet_a3
      let color: number;
      if (node.current) {
        color = 0xD4A843;
      } else if (!node.unlocked) {
        color = 0x333355;
      } else if (node.id === 'planet_c') {
        color = 0xE91E63; // pink-red for void-touched
      } else if (node.id === 'planet_a3') {
        color = 0x00B8D4; // deep teal for Void Nexus
      } else {
        color = 0x00B8D4;
      }
      g.circle(pos.x, pos.y, node.current ? 14 : 10).fill(color);
      if (node.current) {
        g.circle(pos.x, pos.y, 14).stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
      }
      this.container.addChild(g);

      // Label
      const labelStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 9,
        fill: node.current ? '#D4A843' : '#AAAAAA',
      });
      const label = new Text({ text: node.label + (node.current ? '\n[HERE]' : ''), style: labelStyle });
      label.anchor.set(0.5, 0);
      label.x = pos.x;
      label.y = pos.y + 16;
      this.container.addChild(label);

      // Travel button for non-current unlocked planets
      if (!node.current && node.unlocked && this._onTravel) {
        const btnG = new Graphics();
        btnG.rect(pos.x - 24, pos.y + 36, 48, 16).fill(0x1A3A1A);
        btnG.rect(pos.x - 24, pos.y + 36, 48, 16).stroke({ width: 1, color: 0x4CAF50 });
        btnG.eventMode = 'static';
        btnG.cursor = 'pointer';
        const planetId = node.id;
        btnG.on('pointerdown', () => {
          this._onTravel?.(planetId);
          this.setVisible(false);
        });
        this.container.addChild(btnG);

        const btnStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: '#4CAF50' });
        const btnText = new Text({ text: 'TRAVEL', style: btnStyle });
        btnText.anchor.set(0.5);
        btnText.x = pos.x;
        btnText.y = pos.y + 44;
        btnText.eventMode = 'none';
        this.container.addChild(btnText);
      }
    }

    // Route lines
    const a1 = this._planetNodes.find((n) => n.id === 'planet_a1');
    const a2 = this._planetNodes.find((n) => n.id === 'planet_a2');
    const b = this._planetNodes.find((n) => n.id === 'planet_b');
    const a3 = this._planetNodes.find((n) => n.id === 'planet_a3');

    const lineG = new Graphics();

    // A1 → A2 if both unlocked
    if (a1?.unlocked && a2?.unlocked) {
      lineG.moveTo(360, 270).lineTo(480, 200);
      lineG.stroke({ width: 1, color: 0x334477, alpha: 0.6 });
    }

    // A2 → B if both unlocked
    if (a2?.unlocked && b?.unlocked) {
      lineG.moveTo(480, 200).lineTo(580, 250);
      lineG.stroke({ width: 1, color: 0x334477, alpha: 0.6 });
    }

    // A1 → B if both unlocked and A2 not in the mix
    if (a1?.unlocked && b?.unlocked && (!a2?.unlocked)) {
      lineG.moveTo(360, 270).lineTo(580, 250);
      lineG.stroke({ width: 1, color: 0x334477, alpha: 0.6 });
    }

    // B → A3 (Void Nexus route) if both unlocked
    if (b?.unlocked && a3?.unlocked) {
      lineG.moveTo(580, 250).lineTo(720, 200);
      lineG.stroke({ width: 1, color: 0x00B8D4, alpha: 0.6 });
    }

    // Insert before planet circles (after stars)
    this.container.addChildAt(lineG, 4);
  }

  setVisible(v: boolean): void {
    this._visible = v;
    this.container.visible = v;
  }

  toggle(): void {
    this.setVisible(!this._visible);
  }

  get visible(): boolean {
    return this._visible;
  }
}
