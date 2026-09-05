// ============================================================================
// Export
// ============================================================================

export { PrettierAction } from "./actions/PrettierAction/index.js";
export type { PrettierActionOptions } from "./actions/PrettierAction/index.js";
export { Action, ActionPlugin } from "./types/Action.js";
export type { ActionOptionsType } from "./types/Action.js";

// ============================================================================
// Plugin Definition
// ============================================================================

import { ActionPlugin } from "./types/Action.js";
import { PrettierAction } from "./actions/PrettierAction/index.js";

/**
 * Kist action plugin for Prettier code formatting.
 *
 * This is the package's default export and satisfies the {@link ActionPlugin}
 * interface, so the kist CLI can read its metadata and discover the actions
 * it registers (currently just {@link PrettierAction}) via
 * `registerActions()`.
 */
const plugin: ActionPlugin = {
    name: "@getkist/action-prettier",
    version: "1.0.31",
    description: "Prettier code formatting for kist",
    author: "kist",
    repository: "https://github.com/getkist/kist-action-prettier",
    keywords: ["kist", "kist-action", "prettier", "format"],
    registerActions() {
        return {
            PrettierAction,
        };
    },
};

export default plugin;
