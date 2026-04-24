/**
 * MarketplaceService — central pricing + transaction service for buying and
 * selling resources through the Trade Hub.
 *
 * Prices mirror spec 12 (economy). Sell prices reward the player for shipped
 * ore; buy prices carry a markup (BUY_MARKUP) so the marketplace is a last-
 * resort supplier, not a farm target.
 */
import type { OreType } from '@data/types';
import type { StorageDepot } from '@entities/StorageDepot';
import { gameState } from './GameState';
import { EventBus } from './EventBus';

export const SELL_PRICES: Record<OreType, number> = {
  vorax: 1,
  krysite: 5,
  gas: 0,
  steel_bars: 5,
  steel_plates: 10,
  compressed_gas: 1,
  water: 1,
  alloy_rods: 15,
  rocket_fuel: 2,
  shards: 3,
  aethite: 8,
  void_cores: 60,
  processed_rations: 3,
  bio_resin: 4,
  processed_resin: 6,
  power_cells: 10,
  bio_circuit_boards: 15,
  dark_gas: 1,
  void_touched_ore: 5,
  resonance_shards: 15,
  ferrovoid: 12,
  warp_components: 50,
  crystal_lattice: 25,
  drill_head: 35,
  hull: 400,
  engine: 600,
  fuel_tank: 300,
  avionics: 500,
  landing_gear: 250,
  iron_ore: 1,
  copper_ore: 2,
  iron_bar: 5,
  copper_bar: 10,
  hydrolox_fuel: 20,
};

const BUY_MARKUP = 1.5;

/** Set to true during testing — all buys are free, no credit check. */
export const FREE_BUY_MODE = true;

export const MARKETPLACE_RESOURCES: OreType[] = Object.keys(SELL_PRICES) as OreType[];

export interface MarketplaceListing {
  oreType: OreType;
  displayName: string;
  sellPrice: number;
  buyPrice: number;
}

function displayNameFor(ore: OreType): string {
  return ore.toUpperCase().replace(/_/g, ' ');
}

export class MarketplaceService {
  getSellPrice(ore: OreType): number {
    return SELL_PRICES[ore] ?? 0;
  }

  getBuyPrice(ore: OreType): number {
    if (FREE_BUY_MODE) return 0;
    const base = SELL_PRICES[ore] ?? 0;
    if (base <= 0) return 0;
    return Math.ceil(base * BUY_MARKUP);
  }

  getListings(): MarketplaceListing[] {
    return MARKETPLACE_RESOURCES.map(ore => ({
      oreType: ore,
      displayName: displayNameFor(ore),
      sellPrice: this.getSellPrice(ore),
      buyPrice: this.getBuyPrice(ore),
    }));
  }

  canBuy(ore: OreType, qty: number): boolean {
    if (qty <= 0) return false;
    if (FREE_BUY_MODE) return true;
    const price = this.getBuyPrice(ore);
    if (price <= 0) return false;
    return gameState.credits >= price * qty;
  }

  canSell(depot: StorageDepot, ore: OreType, qty: number): boolean {
    if (qty <= 0) return false;
    if (this.getSellPrice(ore) <= 0) return false;
    return (depot.getStockpile().get(ore) ?? 0) >= qty;
  }

  /** Buy qty of ore; free in FREE_BUY_MODE, otherwise deducts credits. */
  buy(depot: StorageDepot, ore: OreType, qty: number): boolean {
    if (!this.canBuy(ore, qty)) return false;
    const cost = FREE_BUY_MODE ? 0 : this.getBuyPrice(ore) * qty;
    if (cost > 0) gameState.addCredits(-cost);
    const current = depot.getStockpile().get(ore) ?? 0;
    depot.setStock(ore, current + qty);
    EventBus.emit('marketplace:buy', { ore, qty, cost });
    return true;
  }

  /** Sell up to qty of ore from depot stockpile at SELL_PRICE. Returns CR earned. */
  sell(depot: StorageDepot, ore: OreType, qty: number): number {
    if (qty <= 0) return 0;
    const price = this.getSellPrice(ore);
    if (price <= 0) return 0;
    const removed = depot.pull(ore, qty);
    if (removed <= 0) return 0;
    const revenue = removed * price;
    gameState.addCredits(revenue);
    EventBus.emit('marketplace:sell', { ore, qty: removed, revenue });
    EventBus.emit('ore:sold', revenue);
    return revenue;
  }

  /** Liquidate the entire depot stockpile at sell prices. */
  sellAll(depot: StorageDepot): number {
    let revenue = 0;
    for (const [ore, qty] of depot.getStockpile()) {
      revenue += qty * this.getSellPrice(ore);
    }
    depot.clearStock();
    if (revenue > 0) {
      gameState.addCredits(revenue);
      EventBus.emit('ore:sold', revenue);
    }
    return revenue;
  }
}

export const marketplaceService = new MarketplaceService();
