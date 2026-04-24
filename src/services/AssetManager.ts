import { Assets, Texture } from 'pixi.js';

export type AssetKey =
  | 'player_ne' | 'player_nw' | 'player_se' | 'player_sw'
  | 'player_sheet'
  | 'building_drone_bay' | 'building_storage_depot' | 'building_sell_terminal'
  | 'building_shop_terminal' | 'building_launch_pad' | 'building_spaceship'
  | 'ore_vorax' | 'ore_krysite' | 'ore_aethite' | 'ore_voidstone' | 'ore_shards'
  | 'ore_node_vorax'
  | 'tile_outpost_floor' | 'tile_outpost_edge' | 'tile_space_bg'
  | 'tile_asteroid' | 'tile_asteroid_field' | 'tile_planet_b'
  | 'rock_small' | 'rock_medium' | 'rock_large'
  | 'drone_miner'
  // --- Animated building sheets ---
  | 'sheet_drone_bay' | 'sheet_habitation_module' | 'sheet_crafting_station'
  | 'sheet_trade_hub' | 'sheet_solar_panel' | 'sheet_battery_bank'
  | 'sheet_launchpad' | 'sheet_cargo_ship_bay' | 'sheet_warp_gate'
  | 'sheet_water_extractor'
  | 'sheet_gate' | 'sheet_gate_post' | 'sheet_fence_straight' | 'sheet_fence_corner'
  | 'sheet_processing_plant' | 'sheet_fabricator' | 'sheet_assembly_complex'
  | 'sheet_research_lab' | 'sheet_ore_refinery' | 'sheet_fuel_synthesizer'
  | 'sheet_harvester_mineral_personal' | 'sheet_harvester_mineral_medium'
  | 'sheet_harvester_mineral_heavy'   | 'sheet_harvester_mineral_elite'
  | 'sheet_harvester_crystal_personal' | 'sheet_harvester_crystal_medium'
  | 'sheet_harvester_crystal_heavy'    | 'sheet_harvester_crystal_elite'
  | 'sheet_gas_collector_personal' | 'sheet_gas_collector_medium' | 'sheet_gas_collector_heavy'
  | 'sheet_cave_drill' | 'sheet_gas_trap'
  // --- Animated deposit sheets ---
  | 'deposit_vorax_small'    | 'deposit_vorax_medium'    | 'deposit_vorax_large'
  | 'deposit_krysite_small'  | 'deposit_krysite_medium'  | 'deposit_krysite_large'
  | 'deposit_aethite_small'  | 'deposit_aethite_medium'  | 'deposit_aethite_large'
  | 'deposit_voidstone_small'| 'deposit_voidstone_medium'| 'deposit_voidstone_large'
  | 'deposit_gas_small'      | 'deposit_gas_large'
  | 'deposit_dark_gas_geyser' | 'deposit_resonance_crystal' | 'deposit_bio_resin_flora'
  // --- Animated ground tiles ---
  | 'tile_floor_metal' | 'tile_floor_clean' | 'tile_ground_concrete'
  | 'tile_ground_asteroid_dirt' | 'tile_ground_planet_b_dirt' | 'tile_ground_metal_grating';

