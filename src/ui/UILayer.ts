/**
 * UILayer — manages the HTML overlay that sits above the PixiJS canvas.
 *
 * Creates <div id="ui-layer"> at z-index 20 (see styles.css) and mounts
 * all HTML UI components into it.  Phase 0 mounts only the HUD; subsequent
 * migration phases (M1+) will add panels here.
 */
import { HUD } from './HUD';
import { TutorialOverlay } from './TutorialOverlay';
import { InteractionPrompt } from './InteractionPrompt';
import { DebugOverlay } from './DebugOverlay';
import { ShopPanel } from './ShopPanel';
import { StoragePanel } from './StoragePanel';
import { DroneBayPanel } from './DroneBayPanel';
import { HabitationPanel } from './HabitationPanel';
import { ShipBayPanel } from './ShipBayPanel';
import { TechTreePanel } from './TechTreePanel';
import { FleetPanel } from './FleetPanel';
import { ProductionDashboard } from './ProductionDashboard';
import { LogisticsOverlay } from './LogisticsOverlay';
import { GalaxyMap } from './GalaxyMap';
import { InventoryPanel } from './InventoryPanel';
import { SurveyOverlay } from './SurveyOverlay';
import { SurveyJournalPanel } from './SurveyJournalPanel';
import { PopulationHUD } from './PopulationHUD';
import { SectorCompleteOverlay } from './SectorCompleteOverlay';
import { PrestigePanel } from './PrestigePanel';
import { OfflineDispatchPanel } from './OfflineDispatchPanel';
import { tutorialManager } from '@services/TutorialManager';

const UI_SCALE_STORAGE_KEY = 'voidyield_ui_scale';
const UI_SCALE_MIN = 0.6;
const UI_SCALE_MAX = 1.6;
const UI_SCALE_DEFAULT = 1.0;

export class UILayer {
  private _root: HTMLElement;
  private _hud: HUD | null = null;
  private _tutorial: TutorialOverlay | null = null;
  private _interactionPrompt: InteractionPrompt | null = null;
  private _debugOverlay: DebugOverlay | null = null;
  private _shopPanel: ShopPanel | null = null;
  private _storagePanel: StoragePanel | null = null;
  private _droneBayPanel: DroneBayPanel | null = null;
  private _habitationPanel: HabitationPanel | null = null;
  private _shipBayPanel: ShipBayPanel | null = null;
  private _techTreePanel: TechTreePanel | null = null;
  private _fleetPanel: FleetPanel | null = null;
  private _productionDashboard: ProductionDashboard | null = null;
  private _logisticsOverlay: LogisticsOverlay | null = null;
  private _galaxyMap: GalaxyMap | null = null;
  private _inventoryPanel: InventoryPanel | null = null;
  private _surveyOverlay: SurveyOverlay | null = null;
  private _surveyJournal: SurveyJournalPanel | null = null;
  private _populationHUD: PopulationHUD | null = null;
  private _sectorComplete: SectorCompleteOverlay | null = null;
  private _prestigePanel: PrestigePanel | null = null;
  private _offlineDispatch: OfflineDispatchPanel | null = null;
  private _onResize: () => void;
  private _userScale: number = UI_SCALE_DEFAULT;

  constructor() {
    // Reuse existing element if hot-reload already created it
    const existing = document.getElementById('ui-layer');
    if (existing) {
      this._root = existing;
    } else {
      this._root = document.createElement('div');
      this._root.id = 'ui-layer';
      document.body.appendChild(this._root);
    }
    this._userScale = UILayer.loadUserScale();
    this._onResize = () => this._applyHudScale();
  }

