import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketplaceService, SELL_PRICES, MARKETPLACE_RESOURCES } from '@services/MarketplaceService';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';
import type { OreType } from '@data/types';
import type { StorageDepot } from '@entities/StorageDepot';

function mockDepot(initial: Partial<Record<OreType, number>> = {}): StorageDepot {
  const stockpile = new Map<OreType, number>();
  for (const [k, v] of Object.entries(initial)) {
    if (v && v > 0) stockpile.set(k as OreType, v);
  }
  return {
    getStockpile: vi.fn(() => stockpile),
    setStock: vi.fn((ore: OreType, qty: number) => {
      if (qty <= 0) stockpile.delete(ore);
      else stockpile.set(ore, qty);
    }),
    pull: vi.fn((ore: OreType, qty: number) => {
      const cur = stockpile.get(ore) ?? 0;
      const removed = Math.min(cur, qty);
      if (removed > 0) stockpile.set(ore, cur - removed);
      return removed;
    }),
    clearStock: vi.fn(() => stockpile.clear()),
  } as unknown as StorageDepot;
}

describe('MarketplaceService', () => {
  let svc: MarketplaceService;

  beforeEach(() => {
    svc = new MarketplaceService();
    gameState.setCredits(1000);
  });

  it('exposes SELL_PRICES covering all known ore types', () => {
    expect(SELL_PRICES.vorax).toBe(1);
    expect(SELL_PRICES.crystal_lattice).toBe(25);
    expect(SELL_PRICES.void_cores).toBe(60);
  });

  it('buy price is 1.5x sell price (rounded up)', () => {
    expect(svc.getBuyPrice('vorax')).toBe(2);       // ceil(1 * 1.5)
    expect(svc.getBuyPrice('krysite')).toBe(8);     // ceil(5 * 1.5)
    expect(svc.getBuyPrice('crystal_lattice')).toBe(38); // ceil(25 * 1.5)
  });

  it('getListings returns the curated resource set with both prices', () => {
    const listings = svc.getListings();
    expect(listings.length).toBe(MARKETPLACE_RESOURCES.length);
    const vorax = listings.find(l => l.oreType === 'vorax')!;
    expect(vorax.sellPrice).toBe(1);
    expect(vorax.buyPrice).toBe(2);
    expect(vorax.displayName).toBe('VORAX');
  });

  it('canBuy checks credit balance', () => {
    gameState.setCredits(10);
    expect(svc.canBuy('krysite', 1)).toBe(true);   // 8 CR
    expect(svc.canBuy('krysite', 2)).toBe(false);  // 16 CR
    expect(svc.canBuy('vorax', 0)).toBe(false);
  });

  it('buy deducts credits and stocks the depot', () => {
    const depot = mockDepot();
    const ok = svc.buy(depot, 'krysite', 3);
    expect(ok).toBe(true);
    expect(gameState.credits).toBe(1000 - 8 * 3);
    expect(depot.getStockpile().get('krysite')).toBe(3);
  });

  it('buy fails when credits are short and leaves state unchanged', () => {
    gameState.setCredits(5);
    const depot = mockDepot();
    const ok = svc.buy(depot, 'crystal_lattice', 1); // needs 38 CR
    expect(ok).toBe(false);
    expect(gameState.credits).toBe(5);
    expect(depot.getStockpile().size).toBe(0);
  });

  it('buy emits marketplace:buy event', () => {
    const depot = mockDepot();
    const cb = vi.fn();
    EventBus.on('marketplace:buy', cb);
    svc.buy(depot, 'vorax', 10);
    expect(cb).toHaveBeenCalledWith({ ore: 'vorax', qty: 10, cost: 20 });
    EventBus.off('marketplace:buy', cb);
  });

  it('sell removes from depot stockpile and credits the player', () => {
    const depot = mockDepot({ krysite: 20 });
    const revenue = svc.sell(depot, 'krysite', 5);
    expect(revenue).toBe(25); // 5 * 5
    expect(gameState.credits).toBe(1025);
    expect(depot.getStockpile().get('krysite')).toBe(15);
  });

  it('sell is capped by available stockpile', () => {
    const depot = mockDepot({ vorax: 3 });
    const revenue = svc.sell(depot, 'vorax', 10); // only 3 available
    expect(revenue).toBe(3);
    expect(depot.getStockpile().get('vorax') ?? 0).toBe(0);
  });

  it('sell returns 0 when stockpile empty or price is zero', () => {
    const depot = mockDepot();
    expect(svc.sell(depot, 'vorax', 5)).toBe(0);
    depot.getStockpile().set('gas', 100);
    expect(svc.sell(depot, 'gas', 5)).toBe(0); // gas sell price is 0
  });

  it('sellAll liquidates the whole stockpile at sell prices', () => {
    const depot = mockDepot({ vorax: 10, krysite: 4, crystal_lattice: 2 });
    const revenue = svc.sellAll(depot);
    expect(revenue).toBe(10 * 1 + 4 * 5 + 2 * 25); // 10 + 20 + 50 = 80
    expect(gameState.credits).toBe(1080);
    expect(depot.getStockpile().size).toBe(0);
  });

  it('canSell returns false for zero-priced or absent items', () => {
    const depot = mockDepot({ vorax: 5, gas: 50 });
    expect(svc.canSell(depot, 'vorax', 5)).toBe(true);
    expect(svc.canSell(depot, 'vorax', 10)).toBe(false);
    expect(svc.canSell(depot, 'gas', 1)).toBe(false);
    expect(svc.canSell(depot, 'krysite', 1)).toBe(false);
  });
});
