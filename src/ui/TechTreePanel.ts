import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TECH_NODES } from '@data/tech_tree_nodes';
import { techTree } from '@services/TechTree';

export class TechTreePanel {
  readonly container: Container;
  private _visible = false;
  private _columnScrollY = [0, 0, 0]; // scroll offset for each branch
  private _nodeContainers: Container[] = [];

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.x = 50;
    this.container.y = 30;
    this._build();
  }

  private _build(): void {
    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 860, 480).fill({ color: 0x060E1A, alpha: 0.96 });
    bg.rect(0, 0, 860, 480).stroke({ width: 1, color: 0xD4A843 });
    this.container.addChild(bg);

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: '#D4A843' });
    const title = new Text({ text: '[ TECH TREE ]', style: titleStyle });
    title.x = 8;
    title.y = 8;
    this.container.addChild(title);

    const hintStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#556677' });
    const hint = new Text({ text: '[J] close  |  click node to unlock', style: hintStyle });
    hint.x = 200;
    hint.y = 12;
    this.container.addChild(hint);

    // Branch column headers
    const headers = ['EXTRACTION', 'PROCESSING & CRAFT', 'EXPANSION'];
    const branchColors = ['#FF8C42', '#00B8D4', '#4CAF50'];
    for (let b = 0; b < 3; b++) {
      const hStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: branchColors[b] });
      const h = new Text({ text: headers[b], style: hStyle });
      h.x = 14 + b * 285;
      h.y = 30;
      this.container.addChild(h);

      // Column divider
      if (b > 0) {
        const div = new Graphics();
        div.rect(8 + b * 285, 28, 1, 440).fill({ color: 0x223344, alpha: 0.6 });
        this.container.addChild(div);
      }
    }

    // Info text at bottom
    const infoStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#556677' });
    const info = new Text({
      text: 'RP: shows cost  |  amber = unlocked  |  teal = available  |  grey = locked',
      style: infoStyle,
    });
    info.x = 8;
    info.y = 464;
    this.container.addChild(info);
  }

  /** Rebuild node display — call when opening or after unlock. */
  refresh(): void {
    // Remove old node containers
    for (const nc of this._nodeContainers) this.container.removeChild(nc);
    this._nodeContainers = [];

    const branches = [1, 2, 3] as const;
    for (const branch of branches) {
      const nodes = TECH_NODES.filter((n) => n.branch === branch);
      const colX = 14 + (branch - 1) * 285;
      const nc = new Container();
      nc.x = colX;
      nc.y = 46 + this._columnScrollY[branch - 1];

      let rowY = 0;
      for (const node of nodes) {
        const unlocked = techTree.isUnlocked(node.nodeId);
        const canUnlock = techTree.canUnlock(node.nodeId);

        const bgColor = unlocked ? 0x3a2800 : 0x0d1b2e;
        const borderColor = unlocked ? 0xd4a843 : canUnlock ? 0x00b8d4 : 0x2a3a4a;
        const textColor = unlocked ? '#D4A843' : canUnlock ? '#FFFFFF' : '#445566';

        const g = new Graphics();
        g.rect(0, rowY, 260, 34).fill(bgColor);
        g.rect(0, rowY, 260, 34).stroke({ width: 1, color: borderColor });

        if (canUnlock && !unlocked) {
          g.eventMode = 'static';
          g.cursor = 'pointer';
          const nodeId = node.nodeId;
          g.on('pointerdown', () => {
            techTree.unlock(nodeId);
            this.refresh();
          });
        }
        nc.addChild(g);

        // Node name
        const nameStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: textColor });
        const nameText = new Text({ text: node.name.slice(0, 28), style: nameStyle });
        nameText.x = 4;
        nameText.y = rowY + 4;
        nameText.eventMode = 'none';
        nc.addChild(nameText);

        // Cost label
        const costParts = [];
        if (node.rpCost > 0) costParts.push(`${node.rpCost}RP`);
        if (node.crCost > 0) costParts.push(`${node.crCost}CR`);
        const costStr = costParts.join(' + ') || 'FREE';
        const costStyle = new TextStyle({
          fontFamily: 'monospace',
          fontSize: 8,
          fill: unlocked ? '#888844' : '#556677',
        });
        const costText = new Text({ text: costStr, style: costStyle });
        costText.x = 4;
        costText.y = rowY + 18;
        costText.eventMode = 'none';
        nc.addChild(costText);

        rowY += 38;
      }

      this.container.addChild(nc);
      this._nodeContainers.push(nc);
    }
  }

  toggle(): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
    if (this._visible) this.refresh();
  }

  get visible(): boolean {
    return this._visible;
  }
}
