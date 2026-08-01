// ============================================================================
// Export
// ============================================================================

/**
 * Barrel re-export for the PrettierAction module, so consumers can import
 * both the runtime class and its options type from
 * `./actions/PrettierAction/index.js` without reaching into
 * `PrettierAction.ts` directly.
 */
export { PrettierAction } from "./PrettierAction.js";
export type { PrettierActionOptions } from "./PrettierAction.js";
