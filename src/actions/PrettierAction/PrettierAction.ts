// ============================================================================
// Import
// ============================================================================

import { Action } from "../../types/Action.js";
import { promises as fs } from "fs";
import path from "path";
import * as prettier from "prettier";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the PrettierAction. Only `targetFiles` is required; all style
 * options are optional and, when omitted, fall back to whatever is resolved
 * from `configPath` (if provided) or Prettier's own built-in defaults.
 * Explicit style options here always take precedence over a resolved config
 * file, since they are merged on top of it in
 * {@link PrettierAction.buildPrettierOptions}.
 *
 * @example
 * ```yaml
 * steps:
 *   - action: PrettierAction
 *     options:
 *       targetFiles:
 *         - "src/index.ts"
 *         - "src/utils/helpers.ts"
 *       write: true
 *       singleQuote: true
 *       semi: false
 *       trailingComma: "all"
 * ```
 */
export interface PrettierActionOptions {
    /**
     * Files or glob patterns to format. Must be a non-empty array.
     * Note: only direct file paths are currently resolved — entries that
     * don't point at an existing file (including glob patterns and
     * directories) are skipped with a warning rather than expanded.
     */
    targetFiles: string[];

    /**
     * Whether to write formatted files back to disk. If false, files are
     * only checked for formatting and no files are modified; the action
     * then throws once all files have been processed if any of them need
     * formatting (default: true)
     */
    write?: boolean;

    /**
     * Path to a custom Prettier config file to resolve options from. Any
     * options resolved from this file are overridden by the explicit style
     * options below where both are set
     */
    configPath?: string;

    /**
     * Tab width for indentation (Prettier default: 2)
     */
    tabWidth?: number;

    /**
     * Use tabs instead of spaces for indentation (Prettier default: false)
     */
    useTabs?: boolean;

    /**
     * Print semicolons at the ends of statements (Prettier default: true)
     */
    semi?: boolean;

    /**
     * Use single quotes instead of double quotes (Prettier default: false)
     */
    singleQuote?: boolean;

    /**
     * Print trailing commas wherever possible (Prettier default: "all")
     */
    trailingComma?: "all" | "es5" | "none";

    /**
     * Print spaces between brackets in object literals (Prettier default: true)
     */
    bracketSpacing?: boolean;

    /**
     * Put the closing bracket of a multi-line element on a new line instead
     * of the same line as the last attribute (Prettier default: false)
     */
    bracketSameLine?: boolean;

    /**
     * Include parentheses around a sole arrow function parameter
     * (Prettier default: "always")
     */
    arrowParens?: "always" | "avoid";

    /**
     * Line width that the printer will wrap on (Prettier default: 80)
     */
    printWidth?: number;

    /**
     * How to handle whitespace in HTML, Vue, Angular, or JSX
     * (Prettier default: "css")
     */
    htmlWhitespaceSensitivity?: "css" | "strict" | "ignore";

    /**
     * End of line style (Prettier default: "lf")
     */
    endOfLine?: "lf" | "crlf" | "cr" | "auto";

    /**
     * Force a specific parser to use instead of the one inferred from the
     * file extension (default: auto-detected per file)
     */
    parser?: string;

    /**
     * Silently skip files whose type/parser cannot be inferred instead of
     * throwing an error for them (default: false)
     */
    ignoreUnknown?: boolean;
}

// ============================================================================
// Classes
// ============================================================================

/**
 * Action for formatting (or checking the formatting of) code files using
 * Prettier. Supports resolving style options from a Prettier config file,
 * overriding individual style options directly, and running in either
 * "write" mode (formats non-conforming files in place) or "check" mode
 * (leaves files untouched and fails if any file is not already formatted).
 */
export class PrettierAction extends Action<PrettierActionOptions> {
    /**
     * The name this action is registered and referenced by. A step's
     * `action: PrettierAction` in kist.yaml resolves through this value, and it
     * also prefixes the action's log output.
     */
    readonly name = "PrettierAction";

    /**
     * Returns a short, human-readable description of this action.
     *
     * @returns A one-line description of what this action does.
     */
    describe(): string {
        return "Format code files using Prettier";
    }

    /**
     * Validates the provided options before execution.
     *
     * @param options - The options to validate.
     * @returns true if options are valid; false otherwise. Validation
     * failures are logged via {@link Action.logError} rather than thrown,
     * so callers should check the return value.
     */
    validateOptions(options: PrettierActionOptions): boolean {
        if (!options.targetFiles || !Array.isArray(options.targetFiles) || options.targetFiles.length === 0) {
            this.logError("Invalid options: 'targetFiles' must be a non-empty array.");
            return false;
        }

        if (options.trailingComma && !["all", "es5", "none"].includes(options.trailingComma)) {
            this.logError("Invalid options: 'trailingComma' must be one of: all, es5, none");
            return false;
        }

        if (options.arrowParens && !["always", "avoid"].includes(options.arrowParens)) {
            this.logError("Invalid options: 'arrowParens' must be one of: always, avoid");
            return false;
        }

        if (options.htmlWhitespaceSensitivity && !["css", "strict", "ignore"].includes(options.htmlWhitespaceSensitivity)) {
            this.logError("Invalid options: 'htmlWhitespaceSensitivity' must be one of: css, strict, ignore");
            return false;
        }

        if (options.endOfLine && !["lf", "crlf", "cr", "auto"].includes(options.endOfLine)) {
            this.logError("Invalid options: 'endOfLine' must be one of: lf, crlf, cr, auto");
            return false;
        }

        return true;
    }

