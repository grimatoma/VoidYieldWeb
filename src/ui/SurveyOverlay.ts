/**
 * SurveyOverlay — HTML overlay shown while survey mode is active.
 *
 * Shows:
 *  - Survey mode header with [Q]/[M] hints
 *  - Ore type readout (color dot + name + concentration %)
 *  - Scan stage name + circular progress bar
 *  - Result card after Full Scan (6s)
 */
import type { NearbyDepositInfo, ScanStage } from '@services/SurveyService';
import type { OreType } from '@data/types';

// Ore color palette — matches Deposit.ts ORE_COLORS
const ORE_HEX: Record<OreType, string> = {
  vorax:             '#FF8C42',
  krysite:           '#00B8D4',
  gas:               '#A8E063',
  steel_bars:        '#D4A843',
  steel_plates:      '#B0B8C4',
  compressed_gas:    '#90CAF9',
  water:             '#29B6F6',
  alloy_rods:        '#FFD700',
  rocket_fuel:       '#FF4400',
  shards:            '#E040FB',
  aethite:           '#40C4FF',
  void_cores:        '#7C4DFF',
  processed_rations: '#FFEB3B',
  bio_resin:         '#66BB6A',
  processed_resin:   '#8BC34A',
  power_cells:       '#FFD54F',
  bio_circuit_boards:'#FF7043',
  dark_gas:          '#546E7A',
  void_touched_ore:  '#9C27B0',
  resonance_shards:  '#E91E63',
  ferrovoid:         '#6D4C41',
  warp_components:   '#00BCD4',
  crystal_lattice:   '#64B5F6',
  drill_head:        '#B0BEC5',
  hull:              '#90A4AE',
  engine:            '#FF5722',
  fuel_tank:         '#607D8B',
  avionics:          '#00ACC1',
  landing_gear:      '#795548',
  iron_ore:          '#B0BEC5',
  copper_ore:        '#E07B39',
  iron_bar:          '#78909C',
  copper_bar:        '#BF6030',
};

const STAGE_LABEL: Record<ScanStage, string> = {
  QUICK_READ:   'QUICK READ',
  PASSIVE_SCAN: 'PASSIVE SCAN',
  FULL_SCAN:    'FULL SCAN',
  DEEP_SCAN:    'DEEP SCAN',
};

const STAGE_COLOR: Record<ScanStage, string> = {
  QUICK_READ:   '#5a6a90',
  PASSIVE_SCAN: '#00B8D4',
  FULL_SCAN:    '#D4A843',
  DEEP_SCAN:    '#E040FB',
};

export class SurveyOverlay {
  private _root: HTMLElement | null = null;
  private _oreList: HTMLElement | null = null;
  private _stageLabel: HTMLElement | null = null;
  private _progressFill: HTMLElement | null = null;
  private _progressPct: HTMLElement | null = null;
  private _resultCard: HTMLElement | null = null;

  mount(parent: HTMLElement): void {
    const el = document.createElement('div');
    el.id = 'survey-overlay';
    el.innerHTML = `
      <div class="survey-header">
        <span class="survey-mode-label">[ SURVEY MODE ]</span>
        <span class="survey-hint">[Q] exit &nbsp;|&nbsp; [M] mark waypoint</span>
      </div>
      <div class="survey-body">
        <div class="survey-ore-list" id="survey-ore-list"></div>
        <div class="survey-scan-stage">
          <div class="survey-stage-name" id="survey-stage-name">QUICK READ</div>
          <div class="survey-progress-bar">
            <div class="survey-progress-fill" id="survey-progress-fill"></div>
          </div>
          <div class="survey-progress-pct" id="survey-progress-pct">0%</div>
        </div>
        <div class="survey-result-card" id="survey-result-card" style="display:none"></div>
      </div>
    `;
    el.style.display = 'none';
    parent.appendChild(el);
    this._root = el;
    this._oreList      = el.querySelector('#survey-ore-list');
    this._stageLabel   = el.querySelector('#survey-stage-name');
    this._progressFill = el.querySelector('#survey-progress-fill');
    this._progressPct  = el.querySelector('#survey-progress-pct');
    this._resultCard   = el.querySelector('#survey-result-card');
  }

  show(): void {
    if (this._root) this._root.style.display = '';
  }

  hide(): void {
    if (this._root) this._root.style.display = 'none';
    if (this._resultCard) this._resultCard.style.display = 'none';
  }