const ASSET_URLS: Record<AssetKey, string> = {
  player_ne: 'sprites/player/player_ne.png',
  player_nw: 'sprites/player/player_nw.png',
  player_se: 'sprites/player/player_se.png',
  player_sw: 'sprites/player/player_sw.png',
  player_sheet: 'sprites/player/player_sheet.png',

  building_drone_bay:      'sprites/buildings/drone_bay.png',
  building_storage_depot:  'sprites/buildings/storage_depot.png',
  building_sell_terminal:  'sprites/buildings/sell_terminal.png',
  building_shop_terminal:  'sprites/buildings/shop_terminal.png',
  building_launch_pad:     'sprites/buildings/launch_pad.png',
  building_spaceship:      'sprites/buildings/spaceship.png',

  ore_vorax:     'sprites/ores/ore_vorax.png',
  ore_krysite:   'sprites/ores/ore_krysite.png',
  ore_aethite:   'sprites/ores/ore_aethite.png',
  ore_voidstone: 'sprites/ores/ore_voidstone.png',
  ore_shards:    'sprites/ores/ore_shards.png',
  ore_node_vorax:'sprites/ore_node_vorax.png',

  tile_outpost_floor: 'sprites/ground/tile_outpost_floor.png',
  tile_outpost_edge:  'sprites/ground/tile_outpost_edge.png',
  tile_space_bg:      'sprites/ground/tile_space_bg.png',
  tile_asteroid:      'sprites/ground/tile_asteroid.png',
  tile_asteroid_field:'sprites/ground/tile_asteroid_field.png',
  tile_planet_b:      'sprites/ground/tile_planet_b.png',
  rock_small:         'sprites/ground/rock_small.png',
  rock_medium:        'sprites/ground/rock_medium.png',
  rock_large:         'sprites/ground/rock_large.png',

  drone_miner: 'sprites/drones/miner_spritesheet.png',

  // Animated building sheets
  sheet_drone_bay:                  'sprites/buildings/building_drone_bay_animated_sheet.png',
  sheet_habitation_module:          'sprites/buildings/habitation_module_sheet.png',
  sheet_crafting_station:           'sprites/buildings/crafting_station_sheet.png',
  sheet_trade_hub:                  'sprites/buildings/trade_hub_sheet.png',
  sheet_solar_panel:                'sprites/buildings/solar_panel_sheet.png',
  sheet_battery_bank:               'sprites/buildings/battery_bank_sheet.png',
  sheet_launchpad:                  'sprites/buildings/launchpad_animated_sheet.png',
  sheet_cargo_ship_bay:             'sprites/buildings/cargo_ship_bay_sheet.png',
  sheet_warp_gate:                  'sprites/buildings/warp_gate_sheet.png',
  sheet_water_extractor:            'sprites/buildings/atmospheric_water_extractor_sheet.png',
  sheet_gate:                       'sprites/buildings/gate_sheet.png',
  sheet_gate_post:                  'sprites/buildings/gate_post_sheet.png',
  sheet_fence_straight:             'sprites/buildings/fence_straight_sheet.png',
  sheet_fence_corner:               'sprites/buildings/fence_corner_sheet.png',
  sheet_processing_plant:           'sprites/buildings/processing_plant_sheet.png',
  sheet_fabricator:                 'sprites/buildings/fabricator_sheet.png',
  sheet_assembly_complex:           'sprites/buildings/assembly_complex_sheet.png',
  sheet_research_lab:               'sprites/buildings/research_lab_sheet.png',
  sheet_ore_refinery:               'sprites/buildings/ore_refinery_sheet.png',
  sheet_fuel_synthesizer:           'sprites/buildings/fuel_synthesizer_sheet.png',
  sheet_harvester_mineral_personal: 'sprites/buildings/harvester_mineral_personal_sheet.png',
  sheet_harvester_mineral_medium:   'sprites/buildings/harvester_mineral_medium_sheet.png',
  sheet_harvester_mineral_heavy:    'sprites/buildings/harvester_mineral_heavy_sheet.png',
  sheet_harvester_mineral_elite:    'sprites/buildings/harvester_mineral_elite_sheet.png',
  sheet_harvester_crystal_personal: 'sprites/buildings/harvester_crystal_personal_sheet.png',
  sheet_harvester_crystal_medium:   'sprites/buildings/harvester_crystal_medium_sheet.png',
  sheet_harvester_crystal_heavy:    'sprites/buildings/harvester_crystal_heavy_sheet.png',
  sheet_harvester_crystal_elite:    'sprites/buildings/harvester_crystal_elite_sheet.png',
  sheet_gas_collector_personal:     'sprites/buildings/gas_collector_personal_sheet.png',
  sheet_gas_collector_medium:       'sprites/buildings/gas_collector_medium_sheet.png',
  sheet_gas_collector_heavy:        'sprites/buildings/gas_collector_heavy_sheet.png',
  sheet_cave_drill:                 'sprites/buildings/harvester_cave_drill_sheet.png',
  sheet_gas_trap:                   'sprites/buildings/harvester_gas_trap_sheet.png',

  // Animated deposit sheets
  deposit_vorax_small:        'sprites/deposits/deposit_vorax_small.png',
  deposit_vorax_medium:       'sprites/deposits/deposit_vorax_medium.png',
  deposit_vorax_large:        'sprites/deposits/deposit_vorax_large.png',
  deposit_krysite_small:      'sprites/deposits/deposit_krysite_small.png',
  deposit_krysite_medium:     'sprites/deposits/deposit_krysite_medium.png',
  deposit_krysite_large:      'sprites/deposits/deposit_krysite_large.png',
  deposit_aethite_small:      'sprites/deposits/deposit_aethite_small.png',
  deposit_aethite_medium:     'sprites/deposits/deposit_aethite_medium.png',
  deposit_aethite_large:      'sprites/deposits/deposit_aethite_large.png',
  deposit_voidstone_small:    'sprites/deposits/deposit_voidstone_small.png',
  deposit_voidstone_medium:   'sprites/deposits/deposit_voidstone_medium.png',
  deposit_voidstone_large:    'sprites/deposits/deposit_voidstone_large.png',
  deposit_gas_small:          'sprites/deposits/deposit_gas_small.png',
  deposit_gas_large:          'sprites/deposits/deposit_gas_large.png',
  deposit_dark_gas_geyser:    'sprites/deposits/deposit_dark_gas_geyser_sheet.png',
  deposit_resonance_crystal:  'sprites/deposits/deposit_resonance_crystal_sheet.png',
  deposit_bio_resin_flora:    'sprites/deposits/deposit_bio_resin_flora_sheet.png',

  // Animated ground tiles
  tile_floor_metal:            'sprites/ground/tile_outpost_floor_metal.png',
  tile_floor_clean:            'sprites/ground/tile_outpost_floor_clean.png',
  tile_ground_concrete:        'sprites/ground/tile_ground_concrete.png',
  tile_ground_asteroid_dirt:   'sprites/ground/tile_ground_asteroid_dirt.png',
  tile_ground_planet_b_dirt:   'sprites/ground/tile_ground_planet_b_dirt.png',
  tile_ground_metal_grating:   'sprites/ground/tile_ground_metal_grating.png',
};

