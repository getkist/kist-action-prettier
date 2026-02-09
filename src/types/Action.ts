/**
 * Base class for kist actions.
 * Provides common functionality for all action implementations.
 */
export abstract class Action<TOptions = Record<string, unknown>> {
    /**
     * The unique name of this action.
     */
    abstract readonly name: string;

    /**
     * Returns a human-readable description of what this action does.
     */
    abstract describe(): string;

    /**
     * Validates the provided options before execution.
     * @param options - The options to validate
     * @returns true if options are valid, false otherwise
     */
    abstract validateOptions(options: TOptions): boolean;

    /**
     * Executes the action with the provided options.
     * @param options - The options for this action
     * @returns A promise that resolves when the action completes
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
     * Logs a debug message.
     * @param message - The message to log
     */
    protected logDebug(message: string): void {
        if (process.env.DEBUG) {
            console.debug(`[${this.name}] DEBUG: ${message}`);
        }
    }
}

/**
 * Action options type - a generic record of key-value pairs
 */
export type ActionOptionsType = Record<string, unknown>;

/**
 * Plugin interface for kist action packages
 */
export interface ActionPlugin {
    /** Plugin name */
    name?: string;
    /** Plugin version */
    version: string;
    /** Plugin description */
    description?: string;
    /** Plugin author */
    author?: string;
    /** Repository URL */
    repository?: string;
    /** Keywords */
    keywords?: string[];
    /** Map of action names to action classes */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions?: Record<string, new () => Action<any>>;
    /** Register actions method */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerActions?: () => Record<string, new () => Action<any>>;
}
