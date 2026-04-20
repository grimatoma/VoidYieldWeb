import { TECH_NODES, type TechNode } from '@data/tech_tree_nodes';
import { gameState } from '@services/GameState';
import { EventBus } from '@services/EventBus';

export class TechTree {
  private _purchaseCounts = new Map<string, number>();

  getNode(nodeId: string): TechNode | undefined {
    return TECH_NODES.find(n => n.nodeId === nodeId);
  }

  getAllNodes(): TechNode[] {
    return TECH_NODES;
  }

  isUnlocked(nodeId: string): boolean {
    return gameState.hasUnlock(nodeId);
  }

  /** Returns number of times this node has been purchased (for multi-purchase nodes). */
  purchaseCount(nodeId: string): number {
    return this._purchaseCounts.get(nodeId) ?? (gameState.hasUnlock(nodeId) ? 1 : 0);
  }

  canUnlock(nodeId: string): boolean {
    const node = this.getNode(nodeId);
    if (!node) return false;
    // Multi-purchase check
    const count = this.purchaseCount(nodeId);
    if (node.maxPurchases !== undefined && count >= node.maxPurchases) return false;
    // Single-purchase: already unlocked
    if (node.maxPurchases === undefined && gameState.hasUnlock(nodeId)) return false;
    // Prerequisites
    if (!node.prerequisites.every(p => gameState.hasUnlock(p))) return false;
    // Costs
    if (gameState.researchPoints < node.rpCost) return false;
    if (gameState.credits < node.crCost) return false;
    return true;
  }

  unlock(nodeId: string): boolean {
    if (!this.canUnlock(nodeId)) return false;
    const node = this.getNode(nodeId)!;

    if (node.rpCost > 0 && !gameState.spendResearchPoints(node.rpCost)) return false;
    if (node.crCost > 0) gameState.addCredits(-node.crCost);

    // Track purchase count
    const count = this._purchaseCounts.get(nodeId) ?? 0;
    this._purchaseCounts.set(nodeId, count + 1);

    gameState.addUnlock(nodeId);
    EventBus.emit('game:saved');  // trigger autosave
    return true;
  }

  /** Sum of effectValue for all unlocked nodes of a given effectType. */
  getTotalEffect(effectType: string): number {
    let total = 0;
    for (const node of TECH_NODES) {
      if (node.effectType === effectType) {
        const count = this.purchaseCount(node.nodeId);
        total += node.effectValue * count;
      }
    }
    return total;
  }

  /** Get highest single value for a "tier" effect (e.g. survey_radius, lab_time).
      Returns the max value among all unlocked nodes of that type. */
  getMaxEffect(effectType: string): number {
    let max = 0;
    for (const node of TECH_NODES) {
      const count = this.purchaseCount(node.nodeId);
      if (count > 0 && node.effectType === effectType) {
        max = Math.max(max, node.effectValue);
      }
    }
    return max;
  }

  /** Get product of all unlocked multiplier effects of the given type.
      Returns 1.0 if none unlocked. */
  getMultiplierEffect(effectType: string): number {
    let product = 1.0;
    for (const node of TECH_NODES) {
      const count = this.purchaseCount(node.nodeId);
      if (count > 0 && node.effectType === effectType) {
        product *= node.effectValue;
      }
    }
    return product;
  }
}

export const techTree = new TechTree();