  static loadUserScale(): number {
    try {
      const raw = localStorage.getItem(UI_SCALE_STORAGE_KEY);
      if (!raw) return UI_SCALE_DEFAULT;
      const n = Number(raw);
      if (!Number.isFinite(n)) return UI_SCALE_DEFAULT;
      return Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, n));
    } catch {
      return UI_SCALE_DEFAULT;
    }
  }

  get userScale(): number { return this._userScale; }

  setUserScale(scale: number): void {
    const clamped = Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, scale));
    this._userScale = clamped;
    try { localStorage.setItem(UI_SCALE_STORAGE_KEY, String(clamped)); } catch { /* ignore */ }
    this._applyHudScale();
  }

  /**
   * HUD scale factor = auto-scale (from viewport width) * user-scale (from settings).
   * Auto-scale uses a 1280px reference — gentler than the old 960px base so
   * the HUD doesn't dominate at 1080p+. Final value clamped to a readable range.
   */
  private _applyHudScale(): void {
    const w = window.innerWidth;
    const auto = Math.max(0.75, Math.min(1.3, w / 1280));
    const scale = Math.max(0.55, Math.min(2.0, auto * this._userScale));
    document.documentElement.style.setProperty('--hud-scale', String(scale));
    document.documentElement.style.setProperty('--hud-user-scale', String(this._userScale));
  }

  /** Mount all UI components.  Call once after PixiJS app is ready. */
  init(): void {
    this._applyHudScale();
    window.addEventListener('resize', this._onResize);

    this._hud = new HUD();
    this._hud.mount(this._root);

    this._interactionPrompt = new InteractionPrompt();
    this._interactionPrompt.mount(this._root);

    this._shopPanel = new ShopPanel();
    this._shopPanel.mount(this._root);

    this._storagePanel = new StoragePanel();
    this._storagePanel.mount(this._root);

    this._droneBayPanel = new DroneBayPanel();
    this._droneBayPanel.mount(this._root);

    this._habitationPanel = new HabitationPanel();
    this._habitationPanel.mount(this._root);

    this._shipBayPanel = new ShipBayPanel();
    this._shipBayPanel.mount(this._root);

    this._techTreePanel = new TechTreePanel();
    this._techTreePanel.mount(this._root);

    this._fleetPanel = new FleetPanel();
    this._fleetPanel.mount(this._root);

    this._productionDashboard = new ProductionDashboard();
    this._productionDashboard.mount(this._root);

    this._logisticsOverlay = new LogisticsOverlay();
    this._logisticsOverlay.mount(this._root);

    this._galaxyMap = new GalaxyMap();
    this._galaxyMap.mount(this._root);

    this._inventoryPanel = new InventoryPanel();
    this._inventoryPanel.mount(this._root);

    this._surveyOverlay = new SurveyOverlay();
    this._surveyOverlay.mount(this._root);

    this._surveyJournal = new SurveyJournalPanel();
    this._surveyJournal.mount(this._root);

    this._populationHUD = new PopulationHUD();
    this._populationHUD.mount(this._root);

    this._sectorComplete = new SectorCompleteOverlay();
    this._sectorComplete.mount(this._root);

    this._prestigePanel = new PrestigePanel();
    this._prestigePanel.mount(this._root);

    this._offlineDispatch = new OfflineDispatchPanel();
    this._offlineDispatch.mount(this._root);

    // Dev-only debug overlay (press backtick to toggle, or click the HUD chip)
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      this._debugOverlay = new DebugOverlay();
      this._debugOverlay.mount(this._root);

      // Small always-visible button near the top-right so the overlay is
      // discoverable even without knowing the backtick shortcut.
      const btn = document.createElement('button');
      btn.id = 'debug-hud-btn';
      btn.textContent = 'DEBUG [~]';
      btn.addEventListener('click', () => this._debugOverlay?.toggle());
      this._root.appendChild(btn);
    }

    if (tutorialManager.shouldShow()) {
      this._tutorial = new TutorialOverlay();
      this._tutorial.mount(this._root);
    }
  }

  get interactionPrompt(): InteractionPrompt | null {
    return this._interactionPrompt;
  }
  get shopPanel(): ShopPanel | null { return this._shopPanel; }
  get storagePanel(): StoragePanel | null { return this._storagePanel; }
  get droneBayPanel(): DroneBayPanel | null { return this._droneBayPanel; }
  get habitationPanel(): HabitationPanel | null { return this._habitationPanel; }
  get shipBayPanel(): ShipBayPanel | null { return this._shipBayPanel; }
  get techTreePanel(): TechTreePanel | null { return this._techTreePanel; }
  get fleetPanel(): FleetPanel | null { return this._fleetPanel; }
  get productionDashboard(): ProductionDashboard | null { return this._productionDashboard; }
  get logisticsOverlay(): LogisticsOverlay | null { return this._logisticsOverlay; }
  get galaxyMap(): GalaxyMap | null { return this._galaxyMap; }
  get inventoryPanel(): InventoryPanel | null { return this._inventoryPanel; }
  get surveyOverlay(): SurveyOverlay | null { return this._surveyOverlay; }
  get surveyJournal(): SurveyJournalPanel | null { return this._surveyJournal; }
  get offlineDispatch(): OfflineDispatchPanel | null { return this._offlineDispatch; }

  /** Close every opened interaction panel — used when switching planets or on Esc. */
  closeAllPanels(): void {
    this._shopPanel?.close();
    this._storagePanel?.close();
    this._droneBayPanel?.close();
    this._habitationPanel?.close();
    this._shipBayPanel?.close();
    this._inventoryPanel?.close();
    if (this._techTreePanel?.visible) this._techTreePanel.toggle();
    if (this._fleetPanel?.visible) this._fleetPanel.toggle();
    if (this._productionDashboard?.visible) this._productionDashboard.toggle();
    if (this._logisticsOverlay?.visible) this._logisticsOverlay.setVisible(false);
    if (this._galaxyMap?.visible) this._galaxyMap.setVisible(false);
  }

  /** Cycle panels (Tab key) — simple approach: close all open panels. */
  cyclePanels(): void {
    this.closeAllPanels();
  }

  destroy(): void {
    window.removeEventListener('resize', this._onResize);
    this._hud?.destroy();
    this._hud = null;
    this._tutorial?.destroy();
    this._tutorial = null;
    this._interactionPrompt?.destroy();
    this._interactionPrompt = null;
    this._debugOverlay?.destroy();
    this._debugOverlay = null;
    this._shopPanel?.destroy();
    this._shopPanel = null;
    this._storagePanel?.destroy();
    this._storagePanel = null;
    this._droneBayPanel?.destroy();
    this._droneBayPanel = null;
    this._habitationPanel?.destroy();
    this._habitationPanel = null;
    this._shipBayPanel?.destroy();
    this._shipBayPanel = null;
    this._techTreePanel?.destroy();
    this._techTreePanel = null;
    this._fleetPanel?.destroy();
    this._fleetPanel = null;
    this._productionDashboard?.destroy();
    this._productionDashboard = null;
    this._logisticsOverlay?.destroy();
    this._logisticsOverlay = null;
    this._galaxyMap?.destroy();
    this._galaxyMap = null;
    this._inventoryPanel?.destroy();
    this._inventoryPanel = null;
    this._surveyOverlay?.destroy();
    this._surveyOverlay = null;
    this._surveyJournal?.destroy();
    this._surveyJournal = null;
    this._populationHUD?.destroy();
    this._populationHUD = null;
    this._sectorComplete?.destroy();
    this._sectorComplete = null;
    this._prestigePanel?.destroy();
    this._prestigePanel = null;
    this._offlineDispatch?.destroy();
    this._offlineDispatch = null;
    this._root.remove();
  }
}
