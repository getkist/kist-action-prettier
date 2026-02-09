// ============================================================================
// Imports
// ============================================================================

import js from "@eslint/js";
import tseslint from "typescript-eslint";

// ============================================================================
// ESLint Configuration
// ============================================================================

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        ignores: [
            "**/*.min.js",
            "**/dist/**",
            "**/vendor/**",
            ".cache/**",
            "node_modules/**",
            "coverage/**",
            "bin/**",
            "public/**",
            "tmp/**",
            "**/tests/**",
        ],
    },

    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
                ecmaVersion: 2021,
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": "warn",
            "no-debugger": "warn",
        },
    },
];
