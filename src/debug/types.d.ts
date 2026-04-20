import type { VoidYieldDebugAPI } from './VoidYieldDebugAPI';

declare global {
  interface Window {
    __voidyield__: VoidYieldDebugAPI;
  }
}
