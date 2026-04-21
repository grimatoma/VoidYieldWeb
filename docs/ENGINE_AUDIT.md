# VoidYield Web — Engine Systems Audit (v2)

**Date:** 2026-04-20  
**Author:** Audit pass against the source, reading every service file  
**Scope:** Non-visual game engine systems: services, game loop, save system, data layer, event bus, offline simulation  
**Context:** Written to inform the visual rewrite in `docs/ARCHITECTURE_REDESIGN.md`. These systems survive the rewrite; they need to be solid before the renderer changes around them.

**Severity key:**  
🔴 Blocks scalability — must fix before or concurrent with the visual rewrite  
🟡 Technical debt — fix in the first clean-up sprint post-rewrite  
🟢 Minor — fix opportunistically

---

## 1. State Management — `GameState.ts`

**Verdict: Not a god object. Scope is appropriate.**

`GameState` owns credits, RP, current planet, phase flags, sector number, tech unlock IDs, and progression booleans (`a2Visited`, `planetCVisited`, `voidCoresProduced`, `a3Unlocked`). At 153 lines it is dense but cohesive — every field is genuinely global player state. This is one of the healthiest parts of the codebase.

### Issues

🟡 **Game logic embedded in a state container (`GameState.ts:99–103`)**  
`_checkA3Unlock()` encodes a progression gate: `a2Visited && voidCoresProduced >= 10`. This is design logic, not state storage. It belongs in `SectorManager` or a `ProgressionService`. If the unlock condition changes, a developer edits a state container rather than a progression system.

🟡 **`applyFromSave()` bypasses guarded setters (`GameState.ts:121–133`)**  
Fields are assigned directly (`this._credits = data.credits`) instead of going through `setCredits()` / `setResearchPoints()` which emit `credits:changed` / `rp:changed`. On load, any system that subscribed to those events won't see the restored values. Use the setters even during deserialization, or emit the events explicitly after assignment.

🟡 **`as any` cast on optional SaveData fields (`GameState.ts:129–132`)**  
```typescript
this._a2Visited = (data as any).a2_visited ?? false;
```
These fields (`a2_visited`, `void_cores_produced`, `a3_unlocked`, `planet_c_visited`) are declared as `optional` in the `SaveData` interface (`SaveManager.ts:29–32`). The `as any` cast is unnecessary and suppresses type checking. Access them as `data.a2_visited ?? false` directly.

🟢 **`addCredits(-n)` anti-pattern (`TechTree.ts:46`)**  
`TechTree.unlock()` calls `gameState.addCredits(-node.crCost)` to spend credits. `addCredits` clamps at zero; a race between a canUnlock check and the actual spend can silently under-charge. A `spendCredits(amount): boolean` method (mirroring `spendResearchPoints`) would be explicit and safe.

---

## 2. Service Coupling & Import Graph

**Verdict: Mostly clean. One god-orchestrator and one encapsulation breach.**

Full import graph (service → service only):
```
EventBus         ← no service imports (correct baseline)
SaveManager      → EventBus
GameState        → EventBus, SaveManager
TechTree         → GameState, EventBus
MiningService    → DepositMap, GameState, EventBus
FleetManager     → (entities, data only)
HarvesterManager → EventBus, Inventory
ZoneManager      → HarvesterManager, FleetManager
ConsumptionManager → EventBus
LogisticsManager → EventBus
PowerManager     → (standalone)
StrandingManager → (standalone)
SectorManager    → GameState, EventBus, StrandingManager, ConsumptionManager, LogisticsManager
```

No import cycles. `SectorManager` has the highest fan-in with 5 service dependencies.

### Issues

🔴 **SectorManager is a god-orchestrator (`SectorManager.ts:119–154`)**  
`applyPrestigeAndReset()` directly calls `gameState.setCredits()`, `consumptionManager.resetPopulation()`, `logisticsManager.clearRoutes()`, and `strandingManager.reset()`. Every service added to the prestige reset must be manually wired here. This also means SectorManager's tests need mocks for four other services.

The fix: emit `EventBus.emit('prestige:reset', { bonus: selectedBonus })` and let each service listen and reset itself. SectorManager orchestrates the sequence by emitting; it does not call.

