/**
 * TechTreePanel — HTML/CSS tech tree modal.
 *
 * Replaces the old PixiJS-canvas implementation so it layers cleanly above
 * the canvas HUD (no more hiding behind HTML panels) and scales with the
 * rest of the UI via `--hud-scale`.
 *
 * Public surface (preserved for scene callsites):
 *   - new TechTreePanel()
 *   - .toggle()
 *   - .visible
 *   - .mount(parent)
 *   - .destroy()
 */
import { TECH_NODES, type TechNode } from '@data/tech_tree_nodes';
import { techTree } from '@services/TechTree';

const BRANCH_META: Record<1 | 2 | 3, { title: string; color: string }> = {
  1: { title: 'EXTRACTION',         color: '#FF8C42' },
  2: { title: 'PROCESSING & CRAFT', color: '#00B8D4' },
  3: { title: 'EXPANSION',          color: '#4CAF50' },
};

export class TechTreePanel {
  private _root: HTMLElement;
  private _body: HTMLElement;
  private _visible = false;
  private _mounted = false;
  private _onBackdropClick: (e: MouseEvent) => void;

  constructor() {
    this._root = document.createElement('div');
    this._root.className = 'tech-panel-root';
    this._root.style.display = 'none';
    this._root.innerHTML = `
      <div class="tech-panel-backdrop"></div>
      <div class="tech-panel">
        <div class="tech-panel-head">
          <h2>[ TECH TREE ]</h2>
          <div class="tech-panel-head-hint">[J] or click outside to close  |  click node to unlock</div>
          <button class="tech-panel-close" aria-label="Close">✕</button>
        </div>
        <div class="tech-panel-body"></div>
        <div class="tech-panel-foot">
          <span class="tech-key tech-key-unlocked">AMBER</span> unlocked
          <span class="tech-key tech-key-available">TEAL</span> available
          <span class="tech-key tech-key-locked">GREY</span> locked
        </div>
      </div>
    `;
    this._body = this._root.querySelector<HTMLElement>('.tech-panel-body')!;

    this._onBackdropClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tech-panel-backdrop')
          || target.classList.contains('tech-panel-close')) {
        this._close();
      }
    };
    this._root.addEventListener('click', this._onBackdropClick);
  }

  mount(parent: HTMLElement): void {
    if (this._mounted) return;
    parent.appendChild(this._root);
    this._mounted = true;
  }

  toggle(): void {
    if (this._visible) this._close();
    else this._open();
  }

  private _open(): void {
    this._visible = true;
    this._root.style.display = 'block';
    this.refresh();
  }

  private _close(): void {
    this._visible = false;
    this._root.style.display = 'none';
  }

  get visible(): boolean { return this._visible; }

  /** Re-render the three branch columns with current unlock state. */
  refresh(): void {
    const branches: Array<1 | 2 | 3> = [1, 2, 3];
    this._body.innerHTML = branches.map((b) => {
      const meta = BRANCH_META[b];
      const nodes = TECH_NODES.filter((n) => n.branch === b);
      const nodesHtml = nodes.map((n) => this._nodeHtml(n)).join('');
      return `
        <div class="tech-col" style="--branch-color: ${meta.color}">
          <div class="tech-col-head">${meta.title}</div>
          <div class="tech-col-list">${nodesHtml}</div>
        </div>
      `;
    }).join('');

    // Wire click handlers on available nodes.
    this._body.querySelectorAll<HTMLElement>('.tech-node[data-available="1"]').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      el.addEventListener('click', () => {
        techTree.unlock(id);
        this.refresh();
      });
    });
  }

  private _nodeHtml(node: TechNode): string {
    const unlocked = techTree.isUnlocked(node.nodeId);
    const canUnlock = techTree.canUnlock(node.nodeId);
    const state = unlocked ? 'unlocked' : canUnlock ? 'available' : 'locked';

    const costParts: string[] = [];
    if (node.rpCost > 0) costParts.push(`${node.rpCost} RP`);
    if (node.crCost > 0) costParts.push(`${node.crCost} CR`);
    const cost = costParts.join(' · ') || 'FREE';
    const desc = node.description ?? '';

    return `
      <div class="tech-node tech-node--${state}"
           data-node-id="${node.nodeId}"
           data-available="${canUnlock && !unlocked ? '1' : '0'}">
        <div class="tech-node-name">${escapeHtml(node.name)}</div>
        <div class="tech-node-desc">${escapeHtml(desc)}</div>
        <div class="tech-node-cost">${unlocked ? 'UNLOCKED' : cost}</div>
      </div>
    `;
  }

  destroy(): void {
    this._root.removeEventListener('click', this._onBackdropClick);
    this._root.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}