  updateReadout(
    deposits: NearbyDepositInfo[],
    scanProgress: number,
    scanStage: ScanStage,
  ): void {
    if (!this._oreList || !this._stageLabel || !this._progressFill || !this._progressPct || !this._resultCard) return;

    // --- Ore list ---
    if (deposits.length === 0) {
      this._oreList.innerHTML = '<span class="survey-no-signal">— no signal —</span>';
    } else {
      // Deduplicate by ore type, show highest concentration per type.
      const byType = new Map<OreType, NearbyDepositInfo>();
      for (const info of deposits) {
        const existing = byType.get(info.deposit.data.oreType);
        if (!existing || info.concentration > existing.concentration) {
          byType.set(info.deposit.data.oreType, info);
        }
      }
      const rows = Array.from(byType.values()).map(info => {
        const type = info.deposit.data.oreType;
        const color = ORE_HEX[type] ?? '#ffffff';
        const label = type.toUpperCase().replace(/_/g, ' ');
        const pct = scanStage === 'QUICK_READ'
          ? ''
          : `<span class="survey-concentration">${Math.round(info.concentration)}%</span>`;
        return `<div class="survey-ore-row">
          <span class="survey-ore-dot" style="background:${color}"></span>
          <span class="survey-ore-name">${label}</span>
          ${pct}
        </div>`;
      }).join('');
      this._oreList.innerHTML = rows;
    }

    // --- Stage indicator ---
    const stageColor = STAGE_COLOR[scanStage];
    this._stageLabel.textContent = STAGE_LABEL[scanStage];
    this._stageLabel.style.color = stageColor;
    const pctInt = Math.round(scanProgress * 100);
    this._progressFill.style.width = `${pctInt}%`;
    this._progressFill.style.background = stageColor;
    this._progressPct.textContent = `${pctInt}%`;

    // --- Result card ---
    if ((scanStage === 'FULL_SCAN' || scanStage === 'DEEP_SCAN') && deposits.length > 0) {
      const top = deposits[0];
      const type = top.deposit.data.oreType;
      const label = type.toUpperCase().replace(/_/g, ' ');
      const color = ORE_HEX[type] ?? '#ffffff';
      const concPct = Math.round(top.concentration);
      const sizeClass = top.deposit.data.sizeClass?.toUpperCase() ?? '—';

      // Grade from qualityAttributes.OQ if present.
      const oq = top.deposit.data.qualityAttributes?.OQ;
      const grade = oq !== undefined ? this._gradeFromOQ(oq) : '—';

      let deepSection = '';
      if (scanStage === 'DEEP_SCAN') {
        const attrs = top.deposit.data.qualityAttributes ?? {};
        const sorted = (Object.entries(attrs) as [string, number][])
          .filter(([k]) => k !== 'OQ')
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        if (sorted.length > 0) {
          const bars = sorted.map(([key, val]) => {
            const barW = Math.round((val / 1000) * 5);
            const filled = '█'.repeat(barW);
            const empty = '░'.repeat(5 - barW);
            return `<div class="survey-attr-row">
              <span class="survey-attr-key">${key}</span>
              <span class="survey-attr-val">~${val}</span>
              <span class="survey-attr-bar">${filled}${empty}</span>
            </div>`;
          }).join('');
          deepSection = `<div class="survey-standout">
            <div class="survey-standout-label">STANDOUT ATTRIBUTES:</div>
            ${bars}
          </div>`;
        }
      }

      this._resultCard.style.display = '';
      this._resultCard.innerHTML = `
        <div class="survey-result-ore" style="color:${color}">◆ ${label} DETECTED</div>
        <div class="survey-result-row">Concentration: <b>${concPct}%</b></div>
        <div class="survey-result-row">Grade: <b>${grade}</b> &nbsp; Size: <b>${sizeClass}</b></div>
        ${deepSection}
        <div class="survey-result-hint">[M] Mark Waypoint</div>
      `;
    } else if (scanStage === 'QUICK_READ' || scanStage === 'PASSIVE_SCAN') {
      this._resultCard.style.display = 'none';
    }
  }

  private _gradeFromOQ(oq: number): string {
    if (oq >= 950) return 'S';
    if (oq >= 800) return 'A';
    if (oq >= 600) return 'B';
    if (oq >= 400) return 'C';
    if (oq >= 200) return 'D';
    return 'F';
  }

  destroy(): void {
    this._root?.remove();
    this._root = null;
  }
}