🔴 **Private field mutation via cast (`SectorManager.ts:142`)**  
```typescript
(strandingManager as unknown as { _rocketFuel: number })._rocketFuel = startFuel;
```
This bypasses `StrandingManager`'s public API to set a private field by name string. TypeScript won't catch a rename of `_rocketFuel`. Fix: add `StrandingManager.setFuel(n: number)`. One line.

The exact same cast appears in `VoidYieldDebugAPI.ts:116–118`. In test code it's acceptable; in production code it is not.

🟡 **`_countPlanetsVisited()` uses rocket fuel as proxy for Planet B visit (`SectorManager.ts:97`)**  
```typescript
if (!strandingManager.isStranded || strandingManager.rocketFuel > 20) count++;
```
Fuel level is used as a proxy for "the player visited Planet B." This is fragile — fuel can exceed 20 before launch for unrelated reasons. `GameState` already has `a2Visited` and `planetCVisited`; add `planetBVisited` and use it here.

🟡 **TechTree directly reads `gameState` instead of subscribing to events (`TechTree.ts:2,17,34,36`)**  
`TechTree.isUnlocked()`, `canUnlock()`, and `unlock()` all call `gameState.*` methods directly. This is a tight coupling: TechTree cannot be unit-tested or reused without a fully instantiated GameState. An injectable `hasUnlock(id)` / `spendRP(n)` interface would make TechTree testable in isolation.

🟡 **`_planetDepots` is module-scope rather than a class field (`LogisticsManager.ts:6`)**  
```typescript
const _planetDepots = new Map<string, StorageDepot>();
```
This Map lives at module scope. Tests that construct a fresh `LogisticsManager` instance share the same depot map, breaking test isolation. Move it inside the class as a private field.

🟡 **`_cargoLoaded` stored as `any` cast on a typed route object (`LogisticsManager.ts:92`)**  
```typescript
(route as any)._cargoLoaded = pulled;
```
`TradeRoute` doesn't have a `_cargoLoaded` field. Add it to the interface as `_cargoLoaded?: number` or track partial loads in a separate `Map<routeId, number>`.

---

## 3. PixiJS Coupling in Simulation Services

**Verdict: Two simulation services reach directly into the scene graph. This blocks unit testing and the visual rewrite.**

🔴 **`HarvesterManager` manipulates a PixiJS Container (`HarvesterManager.ts:2,9,14`)**  
```typescript
import type { Container } from 'pixi.js';
add(h: HarvesterBase, worldContainer: Container): void {
  this.harvesters.push(h);
  worldContainer.addChild(h.container);   // ← scene graph mutation inside a service
}
```
A service that manages harvester simulation state should not touch the renderer. The scene should call `worldContainer.addChild(h.container)` itself after registering the harvester. Any unit test of `HarvesterManager` currently requires a live PixiJS `Application`.

🔴 **`DepositMap` manipulates a PixiJS Container (`DepositMap.ts:2,12,17–18`)**  
Same problem. `loadPlanet()` calls `worldContainer.addChild(dep.container)` and `worldContainer.removeChild()`. Deposit state management (position, exhaustion) should be decoupled from visual placement. The scene owns the visual layer; the service owns the data.

---

## 4. Save System — `SaveManager.ts` + `BootScene.ts`

**Verdict: The autosave has a structural gap. Entity state is never persisted.**

### Issues

🔴 **Autosave only captures `GameState` fields — all entity state is silently dropped (`BootScene.ts:48–51`)**  
```typescript
saveManager.startAutosave(() => ({
  ...defaultSaveData(),
  ...gameState.serialize(),
}));
```
`gameState.serialize()` returns credits, RP, tech unlocks, phase flags, current planet, sector number, and progression booleans. It does **not** include:

| `SaveData` field | Status |
|---|---|
| `stockpile_quantities` | Always `{}` (default) |
| `deposit_map` | Always `{}` (default) |
| `harvester_states` | Always `{}` (default) |
| `drone_task_queues` | Always `{}` (default) |
| `factory_states` | Always `{}` (default) |
| `population_data` | Always `{}` (default) |
| `need_satisfaction_state` | Always `{}` (default) |
| `active_trade_routes` | Always `[]` (default) |
| `sector_manager` | Never written despite `SectorManager.serialize()` existing |

