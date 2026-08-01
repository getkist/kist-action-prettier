// ============================================================================
// Classes
// ============================================================================

/**
 * Base class for kist actions. Provides common functionality (structured
 * logging keyed to the action's `name`) for all action implementations, and
 * defines the contract every action must fulfill: a unique `name`, a
 * human-readable `describe()`, option validation, and execution.
 *
 * @template TOptions - The shape of the options object this action accepts.
 * Defaults to a loose `Record<string, unknown>`; concrete actions should
 * supply their own options interface (see, e.g., `PrettierActionOptions`).
 */
export abstract class Action<TOptions = Record<string, unknown>> {
    /**
     * The unique name of this action, used to key it in
     * `ActionPlugin.registerActions()` and to prefix its log output.
     */
    abstract readonly name: string;

    /**
     * Returns a human-readable description of what this action does.
     *
     * @returns A short, one-line description suitable for display in logs
     * or documentation.
     */
    abstract describe(): string;

    /**
     * Validates the provided options before execution. Implementations
     * should report the reason for a failed validation (typically via
     * {@link Action.logError}) rather than throwing, so callers can decide
     * how to react to an invalid configuration.
     * @param options - The options to validate
     * @returns true if options are valid, false otherwise
     */
    abstract validateOptions(options: TOptions): boolean;

    /**
     * Executes the action with the provided options. Implementations are
     * expected to validate `options` (typically via
     * {@link Action.validateOptions}) before doing any work, and to throw
     * if execution cannot complete successfully.
     * @param options - The options for this action
     * @returns A promise that resolves when the action completes
     * @throws {Error} If the options are invalid or execution otherwise fails.
     */
    abstract execute(options: TOptions): Promise<void>;

    /**
     * Logs an informational message.
     * @param message - The message to log
     */
    protected logInfo(message: string): void {
        console.log(`[${this.name}] ${message}`);
    }

    /**
     * Logs a warning message.
     * @param message - The message to log
     */
    protected logWarning(message: string): void {
        console.warn(`[${this.name}] WARNING: ${message}`);
    }

    /**
     * Logs an error message.
     * @param message - The message to log
     * @param error - Optional error object
     */
    protected logError(message: string, error?: unknown): void {
        console.error(`[${this.name}] ERROR: ${message}`, error || "");
    }

    /**
     * Logs a debug message. Only emitted when the `DEBUG` environment
     * variable is set (to any truthy value); otherwise this is a no-op, so
     * it's safe to call freely in hot paths without polluting normal output.
     * @param message - The message to log
     */
    protected logDebug(message: string): void {
        if (process.env.DEBUG) {
            console.debug(`[${this.name}] DEBUG: ${message}`);
        }
    }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Action options type - a generic record of key-value pairs. Serves as the
 * default type parameter for {@link Action} and as a loose base for
 * per-action options interfaces that don't need a stricter shape.
 */
export type ActionOptionsType = Record<string, unknown>;

/**
 * Plugin interface for kist action packages. A package's default export
 * (see `src/index.ts`) should satisfy this interface so the kist CLI can
 * discover its metadata and the actions it registers.
 */
export interface ActionPlugin {
    /** Plugin package name (e.g. the npm package name) */
    name?: string;
    /** Plugin version, expected to follow semantic versioning */
    version: string;
    /** Short human-readable description of what the plugin provides */
    description?: string;
    /** Plugin author name or organization */
    author?: string;
    /** URL of the plugin's source repository */
    repository?: string;
    /** Keywords for discoverability (e.g. on npm) */
    keywords?: string[];
    /**
     * Static map of action names to action class constructors. Prefer
     * `registerActions()` for plugins that need to construct this map
     * dynamically; if both are present, callers should treat
     * `registerActions()` as authoritative.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions?: Record<string, new () => Action<any>>;
    /**
     * Factory that returns the map of action names to action class
     * constructors registered by this plugin. Called by the kist CLI to
     * discover which actions the plugin provides.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerActions?: () => Record<string, new () => Action<any>>;
}
