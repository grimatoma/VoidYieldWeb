import { EventBus } from '@services/EventBus';
import { tutorialManager, TUTORIAL_STEPS } from '@services/TutorialManager';

export class TutorialOverlay {
  private _root: HTMLElement | null = null;
  private _highlightedEl: HTMLElement | null = null;
  private _cleanups: Array<() => void> = [];

  mount(parent: HTMLElement): void {
    this._root = this._build();
    parent.appendChild(this._root);

    const onStepChanged = (step: number) => this._update(step);
    const onCompleted = () => this._hide();

    EventBus.on('tutorial:step_changed', onStepChanged);
    EventBus.on('tutorial:completed', onCompleted);

    this._cleanups.push(
      () => EventBus.off('tutorial:step_changed', onStepChanged),
      () => EventBus.off('tutorial:completed', onCompleted),
    );

    // Render current step if already active
    const step = tutorialManager.step;
    if (step > 0) this._update(step);
  }

  private _build(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'tutorial-overlay';
    el.innerHTML = `
      <div id="tutorial-panel">
        <div id="tutorial-header">
          <span id="tutorial-step-label">STEP 1 / 7</span>
          <span id="tutorial-title">WELCOME</span>
        </div>
        <p id="tutorial-description"></p>
        <div id="tutorial-dots"></div>
        <div id="tutorial-actions">
          <button id="tutorial-next" type="button">NEXT →</button>
          <button id="tutorial-skip" type="button">SKIP</button>
        </div>
      </div>
    `;

    const nextBtn = el.querySelector<HTMLButtonElement>('#tutorial-next')!;
    const skipBtn = el.querySelector<HTMLButtonElement>('#tutorial-skip')!;

    nextBtn.addEventListener('click', () => {
      tutorialManager.advance(tutorialManager.step + 1);
    });

    skipBtn.addEventListener('click', () => {
      tutorialManager.skip();
    });

    return el;
  }

  private _update(step: number): void {
    if (!this._root) return;
    const stepData = TUTORIAL_STEPS.find(s => s.id === step);
    if (!stepData) return;

    const panel = this._root.querySelector<HTMLElement>('#tutorial-panel')!;
    panel.classList.remove('tutorial-panel--hidden');

    const label = this._root.querySelector<HTMLElement>('#tutorial-step-label')!;
    label.textContent = `STEP ${step} / 7`;

    const title = this._root.querySelector<HTMLElement>('#tutorial-title')!;
    title.textContent = stepData.title.toUpperCase();

    const desc = this._root.querySelector<HTMLElement>('#tutorial-description')!;
    // Preserve newlines
    desc.innerHTML = stepData.description.split('\n').map(line => `<span>${line}</span>`).join('<br>');

    // Progress dots
    const dotsEl = this._root.querySelector<HTMLElement>('#tutorial-dots')!;
    dotsEl.innerHTML = TUTORIAL_STEPS.map(s =>
      `<span class="tutorial-dot${s.id === step ? ' tutorial-dot--active' : s.id < step ? ' tutorial-dot--done' : ''}"></span>`
    ).join('');

    // Next button label
    const nextBtn = this._root.querySelector<HTMLButtonElement>('#tutorial-next')!;
    nextBtn.textContent = step === TUTORIAL_STEPS.length ? 'FINISH ✓' : 'NEXT →';

    // Highlight target element
    this._clearHighlight();
    if (stepData.targetElementId) {
      const target = document.querySelector<HTMLElement>(stepData.targetElementId);
      if (target) {
        target.classList.add('tutorial-highlight');
        this._highlightedEl = target;
      }
    }
  }

  private _hide(): void {
    this._clearHighlight();
    if (!this._root) return;
    const panel = this._root.querySelector<HTMLElement>('#tutorial-panel');
    if (panel) panel.classList.add('tutorial-panel--hidden');
    setTimeout(() => {
      this._root?.remove();
      this._root = null;
    }, 400);
  }

  private _clearHighlight(): void {
    if (this._highlightedEl) {
      this._highlightedEl.classList.remove('tutorial-highlight');
      this._highlightedEl = null;
    }
  }

  destroy(): void {
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this._clearHighlight();
    this._root?.remove();
    this._root = null;
  }
}
