import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { techTree } from '@services/TechTree';
import type { TechNode } from '@data/tech_tree_nodes';

const BRANCH_COLORS: Record<number, string> = {
  1: '#FF8C42',  // amber — Extraction
  2: '#9C27B0',  // purple — Research
  3: '#2196F3',  // blue — Logistics
};

export class TechTreePanel {
  readonly container: Container;
  private _visible = false;
  private _nodeRows: Container[] = [];
  private _detailText!: Text;
  private _unlockBtn!: Container;
  private _selectedNode: TechNode | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Background panel 360×400, positioned at center-ish
    const bg = new Graphics();
    bg.rect(0, 0, 360, 400).fill({ color: 0x0D1B3E, alpha: 0.95 });
    bg.rect(0, 0, 360, 400).stroke({ width: 1, color: 0x00B8D4 });
    this.container.addChild(bg);
    this.container.x = 300;
    this.container.y = 70;

    // Title
    const titleStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#00B8D4' });
    const title = new Text({ text: '[ TECH TREE ]  [J] to close', style: titleStyle });
    title.x = 8;
    title.y = 8;
    this.container.addChild(title);

    // Column headers
    const h1 = new Text({ text: '-- EXTRACTION --', style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#FF8C42' }) });
    h1.x = 8;
    h1.y = 28;
    this.container.addChild(h1);

    // Node list
    this._buildNodeList();

    // Detail section
    const detailStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: '#AAAAAA', wordWrap: true, wordWrapWidth: 344 });
    this._detailText = new Text({ text: 'Select a node to see details.', style: detailStyle });
    this._detailText.x = 8;
    this._detailText.y = 300;
    this.container.addChild(this._detailText);

    // Unlock button
    this._unlockBtn = this._makeUnlockButton();
    this._unlockBtn.x = 8;
    this._unlockBtn.y = 360;
    this.container.addChild(this._unlockBtn);
  }

  private _buildNodeList(): void {
    const nodes = techTree.getAllNodes();
    let y = 50;
    for (const node of nodes) {
      const row = this._makeNodeRow(node, y);
      this._nodeRows.push(row);
      this.container.addChild(row);
      y += 22;
    }
  }

  private _makeNodeRow(node: TechNode, y: number): Container {
    const row = new Container();
    row.y = y;
    row.eventMode = 'static';
    row.cursor = 'pointer';

    const bg = new Graphics();
    bg.rect(4, 0, 352, 20).fill({ color: 0x112233, alpha: 0 });
    row.addChild(bg);

    const color = BRANCH_COLORS[node.branch] ?? '#FFFFFF';
    const isUnlocked = techTree.isUnlocked(node.nodeId);
    const canUnlock = techTree.canUnlock(node.nodeId);

    const fillColor = isUnlocked ? '#44CC44' : canUnlock ? color : '#444444';
    const prefix = isUnlocked ? '✓ ' : canUnlock ? '• ' : '  ';

    const costStr = [
      node.rpCost > 0 ? `${node.rpCost}RP` : '',
      node.crCost > 0 ? `${node.crCost}CR` : '',
    ].filter(Boolean).join('+') || 'FREE';

    const label = new Text({
      text: `${prefix}${node.name.padEnd(24)} [${costStr}]`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: fillColor }),
    });
    label.x = 8;
    row.addChild(label);

    row.on('pointerdown', () => this._selectNode(node));
    row.on('pointerover', () => {
      (bg as Graphics).clear().rect(4, 0, 352, 20).fill({ color: 0x223344, alpha: 0.8 });
    });
    row.on('pointerout', () => {
      (bg as Graphics).clear().rect(4, 0, 352, 20).fill({ color: 0x112233, alpha: 0 });
    });

    return row;
  }

  private _selectNode(node: TechNode): void {
    this._selectedNode = node;
    const isUnlocked = techTree.isUnlocked(node.nodeId);
    const canUnlock = techTree.canUnlock(node.nodeId);
    const costParts = [
      node.rpCost > 0 ? `${node.rpCost} RP` : '',
      node.crCost > 0 ? `${node.crCost} CR` : '',
    ].filter(Boolean).join(' + ') || 'Free';

    this._detailText.text =
      `${node.name}\n${node.description}\nCost: ${costParts}` +
      (isUnlocked ? '\nStatus: UNLOCKED' : canUnlock ? '\nStatus: Available' : '\nStatus: Locked');

    // Show/hide unlock button
    this._unlockBtn.visible = !isUnlocked && canUnlock;
  }

  private _makeUnlockButton(): Container {
    const btn = new Container();
    btn.visible = false;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.rect(0, 0, 100, 24).fill(0x00B8D4);
    btn.addChild(bg);

    const label = new Text({
      text: 'UNLOCK',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: '#000000' }),
    });
    label.x = 20;
    label.y = 5;
    btn.addChild(label);

    btn.on('pointerdown', () => {
      if (this._selectedNode) {
        techTree.unlock(this._selectedNode.nodeId);
        this._refresh();
      }
    });

    return btn;
  }

  private _refresh(): void {
    // Remove old rows
    for (const row of this._nodeRows) {
      this.container.removeChild(row);
    }
    this._nodeRows = [];
    this._buildNodeList();
    this._selectedNode = null;
    this._detailText.text = 'Select a node to see details.';
    this._unlockBtn.visible = false;
  }

  toggle(): void {
    this._visible = !this._visible;
    this.container.visible = this._visible;
    if (this._visible) this._refresh();
  }

  get visible(): boolean {
    return this._visible;
  }
}
