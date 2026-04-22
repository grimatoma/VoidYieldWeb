/**
 * BuildPromptOverlay — shows a hint near the grid when the player is nearby
 * and the build menu is closed. Prompts the player to press E to open the build menu.
 */
export class BuildPromptOverlay {
  private _el: HTMLElement | null = null;
  private _visible = false;

  mount(): void {
    const parent = document.getElementById('ui-layer') ?? document.body;

    this._el = document.createElement('div');
    this._el.id = 'build-prompt-overlay';
    this._el.style.cssText = [
      'position:fixed',
      'bottom:120px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(13,27,62,0.9)',
      'border:1px solid #D4A843',
      'color:#D4A843',
      'font-family:monospace',
      'font-size:11px',
      'padding:4px 8px',
      'border-radius:2px',
      'pointer-events:none',
      'z-index:15',
      'display:none',
    ].join(';');

    this._el.textContent = 'Press E to open Build Menu';

    parent.appendChild(this._el);
  }

  unmount(): void {
    if (this._el && this._el.parentElement) {
      this._el.parentElement.removeChild(this._el);
    }
    this._el = null;
  }

  /**
   * Update visibility state. Shows the hint when playerNearGrid is true
   * and the build menu is closed (menuOpen is false).
   */
  update(playerNearGrid: boolean, menuOpen: boolean): void {
    const shouldShow = playerNearGrid && !menuOpen;
    if (shouldShow === this._visible) return;

    this._visible = shouldShow;
    if (this._el) {
      this._el.style.display = shouldShow ? 'block' : 'none';
    }
  }
}