    /**
     * Executes Prettier formatting (or format-checking) against the
     * resolved set of target files.
     *
     * In write mode, non-conforming files are formatted and saved to disk.
     * In check mode, no files are modified.
     *
     * A file Prettier cannot process does not abort the run early: every
     * other file is still handled, the failures are reported together, and
     * only then does the step fail. It does fail, though — a file the step
     * was asked to format and left untouched is not a success, and merely
     * logging it let a build pass over unformatted code.
     *
     * @param options - The options for this run of the action.
     * @returns A promise that resolves once every matched file has been
     * processed successfully.
     * @throws {Error} If `options` fail validation, if any file could not be
     * processed, if check mode finds one or more files that need formatting,
     * or if building Prettier options or resolving the target files fails
     * unexpectedly.
     */
    async execute(options: PrettierActionOptions): Promise<void> {
        if (!this.validateOptions(options)) {
            throw new Error("Invalid options provided to PrettierAction");
        }

        const write = options.write ?? true;
        const mode = write ? "formatting" : "checking";
        this.logInfo(`${write ? "Formatting" : "Checking"} ${options.targetFiles.length} file pattern(s)`);

        try {
            // Build Prettier options
            const prettierOptions = await this.buildPrettierOptions(options);

            // Resolve files from patterns
            const files = await this.resolveFiles(options.targetFiles);
            
            if (files.length === 0) {
                this.logWarning("No files matched the provided patterns");
                return;
            }

            this.logInfo(`Found ${files.length} file(s) to ${mode === "formatting" ? "format" : "check"}`);

            let formattedCount = 0;
            let unchangedCount = 0;
            const errors: string[] = [];

            for (const file of files) {
                try {
                    const result = await this.processFile(file, prettierOptions, write, options.ignoreUnknown);
                    if (result === "formatted") {
                        formattedCount++;
                    } else if (result === "unchanged") {
                        unchangedCount++;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push(`${file}: ${errorMessage}`);
                }
            }

            // Per-file failures are reported before any pass/fail decision.
            // They used to be logged *after* the check-mode throw below, so a
            // run that both found unformatted files and failed to read others
            // never mentioned the second group at all.
            if (errors.length > 0) {
                this.logWarning(`${errors.length} file(s) had errors:`);
                errors.forEach(e => this.logError(e));
            }

            // Report results
            if (write) {
                this.logInfo(`Formatted ${formattedCount} file(s), ${unchangedCount} file(s) unchanged`);
            } else if (formattedCount === 0) {
                this.logInfo(`All ${unchangedCount} file(s) are properly formatted`);
            }

            // A file Prettier could not process is left unformatted, so the
            // step has not done what it was asked to. Logging and returning
            // let a build pass with files the formatter never touched.
            if (errors.length > 0) {
                throw new Error(
                    `${errors.length} file(s) could not be processed by Prettier`,
                );
            }

            if (!write && formattedCount > 0) {
                throw new Error(`${formattedCount} file(s) need formatting`);
            }

        } catch (error) {
            this.logError("Prettier formatting failed.", error);
            throw error;
        }
    }

    /**
     * Builds the effective Prettier options for this run by resolving
     * `configPath` (when set) and merging the action's explicit style
     * options on top of it, so explicit options always win over the
     * config file.
     *
     * @param options - The action options to derive Prettier options from.
     * @returns The merged Prettier options to use when formatting/checking
     * each file (before the per-file `parser`/`filepath` are added).
     */
    private async buildPrettierOptions(options: PrettierActionOptions): Promise<prettier.Options> {
        let configOptions: prettier.Options = {};

        // Load config file if specified.
        //
        // `resolveConfig(p)` searches upward for the config that applies *to*
        // `p`; handed the config file itself it returns null, so `configPath`
        // silently did nothing. Passing it as `config` is what reads the named
        // file instead of searching.
        if (options.configPath) {
            const resolvedConfig = await prettier.resolveConfig(options.configPath, {
                config: options.configPath,
            });
            if (resolvedConfig) {
                configOptions = resolvedConfig;
            }
        }

        // Build options from action configuration (these override config file)
        const actionOptions: prettier.Options = {};

        if (options.tabWidth !== undefined) actionOptions.tabWidth = options.tabWidth;
        if (options.useTabs !== undefined) actionOptions.useTabs = options.useTabs;
        if (options.semi !== undefined) actionOptions.semi = options.semi;
        if (options.singleQuote !== undefined) actionOptions.singleQuote = options.singleQuote;
        if (options.trailingComma !== undefined) actionOptions.trailingComma = options.trailingComma;
        if (options.bracketSpacing !== undefined) actionOptions.bracketSpacing = options.bracketSpacing;
        if (options.bracketSameLine !== undefined) actionOptions.bracketSameLine = options.bracketSameLine;
        if (options.arrowParens !== undefined) actionOptions.arrowParens = options.arrowParens;
        if (options.printWidth !== undefined) actionOptions.printWidth = options.printWidth;
        if (options.htmlWhitespaceSensitivity !== undefined) actionOptions.htmlWhitespaceSensitivity = options.htmlWhitespaceSensitivity;
        if (options.endOfLine !== undefined) actionOptions.endOfLine = options.endOfLine;
        if (options.parser !== undefined) actionOptions.parser = options.parser;

        return { ...configOptions, ...actionOptions };
    }

    /**
     * Resolves the configured `targetFiles` entries to absolute file paths.
     *
     * Only entries that point directly at an existing file are included;
     * directories are skipped with a warning (glob expansion is not
     * implemented in this simple resolver), and entries that don't match
     * any existing file are also skipped with a warning rather than
     * causing the run to fail.
     *
     * @param patterns - File paths (or glob-like strings) from `targetFiles`.
     * @returns The de-duplicated list of resolved, absolute file paths.
     */
    private async resolveFiles(patterns: string[]): Promise<string[]> {
        const files: string[] = [];

        for (const pattern of patterns) {
            // Check if it's a direct file path
            try {
                const stat = await fs.stat(pattern);
                if (stat.isFile()) {
                    files.push(path.resolve(pattern));
                } else if (stat.isDirectory()) {
                    // Skip directories in this simple implementation
                    this.logWarning(`Skipping directory: ${pattern} (use glob patterns for directories)`);
                }
            } catch {
                // File doesn't exist, might be a glob pattern
                // For simplicity, we'll just skip non-existent files
                this.logWarning(`File not found: ${pattern}`);
            }
        }

        return [...new Set(files)]; // Remove duplicates
    }

    /**
     * Formats or checks a single file with Prettier.
     *
     * The file's parser is inferred from its extension unless
     * `prettierOptions.parser` is already set. Files ignored via
     * `.prettierignore`, or whose parser can't be inferred and
     * `ignoreUnknown` is set, are skipped without being read/written.
     *
     * @param filePath - Absolute path of the file to process.
     * @param prettierOptions - The merged Prettier options to format/check
     * with (parser and filepath are added internally per file).
     * @param write - Whether to write formatted output back to disk. When
     * false, the file is left untouched even if it needs formatting, and
     * "formatted" is returned to indicate it needs formatting rather than
     * that it was actually rewritten.
     * @param ignoreUnknown - Whether to silently skip files whose parser
     * cannot be inferred instead of throwing for them.
     * @returns "unchanged" if the file is already formatted, "formatted"
     * if it was rewritten (write mode) or needs rewriting (check mode), or
     * "skipped" if the file was ignored via `.prettierignore` or has an
     * unrecognized type and `ignoreUnknown` is set.
     * @throws {Error} If the file's parser cannot be inferred and
     * `ignoreUnknown` is not set.
     */
    private async processFile(
        filePath: string,
        prettierOptions: prettier.Options,
        write: boolean,
        ignoreUnknown?: boolean
    ): Promise<"formatted" | "unchanged" | "skipped"> {
        const content = await fs.readFile(filePath, "utf8");

        // Get file info to determine parser
        const fileInfo = await prettier.getFileInfo(filePath, {
            ignorePath: ".prettierignore",
        });

        if (fileInfo.ignored) {
            this.logDebug(`Ignored: ${filePath}`);
            return "skipped";
        }

        if (fileInfo.inferredParser === null) {
            if (ignoreUnknown) {
                this.logDebug(`Unknown file type, skipping: ${filePath}`);
                return "skipped";
            }
            throw new Error(`Could not determine parser for: ${filePath}`);
        }

        // Merge parser into options
        const options: prettier.Options = {
            ...prettierOptions,
            parser: prettierOptions.parser || fileInfo.inferredParser,
            filepath: filePath,
        };

        // Check if file is already formatted
        const isFormatted = await prettier.check(content, options);

        if (isFormatted) {
            this.logDebug(`Already formatted: ${filePath}`);
            return "unchanged";
        }

        if (write) {
            // Format and write
            const formatted = await prettier.format(content, options);
            await fs.writeFile(filePath, formatted, "utf8");
            this.logInfo(`Formatted: ${filePath}`);
            return "formatted";
        } else {
            // Check mode - file needs formatting
            this.logInfo(`Needs formatting: ${filePath}`);
            return "formatted"; // Count as needing format
        }
    }
}