A player who builds harvesters, sets up trade routes, and advances their colony loses all of it on every reload. `SectorManager.serialize()` and `StrandingManager.serialize()` are fully implemented and just need to be wired into the `getState` callback.

🔴 **Schema version mismatch destroys saves with no migration path (`SaveManager.ts:83–85`)**  
```typescript
if (parsed.format_version !== FORMAT_VERSION) {
  console.warn(`SaveManager: format mismatch...`);
  return null;   // effectively: wipe the save
}
```
`FORMAT_VERSION = 1`. Any schema change increments this number and silently deletes every existing save. For a 50–100 hour game this is not acceptable. Add a migration table:
```typescript
const MIGRATIONS: Record<number, (data: unknown) => SaveData> = {
  1: (d) => ({ ...defaultSaveData(), ...(d as Partial<SaveData>) }),
};
```
Bump the version, write the migration, keep old saves playable.

🟡 **Offline sim trigger uses a `setTimeout` race condition (`SaveManager.ts:94`)**  
```typescript
setTimeout(() => {
  EventBus.emit('offline:simulation_needed', offlineSeconds);
}, 1000);
```
The 1-second delay waits for services to initialize. If boot takes > 1 second (slow device, cold cache), the event fires before listeners are registered and is silently dropped. Emit the event from `BootScene.enter()` _after_ `applyFromSave()` returns and the scene is ready.

🟡 **`clearSave()` emits no event (`SaveManager.ts:106–108`)**  
Any UI displaying save status or "new game" state won't react. Emit `EventBus.emit('save:cleared')`.

---

## 5. Data Layer — Hardcoded Balance vs. Data-Driven

**Verdict: Design decisions are scattered across service files as magic numbers. Balancing requires code changes and a rebuild.**

🟡 **Balance constants scattered in service files**

| Constant | File | Line | Value |
|---|---|---|---|
| `DAY_SECONDS` | `ConsumptionManager.ts` | 6 | `1200` |
| `LUXURY_TIMER_THRESHOLD` | `ConsumptionManager.ts` | 8 | `10` |
| `ADVANCEMENT_INTERVAL` | `ConsumptionManager.ts` | 10 | `30` |
| Mining units per interact | `MiningService.ts` | 38 | `3` |
| Mining cooldown | `MiningService.ts` | 41 | `0.5` |
| Harvester refuel amount | `HarvesterManager.ts` | 48 | `50` |
| Zone scan interval | `ZoneManager.ts` | 37 | `3.0` |
| Default trip time | `LogisticsManager.ts` | 55 | `180` |
| Offline sim cap | `OfflineSimulator.ts` | 17 | `8 * 3600` |
| Offline sim step | `OfflineSimulator.ts` | 18 | `30` |

Move all of these to `src/data/balance.ts`. Makes balancing a single-file change with no risk of touching service logic.

🔴 **Offline simulator has its own hardcoded sell price table (`OfflineSimulator.ts:65–69`)**  
```typescript
const SELL_PRICES: Record<string, number> = {
  vorax: 1, krysite: 5, gas: 0, steel_bars: 5, ...
};
```
These prices are duplicated from wherever the live sell prices are defined. When a designer changes a price in the game data, the offline simulator silently uses stale values and produces wrong credit totals. The offline simulator must import from the same source of truth as the live game.

🟡 **`CARGO_SHIP_SPECS` is a data table living in a service file (`LogisticsManager.ts:8–13`)**  
Move to `src/data/cargoShips.ts` alongside the tech nodes and deposit data.

🟢 **`data/` root directory contains unreferenced JSON files**  
`data/drones.json`, `data/upgrades.json`, `data/ship_parts.json`, `data/rocket_components.json` are not imported by anything in `src/`. Either migrate them into the TypeScript data layer or delete them.

---

## 6. Event System — `EventBus.ts`

**Verdict: Well-architected. One naming ambiguity, one copy-paste bug, one missing event.**

