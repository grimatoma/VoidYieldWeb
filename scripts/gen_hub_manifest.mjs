#!/usr/bin/env node
/**
 * Scans docs/, docs/specs/, design_mocks/, design_mocks/ui/, and
 * docs/design_mocks/ and writes docs/manifest.json — the catalog used
 * by the unified review hub at docs/index.html.
 *
 * Run: node scripts/gen_hub_manifest.mjs
 *
 * The hub fetches manifest.json on load, so re-running this regenerates
 * the sidebar without touching the hub's HTML.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DOC_SUMMARIES = {
  'GAME_DESIGN.md': 'Master vision, pillars, the 5-phase automation arc, system map, reading guide.',
  'CORE_LOOP_TDD_SSD.md': 'Technical design + system specification document for the core loop.',
  'CORE_LOOP_DESIGN_REVIEW.md': 'Design review notes and analysis on the overall loop.',
  'IMPLEMENTATION_ROADMAP.md': 'Planned milestone sequencing and direction (M0–M14).',
  'VOID_YIELD_UI_PRD.md': 'Interface goals, UX framing, presentation direction.',
  'UI_MENU_CATALOG.md': 'Factual catalog of every UI surface, element, interaction. UX redesign baseline.',
  'CODEBASE_STATUS.md': 'Snapshot of what is implemented in the TS / PixiJS port.',
};

const SPEC_TITLES = {
  '00': 'A2 Transit',
  '01': 'Resource Quality',
  '02': 'Surveying',
  '03': 'Harvesters',
  '04': 'Drone Swarm',
  '05': 'Factories',
  '06': 'Consumption',
  '07': 'Logistics',
  '08': 'Vehicles',
  '09': 'Planets',
  '10': 'Spacecraft',
  '11': 'Tech Tree',
  '12': 'Economy',
  '13': 'Art Direction',
  '14': 'UI Systems',
  '15': 'Save / Load',
  '16': 'Input Map',
  '17': 'World Generation',
  '26': 'Web Visual Parity',
};

const MOCK_CATEGORIES = {
  '01': 'exploration', '08': 'exploration', '10': 'exploration', '20': 'exploration',
  '02': 'harvesting', '03': 'harvesting',
  '04': 'production', '05': 'production', '26': 'production', '27': 'production',
  '09': 'logistics', '15': 'logistics', '21': 'logistics', '23': 'logistics',
  '06': 'vehicles', '19': 'vehicles',
  '07': 'worlds', '22': 'worlds',
  '11': 'hud', '12': 'hud', '13': 'hud', '14': 'hud', '16': 'hud',
  '17': 'menus', '18': 'menus', '24': 'menus', '25': 'menus', '28': 'menus', '29': 'menus',
};

const CATEGORY_LABELS = {
  exploration: 'Exploration',
  harvesting: 'Harvesting',
  production: 'Production',
  logistics: 'Logistics',
  vehicles: 'Vehicles',
  worlds: 'Worlds',
  hud: 'HUD & UI',
  menus: 'Menus & Flow',
};

const titleCase = (s) =>
  s.replace(/[_-]+/g, ' ')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bHud\b/gi, 'HUD')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bPrd\b/gi, 'PRD')
    .replace(/\bTdd\b/gi, 'TDD')
    .replace(/\bSsd\b/gi, 'SSD')
    .replace(/\bV(\d+)/g, 'v$1');

function listFiles(dir) {
  try {
    return readdirSync(dir).filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
}

// ──────────────── DOCS ────────────────
const docsDir = join(ROOT, 'docs');
const docs = listFiles(docsDir)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => ({
    id: f.replace(/\.md$/, '').toLowerCase().replace(/_/g, '-'),
    title: titleCase(f.replace(/\.md$/, '').replace(/_/g, ' ')),
    path: `docs/${f}`,
    summary: DOC_SUMMARIES[f] || '',
  }));

// ──────────────── SPECS ────────────────
const specsDir = join(docsDir, 'specs');
const specs = listFiles(specsDir)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => {
    const m = f.match(/^(\d+)_(.+)\.md$/);
    const num = m ? m[1] : '';
    return {
      id: `spec-${num || f.replace(/\.md$/, '')}`,
      num,
      title: SPEC_TITLES[num] || titleCase(m ? m[2] : f),
      path: `docs/specs/${f}`,
    };
  });

// ──────────────── MOCKS (root design_mocks/) ────────────────
const mocksDir = join(ROOT, 'design_mocks');
const mocksRoot = listFiles(mocksDir);

const screenMocks = mocksRoot
  .filter((f) => /^\d+_.+\.svg$/.test(f))
  .sort()
  .map((f) => {
    const m = f.match(/^(\d+)_(.+)\.svg$/);
    const num = m[1];
    return {
      id: `mock-${num}`,
      num,
      title: titleCase(m[2]),
      path: `mocks/${f}`,
      type: 'svg',
      category: MOCK_CATEGORIES[num] || 'misc',
    };
  });

const interactiveMocks = mocksRoot
  .filter((f) => /^\d+_.+\.html$/.test(f))
  .sort()
  .map((f) => {
    const m = f.match(/^(\d+)_(.+)\.html$/);
    const num = m[1];
    return {
      id: `mock-${num}`,
      num,
      title: titleCase(m[2]),
      path: `mocks/${f}`,
      type: 'html',
      category: MOCK_CATEGORIES[num] || 'menus',
    };
  });

// Phase-1 core-loop HTML mockups (live in docs/design_mocks/)
const phase1Dir = join(docsDir, 'design_mocks');
const phase1Mocks = listFiles(phase1Dir)
  .filter((f) => /^\d+_.+\.html$/.test(f))
  .sort()
  .map((f) => {
    const m = f.match(/^(\d+)_(.+)\.html$/);
    return {
      id: `phase1-${m[1]}`,
      num: m[1],
      title: titleCase(m[2]),
      path: `docs/design_mocks/${f}`,
      type: 'html',
    };
  });

// Legacy gameplay/UI SVG studies in design_mocks/ui/
const uiMocksDir = join(mocksDir, 'ui');
const uiMocks = listFiles(uiMocksDir)
  .filter((f) => f.endsWith('.svg'))
  .sort()
  .map((f) => ({
    id: `ui-${f.replace(/\.svg$/, '').replace(/_/g, '-')}`,
    title: titleCase(f),
    path: `mocks/ui/${f}`,
    type: 'svg',
  }));

// Standalone HTML mockups (no number prefix)
const standaloneMocks = mocksRoot
  .filter(
    (f) =>
      /\.html$/.test(f) &&
      !/^\d+_/.test(f) &&
      !['index.html', '_index.html', 'home.html'].includes(f)
  )
  .sort()
  .map((f) => ({
    id: `extra-${f.replace(/\.html$/, '').replace(/_/g, '-')}`,
    title: titleCase(f),
    path: `mocks/${f}`,
    type: 'html',
  }));

const manifest = {
  generatedAt: new Date().toISOString(),
  baseFromHub: '..', // hub lives at /docs/, raw assets at /docs/.., /mocks/..
  groups: [
    {
      id: 'docs',
      label: 'Documentation',
      icon: '◈',
      sections: [
        { id: 'core-docs', label: 'Core docs', items: docs },
        {
          id: 'specs',
          label: 'Specs',
          items: specs.map((s) => ({
            ...s,
            title: s.num ? `${s.num} · ${s.title}` : s.title,
          })),
        },
      ],
    },
    {
      id: 'mocks',
      label: 'Design Mocks',
      icon: '◇',
      sections: [
        ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
          id: `mock-${key}`,
          label,
          items: [
            ...screenMocks.filter((m) => m.category === key),
            ...interactiveMocks.filter((m) => m.category === key),
          ].map((m) => ({
            ...m,
            title: `${m.num} · ${m.title}`,
          })),
        })),
        {
          id: 'mock-phase1',
          label: 'Phase-1 Core Loop',
          items: phase1Mocks.map((m) => ({
            ...m,
            title: `P${m.num} · ${m.title}`,
          })),
        },
        {
          id: 'mock-ui-studies',
          label: 'UI / Gameplay Studies',
          items: uiMocks,
        },
        {
          id: 'mock-extras',
          label: 'Other Mockups',
          items: standaloneMocks,
        },
      ].filter((s) => s.items.length > 0),
    },
  ],
};

const outPath = join(docsDir, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');

const totals = manifest.groups
  .map((g) => `${g.label}: ${g.sections.reduce((n, s) => n + s.items.length, 0)}`)
  .join(' · ');
console.log(`Wrote ${relative(ROOT, outPath)} — ${totals}`);
