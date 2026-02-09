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

const plugin: ActionPlugin = {
    version: "1.0.0",
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