The `GameEvents` type map provides compile-time guarantees on event names and payload shapes. Synchronous dispatch via EventEmitter3 is correct for a single-threaded game loop — no async ordering hazards.

### Issues

🟡 **`'game:saved'` event is semantically overloaded**  
`SaveManager.saveGame()` emits `'game:saved'` to mean "a save was written to localStorage" (`SaveManager.ts:72`). `TechTree.unlock()` also emits `'game:saved'` to mean "please trigger a save now" (`TechTree.ts:53`). These are opposite directions on the same channel. Any listener that expects "save was persisted" will trigger incorrectly when TechTree fires it as a request. Rename one: `'save:requested'` for the trigger signal, keep `'game:saved'` for the notification.

🟢 **`pioneerWaterPct` reads from the wrong map key (`ConsumptionManager.ts:218–220`)**  
```typescript
const pioneerGasPct  = this._tierBasicNeedsPct.get('pioneer') ?? 1.0;
const pioneerWaterPct = this._tierBasicNeedsPct.get('pioneer') ?? 1.0;  // ← same key
EventBus.emit('needs:changed', pioneerGasPct, pioneerWaterPct);
```
Both values read `'pioneer'`. If gas and water satisfaction diverge, the HUD will show the same number for both. This should likely read from a `'water'` or `'pioneer_water'` tracking key, or the `needs:changed` event payload needs rethinking.

🟢 **`PowerManager` never emits when power state changes**  
`balance` and `throttleMultiplier` are synchronous getters. Systems that respond to power deficit (HUD warning, building throttle) must poll every frame. Add `EventBus.emit('power:changed', this.balance)` in `registerGenerator`, `unregisterGenerator`, `registerConsumer`, `unregisterConsumer`.

---

## 7. Game Loop — Update Order & Delta Time

**Verdict: Loop machinery is correct. Update order is invisible and large-delta behavior is unguarded.**

`main.ts:56` uses `app.ticker.add()` — PixiJS's rAF wrapper. Delta is `ticker.deltaMS / 1000` (seconds). `inputManager.flush()` runs at end of frame. This is correct.

### Issues

🔴 **Service update order is scene-local and undocumented**  
Each scene calls `harvesterManager.update()`, `fleetManager.update()`, `logisticsManager.update()`, `consumptionManager.update()`, `zoneManager.update()` in whatever order it chooses. There is no central enforcement. If two planets call the same services in different orders, behavior silently diverges. The redesign doc specifies a `GameLoop` class — this is exactly why it's needed. Services should not depend on being called in the right order by a scene; the loop should enforce order.

🟡 **Large delta skips `ConsumptionManager` day ticks (`ConsumptionManager.ts:157–162`)**  
The day accumulator uses `if (this._dayTimer >= DAY_SECONDS)` with a single subtraction. A browser stall that produces `deltaMS = 5000ms` will advance the accumulator past the day boundary once. The correct pattern is `while (this._dayTimer >= DAY_SECONDS) { this._dayTimer -= DAY_SECONDS; this._runDayTick(depot); }`. Add a cap of, say, 3 ticks per frame to prevent spiral if the stall is severe.

🟡 **Large delta teleports cargo ships past their destination (`LogisticsManager.ts:115–120`)**  
```typescript
route.elapsedSec += delta;
if (route.elapsedSec >= route.tripTimeSec) { this._deliver(route); }
```
A 10-second delta on a 3-second route will deliver it once. But a delivery that should have triggered two route cycles will only trigger once. Add a clamp on `delta` at the top of the game loop (`const safeDelta = Math.min(delta, 1/20)`) to prevent large jumps.

🟢 **No systems mutate render-visible state during the render pass.** The ticker/update separation is clean.

---

## 8. Offline Simulation Correctness — `OfflineSimulator.ts`

**Verdict: Structurally isolated (good for testability) but diverges from live behavior in several ways.**

### Issues

🔴 **Trip completion check uses modulo on floating-point time steps (`OfflineSimulator.ts:63`)**  
```typescript
if (t > 0 && t % r.tripTimeSec === 0) {
```
`t = step * STEP_SIZE = step * 30`. This is only exact when `tripTimeSec` is a multiple of 30. The default is 180 (fine — 6 steps). But a route with `tripTimeSec = 45` satisfies `45 % 45 === 0` at `t=45`, then `t=90` (`90 % 45 === 0`) — but `t=75` is skipped because `75 % 45 = 30 ≠ 0`. Non-standard trip times produce incorrect delivery counts. Fix: track `elapsedSec` per route in the simulation, not global time modulo.

