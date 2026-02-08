import { Action } from "../../types/Action.js";
import { promises as fs } from "fs";
import path from "path";
import * as prettier from "prettier";

/**
 * Options for the PrettierAction
 */
export interface PrettierActionOptions {
    /**
     * Files or glob patterns to format
     */
    targetFiles: string[];

    /**
     * Whether to write formatted files back to disk.
     * If false, only checks formatting without modifying files.
     */
    write?: boolean;

    /**
     * Path to a custom Prettier config file
     */
    configPath?: string;

    /**
     * Tab width for indentation
     */
    tabWidth?: number;

    /**
     * Use tabs instead of spaces
     */
    useTabs?: boolean;

    /**
     * Print semicolons at the ends of statements
     */
    semi?: boolean;

    /**
     * Use single quotes instead of double quotes
     */
    singleQuote?: boolean;

    /**
     * Print trailing commas wherever possible
     */
    trailingComma?: "all" | "es5" | "none";

    /**
     * Print spaces between brackets in object literals
     */
    bracketSpacing?: boolean;

    /**
     * Put the closing bracket of a multi-line element on a new line
     */
    bracketSameLine?: boolean;

    /**
     * Include parentheses around a sole arrow function parameter
     */
    arrowParens?: "always" | "avoid";

    /**
     * Line width that the printer will wrap on
     */
    printWidth?: number;

    /**
     * How to handle whitespace in HTML, Vue, Angular, or JSX
     */
    htmlWhitespaceSensitivity?: "css" | "strict" | "ignore";

    /**
     * End of line style
     */
    endOfLine?: "lf" | "crlf" | "cr" | "auto";

    /**
     * Force parser to use (auto-detected by default)
     */
    parser?: string;

    /**
     * Ignore files matching patterns in .prettierignore
     */
    ignoreUnknown?: boolean;
}

/**
 * Action for formatting code files using Prettier.
 */
export class PrettierAction extends Action<PrettierActionOptions> {
    readonly name = "PrettierAction";

    describe(): string {
        return "Format code files using Prettier";
    }

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

            // Report results
            if (write) {
                this.logInfo(`Formatted ${formattedCount} file(s), ${unchangedCount} file(s) unchanged`);
            } else {
                if (formattedCount > 0) {
                    throw new Error(`${formattedCount} file(s) need formatting`);
                }
                this.logInfo(`All ${unchangedCount} file(s) are properly formatted`);
            }

            if (errors.length > 0) {
                this.logWarning(`${errors.length} file(s) had errors:`);
                errors.forEach(e => this.logError(e));
            }

        } catch (error) {
            this.logError("Prettier formatting failed.", error);
            throw error;
        }
    }

    /**
     * Build Prettier options from action options and config file
     */
    private async buildPrettierOptions(options: PrettierActionOptions): Promise<prettier.Options> {
        let configOptions: prettier.Options = {};

        // Load config file if specified
        if (options.configPath) {
            const resolvedConfig = await prettier.resolveConfig(options.configPath);
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
     * Resolve file patterns to actual file paths
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
     * Process a single file with Prettier
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
