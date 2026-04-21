import { Assets, Texture } from 'pixi.js';

export type AssetKey =
  | 'player_ne' | 'player_nw' | 'player_se' | 'player_sw'
  | 'building_drone_bay' | 'building_storage_depot' | 'building_sell_terminal'
  | 'building_shop_terminal' | 'building_launch_pad' | 'building_spaceship'
  | 'ore_vorax' | 'ore_krysite' | 'ore_aethite' | 'ore_voidstone' | 'ore_shards'
  | 'ore_node_vorax'
  | 'tile_outpost_floor' | 'tile_outpost_edge' | 'tile_space_bg'
  | 'tile_asteroid' | 'tile_asteroid_field' | 'tile_planet_b'
  | 'rock_small' | 'rock_medium' | 'rock_large'
  | 'drone_miner';

const ASSET_URLS: Record<AssetKey, string> = {
  player_ne: 'sprites/player/player_ne.png',
  player_nw: 'sprites/player/player_nw.png',
  player_se: 'sprites/player/player_se.png',
  player_sw: 'sprites/player/player_sw.png',

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