🔴 **Offline sell prices duplicated and will drift (`OfflineSimulator.ts:65–69`)**  
Covered in §5. The `SELL_PRICES` dict is a separate copy that will diverge from live prices. This makes offline credit totals wrong any time game balance changes.

🟡 **Stall counter increments per-batch, not per-harvester (`OfflineSimulator.ts:50–57`)**  
```typescript
if (t > 3600 && step % 120 === 0) {
  stalledHarvesters++;
  ...
}
```
This block runs once per 120-step window for every harvester in the array — regardless of whether that specific harvester actually stalled. With 5 harvesters and 4 hours offline, it reports `5 * 4 = 20` stalls instead of tracking which harvesters are actually full. Track per-harvester state.

🟡 **`ConsumptionManager` not simulated offline**  
Colony needs freeze while the player is away. Population tiers, productivity, and advancement timers don't advance. A player who was at 95% luxury satisfaction returns to find they've made no progress. Document this as a known gap and consider whether a simplified colony tick (just need-satisfaction against the last-saved stockpile) is worth adding.

---

## 9. Drone Mining Loop — Determinism

**Verdict: Deterministic within a session. Cross-session state is lost entirely (save gap, not a logic bug).**

Within a live session, `ZoneManager.update()` scans every 3 seconds, finds harvesters needing fuel or emptying, and dispatches idle refinery drones. The task queue executes via delta accumulation — no randomness.

On reload: `FleetManager.clear()` is called on scene exit. Drone circuits are not restored (no `serialize()`). A player who leaves with 4 drones mid-circuit returns to idle drones. This is the save completeness issue documented in §4, not a correctness problem with the running simulation.

🟡 **ZoneManager can double-dispatch drones under `advanceTime()` (`ZoneManager.ts:37–39`)**  
```typescript
this._scanTimer += delta;
if (this._scanTimer < 3.0) return;
this._scanTimer = 0;
this._dispatched.clear();
```
`advanceTime()` calls the scene updater in 1-second chunks. Five consecutive 1-second calls will fire the ZoneManager scan five times (at t=3, 4, 5 etc.) if `_scanTimer` accumulates across calls. The `_dispatched.clear()` only prevents double-dispatch within a single scan, not across back-to-back scans where the 3-second boundary is crossed multiple times. This can cause a drone to receive two circuits in the same E2E test that uses `advanceTime(10)`. Fix: clamp `_scanTimer` correctly via `this._scanTimer -= 3.0` (not `= 0`) so over-accumulated time carries forward.

---

