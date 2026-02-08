import { PrettierAction } from "../../../src/actions/PrettierAction/PrettierAction.js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("PrettierAction", () => {
    let action: PrettierAction;
    let testDir: string;
    let testFile: string;

    beforeAll(async () => {
        // Create test fixtures directory in temp
        testDir = path.join(os.tmpdir(), `prettier-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        testFile = path.join(testDir, "test.ts");
    });

    beforeEach(async () => {
        action = new PrettierAction();
    });

    afterEach(async () => {
        // Clean up test file
        try {
            await fs.unlink(testFile);
        } catch { /* ignore */ }
    });

    afterAll(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true });
        } catch { /* ignore */ }
    });

    describe("name", () => {
        it("should return the action name", () => {
            expect(action.name).toBe("PrettierAction");
        });
    });

    describe("describe", () => {
        it("should return a description", () => {
            expect(action.describe()).toContain("Prettier");
        });
    });

    describe("validateOptions", () => {
        it("should return true for valid options", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
            });
            expect(result).toBe(true);
        });

        it("should return false when targetFiles is missing", () => {
            const result = action.validateOptions({
                targetFiles: [],
            });
            expect(result).toBe(false);
        });

        it("should return false when targetFiles is not an array", () => {
            const result = action.validateOptions({
                targetFiles: "src/**/*.ts" as unknown as string[],
            });
            expect(result).toBe(false);
        });

        it("should return false for invalid trailingComma", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
                trailingComma: "invalid" as "all",
            });
            expect(result).toBe(false);
        });

        it("should return false for invalid arrowParens", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
                arrowParens: "invalid" as "always",
            });
            expect(result).toBe(false);
        });

        it("should return false for invalid htmlWhitespaceSensitivity", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
                htmlWhitespaceSensitivity: "invalid" as "css",
            });
            expect(result).toBe(false);
        });

        it("should return false for invalid endOfLine", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
                endOfLine: "invalid" as "lf",
            });
            expect(result).toBe(false);
        });

        it("should return true for valid options with all params", () => {
            const result = action.validateOptions({
                targetFiles: ["src/**/*.ts"],
                write: true,
                tabWidth: 4,
                useTabs: false,
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                arrowParens: "always",
                htmlWhitespaceSensitivity: "css",
                endOfLine: "lf",
            });
            expect(result).toBe(true);
        });
    });

    describe("execute", () => {
        it("should format a TypeScript file", async () => {
            // Create unformatted TypeScript file
            const unformattedCode = `const   foo   =   {bar:"baz",qux:true};export default foo;`;
            await fs.writeFile(testFile, unformattedCode, "utf8");

            await action.execute({
                targetFiles: [testFile],
                write: true,
            });

            const result = await fs.readFile(testFile, "utf8");
            // Prettier should format the code
            expect(result).not.toBe(unformattedCode);
            expect(result).toContain("const foo");
        });

        it("should apply custom formatting options", async () => {
            const code = `const foo = { bar: "baz" };`;
            await fs.writeFile(testFile, code, "utf8");

            await action.execute({
                targetFiles: [testFile],
                write: true,
                singleQuote: true,
                tabWidth: 4,
            });

            const result = await fs.readFile(testFile, "utf8");
            expect(result).toContain("'baz'"); // single quotes
        });

        it("should throw error for invalid options", async () => {
            await expect(
                action.execute({
                    targetFiles: [],
                })
            ).rejects.toThrow("Invalid options");
        });

        it("should warn for non-existent files", async () => {
            // This should not throw, just warn
            await action.execute({
                targetFiles: ["/nonexistent/file.ts"],
                write: true,
            });
            // Test completes without error
        });

        it("should check formatting without writing in check mode", async () => {
            // Create properly formatted code
            const formattedCode = `const foo = { bar: "baz" };\n`;
            await fs.writeFile(testFile, formattedCode, "utf8");

            // Should not throw for properly formatted file
            await action.execute({
                targetFiles: [testFile],
                write: false,
            });

            // File should remain unchanged
            const result = await fs.readFile(testFile, "utf8");
            expect(result).toBe(formattedCode);
        });

        it("should throw in check mode for unformatted files", async () => {
            // Create unformatted code
            const unformattedCode = `const   foo   =   {bar:"baz"};`;
            await fs.writeFile(testFile, unformattedCode, "utf8");

            await expect(
                action.execute({
                    targetFiles: [testFile],
                    write: false,
                })
            ).rejects.toThrow("need formatting");
        });
    });
});