/**
 * Central texture loader. Call `load()` once during boot before any scene
 * constructs entities; entities then pull textures synchronously via
 * `texture()`. Missing textures fall back to `Texture.WHITE` so a missing
 * asset can be spotted visually rather than crashing.
 */
class AssetManagerImpl {
  private _loaded = false;
  private _cache = new Map<AssetKey, Texture>();

  get isLoaded(): boolean { return this._loaded; }

  async load(base = ''): Promise<void> {
    if (this._loaded) return;
    const entries = Object.entries(ASSET_URLS) as [AssetKey, string][];
    // Pixi Assets.load accepts a Record<string, string> of aliases.
    const map: Record<string, string> = {};
    for (const [key, url] of entries) map[key] = `${base}${url}`;
    try {
      const results = await Assets.load(Object.values(map));
      // `results` keys by URL; remap to AssetKey
      for (const [key, url] of entries) {
        const tex = (results as Record<string, Texture>)[`${base}${url}`];
        if (tex) {
          tex.source.scaleMode = 'nearest';
          this._cache.set(key, tex);
        } else {
          console.warn(`[AssetManager] No texture for ${key} (${url})`);
        }
      }
    } catch (err) {
      console.error('[AssetManager] load failed', err);
    }
    this._loaded = true;
  }

  texture(key: AssetKey): Texture {
    const t = this._cache.get(key);
    if (!t) {
      if (this._loaded) console.warn(`[AssetManager] Missing texture: ${key}`);
      return Texture.WHITE;
    }
    return t;
  }

  has(key: AssetKey): boolean {
    return this._cache.has(key);
  }
}

export const assetManager = new AssetManagerImpl();