## Summary Table

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Autosave drops all entity state — only GameState fields persist | 🔴 | `BootScene.ts:48–51` |
| 2 | Schema version mismatch silently destroys saves; no migration path | 🔴 | `SaveManager.ts:83–85` |
| 3 | `SectorManager.applyPrestigeAndReset()` directly calls 4 other services | 🔴 | `SectorManager.ts:119–154` |
| 4 | Private field mutation via `as unknown as` cast | 🔴 | `SectorManager.ts:142` |
| 5 | `HarvesterManager` / `DepositMap` import and mutate PixiJS scene graph | 🔴 | `HarvesterManager.ts:2,9,14` · `DepositMap.ts:2,12,18` |
| 6 | Service update order is undocumented, scene-local, unenforced | 🔴 | `main.ts:56–59` |
| 7 | Offline trip-completion check uses modulo — fails for non-30s-multiple trip times | 🔴 | `OfflineSimulator.ts:63` |
| 8 | Offline sell prices duplicated; will drift from live prices | 🔴 | `OfflineSimulator.ts:65–69` |
| 9 | `game:saved` event overloaded as both notification and trigger | 🟡 | `TechTree.ts:53` · `SaveManager.ts:72` |
| 10 | `GameState.applyFromSave()` bypasses guarded setters, no events emitted | 🟡 | `GameState.ts:121–133` |
| 11 | Progression gate logic in GameState instead of SectorManager | 🟡 | `GameState.ts:99–103` |
| 12 | `_countPlanetsVisited()` uses rocket fuel as proxy for Planet B visit | 🟡 | `SectorManager.ts:97` |
| 13 | `_planetDepots` at module scope breaks test isolation | 🟡 | `LogisticsManager.ts:6` |
| 14 | `_cargoLoaded` stored as `any` cast on typed `TradeRoute` | 🟡 | `LogisticsManager.ts:92` |
| 15 | `ConsumptionManager.update()` requires depot argument every frame | 🟡 | `ConsumptionManager.ts:153` |
| 16 | Balance constants scattered in service files; rebuilds required to tune | 🟡 | Multiple |
| 17 | `CARGO_SHIP_SPECS` data table inside a service file | 🟡 | `LogisticsManager.ts:8–13` |
| 18 | Large deltaMS skips ConsumptionManager day ticks | 🟡 | `ConsumptionManager.ts:157–162` |
| 19 | Large deltaMS can skip cargo ship deliveries | 🟡 | `LogisticsManager.ts:115–120` |
| 20 | Offline stall counter increments per-batch, not per-harvester | 🟡 | `OfflineSimulator.ts:50–57` |
| 21 | `ZoneManager._scanTimer = 0` can cause double-dispatch under `advanceTime()` | 🟡 | `ZoneManager.ts:39` |
| 22 | Offline sim omits ConsumptionManager — documented nowhere | 🟡 | `OfflineSimulator.ts` |
| 23 | `as any` cast for optional SaveData fields in applyFromSave | 🟡 | `GameState.ts:129–132` |
| 24 | `pioneerWaterPct` reads same map key as `pioneerGasPct` (copy-paste bug) | 🟢 | `ConsumptionManager.ts:219` |
| 25 | `PowerManager` emits no event on power state change | 🟢 | `PowerManager.ts` |
| 26 | `addCredits(-n)` anti-pattern for spending; no `spendCredits()` method | 🟢 | `TechTree.ts:46` |
| 27 | `data/` root directory has unreferenced legacy JSON files | 🟢 | `data/*.json` |

---

## Recommended Pre-Rewrite Fixes (ordered by impact/risk ratio)

These are the changes that make the visual rewrite substantially safer. Everything else can wait.

**1. Fix the autosave state assembly (`BootScene.ts:48–51`) — 2 hours**  
Wire `sectorManager.serialize()`, `strandingManager.serialize()`, and `logisticsManager.getRoutes()` into the `getState` callback. Test a save-reload cycle before touching anything visual.

**2. Add save migration (`SaveManager.ts`) — 3 hours**  
Add a `MIGRATIONS` table. Bump `FORMAT_VERSION` to 2. Write a v1→v2 migration that fills missing fields with defaults. Future schema changes get a migration entry, not a save wipe.

**3. Fix `StrandingManager` encapsulation (`SectorManager.ts:142`) — 30 min**  
Add `StrandingManager.setFuel(n: number)`. Remove both `as unknown` casts. Zero risk.

**4. Fix the `game:saved` event naming (`TechTree.ts:53`) — 30 min**  
Rename the TechTree emit to `'save:requested'`. Add it to `GameEvents`. Any autosave listener on `'game:saved'` that was reacting to TechTree's signal should be re-wired to `'save:requested'`.

**5. Decouple `HarvesterManager` and `DepositMap` from PixiJS — half day**  
Move `worldContainer.addChild/removeChild` calls into the scene layer. Services track state; scenes track visuals. Required before the renderer swap.

**6. Fix offline sim trip modulo bug (`OfflineSimulator.ts:63`) — 1 hour**  
Track elapsed seconds per route in the simulation loop. Remove the global `t % tripTimeSec` check.

**7. Unify sell prices — 1 hour**  
Remove `SELL_PRICES` from `OfflineSimulator.ts`. Import from the canonical data source.

**8. Add deltaMS clamping at top of game loop — 15 min**  
`const safeDelta = Math.min(delta, 0.1)` prevents tick-skipping after browser stalls. Apply across the loop.
