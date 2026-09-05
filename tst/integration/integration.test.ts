import fs from "fs/promises";
import path from "path";

import { PrettierAction } from "../../src/actions/PrettierAction/PrettierAction.js";

/**
 * Runs Prettier for real over files on disk. Prettier resolves configuration
 * and ignore files relative to the file being formatted, so the fixtures live
 * under the repository rather than in the system temp directory.
 */
describe("PrettierAction integration", () => {
    const tmpDir = path.join(process.cwd(), "tst", "integration", `.tmp-${Date.now()}`);
    const UNFORMATTED = "const   x={a:1,b:2}\n";
    const FORMATTED = "const x = { a: 1, b: 2 };\n";

    beforeAll(async () => {
        await fs.mkdir(tmpDir, { recursive: true });
    });

    afterAll(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("rewrites a file in place when write is enabled", async () => {
        const file = path.join(tmpDir, "write.js");
        await fs.writeFile(file, UNFORMATTED, "utf8");

        await new PrettierAction().execute({ targetFiles: [file], write: true });

        await expect(fs.readFile(file, "utf8")).resolves.toBe(FORMATTED);
    });

    it("leaves the file untouched in check mode", async () => {
        const file = path.join(tmpDir, "check.js");
        await fs.writeFile(file, UNFORMATTED, "utf8");

        await expect(
            new PrettierAction().execute({ targetFiles: [file], write: false }),
        ).rejects.toThrow(/need formatting/);

        await expect(fs.readFile(file, "utf8")).resolves.toBe(UNFORMATTED);
    });

    it("resolves in check mode when every file is already formatted", async () => {
        const file = path.join(tmpDir, "clean.js");
        await fs.writeFile(file, FORMATTED, "utf8");

        await expect(
            new PrettierAction().execute({ targetFiles: [file], write: false }),
        ).resolves.toBeUndefined();
    });

    it("applies explicit formatting options over Prettier's defaults", async () => {
        const file = path.join(tmpDir, "options.js");
        await fs.writeFile(file, UNFORMATTED, "utf8");

        await new PrettierAction().execute({
            targetFiles: [file],
            write: true,
            semi: false,
            singleQuote: true,
            tabWidth: 4,
        });

        const out = await fs.readFile(file, "utf8");
        expect(out.trimEnd().endsWith(";")).toBe(false);
    });

    it("formats every file it is given", async () => {
        const a = path.join(tmpDir, "multi-a.js");
        const b = path.join(tmpDir, "multi-b.js");
        await fs.writeFile(a, UNFORMATTED, "utf8");
        await fs.writeFile(b, UNFORMATTED, "utf8");

        await new PrettierAction().execute({ targetFiles: [a, b], write: true });

        await expect(fs.readFile(a, "utf8")).resolves.toBe(FORMATTED);
        await expect(fs.readFile(b, "utf8")).resolves.toBe(FORMATTED);
    });

    it("warns and skips a target that is a directory", async () => {
        const dir = path.join(tmpDir, "a-directory");
        await fs.mkdir(dir, { recursive: true });

        // Resolving no files at all is not an error; the run reports zero.
        await expect(
            new PrettierAction().execute({ targetFiles: [dir], write: true }),
        ).resolves.toBeUndefined();
    });

    it("warns and skips a target that does not exist", async () => {
        await expect(
            new PrettierAction().execute({
                targetFiles: [path.join(tmpDir, "no-such-file.js")],
                write: true,
            }),
        ).resolves.toBeUndefined();
    });

    // A file the run cannot parse is collected as a per-file error, reported
    // at the end, and fails the step: it was asked to format that file and
    // did not. `ignoreUnknown` is the way to opt out (see the next test).
    it("fails for a file type Prettier has no parser for", async () => {
        const file = path.join(tmpDir, "mystery.zzz");
        const original = "whatever\n";
        await fs.writeFile(file, original, "utf8");

        await expect(
            new PrettierAction().execute({ targetFiles: [file], write: true }),
        ).rejects.toThrow(/could not be processed/);

        await expect(fs.readFile(file, "utf8")).resolves.toBe(original);
    });

    it("skips an unparseable file when ignoreUnknown is set", async () => {
        const file = path.join(tmpDir, "mystery2.zzz");
        await fs.writeFile(file, "whatever\n", "utf8");

        await expect(
            new PrettierAction().execute({
                targetFiles: [file],
                write: true,
                ignoreUnknown: true,
            }),
        ).resolves.toBeUndefined();
    });

    it("takes style settings from a config file when one is named", async () => {
        const configPath = path.join(tmpDir, ".prettierrc.json");
        await fs.writeFile(configPath, JSON.stringify({ semi: false }), "utf8");
        const file = path.join(tmpDir, "configured.js");
        await fs.writeFile(file, UNFORMATTED, "utf8");

        await new PrettierAction().execute({
            targetFiles: [file],
            write: true,
            configPath,
        });

        const out = await fs.readFile(file, "utf8");
        expect(out.trimEnd().endsWith(";")).toBe(false);
    });

    it("lets explicit options win over the config file", async () => {
        const configPath = path.join(tmpDir, ".prettierrc.json");
        await fs.writeFile(configPath, JSON.stringify({ semi: false }), "utf8");
        const file = path.join(tmpDir, "override.js");
        await fs.writeFile(file, UNFORMATTED, "utf8");

        await new PrettierAction().execute({
            targetFiles: [file],
            write: true,
            configPath,
            semi: true,
        });

        const out = await fs.readFile(file, "utf8");
        expect(out.trimEnd().endsWith(";")).toBe(true);
    });

    it("processes every file before failing on the ones that errored", async () => {
        const good = path.join(tmpDir, "good.js");
        const bad = path.join(tmpDir, "bad.js");
        await fs.writeFile(good, UNFORMATTED, "utf8");
        // Syntactically invalid: Prettier cannot parse it.
        await fs.writeFile(bad, "const = = ;\n", "utf8");

        // One unreadable file does not abort the others...
        await expect(
            new PrettierAction().execute({
                targetFiles: [good, bad],
                write: true,
            }),
        ).rejects.toThrow(/1 file\(s\) could not be processed/);

        // ...but the run still fails, because a file it was asked to format
        // was left untouched.
        await expect(fs.readFile(good, "utf8")).resolves.toBe(FORMATTED);
    });

    it("rejects before doing any work when the options are invalid", async () => {
        await expect(
            new PrettierAction().execute({ targetFiles: [] }),
        ).rejects.toThrow();
    });
});
