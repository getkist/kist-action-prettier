import { PrettierAction } from "./actions/PrettierAction/index.js";

export { PrettierAction } from "./actions/PrettierAction/index.js";
export type { PrettierActionOptions } from "./actions/PrettierAction/index.js";
export { Action } from "./types/Action.js";

/**
 * Plugin definition for kist
 */
export default {
    name: "@getkist/action-prettier",
    version: "1.0.0",
    actions: {
        PrettierAction: new PrettierAction(),
    },
};
