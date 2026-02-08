# @getkist/action-prettier

Prettier code formatting action for [kist](https://github.com/getkist/kist) build tool.

[![npm version](https://img.shields.io/npm/v/@getkist/action-prettier.svg)](https://www.npmjs.com/package/@getkist/action-prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Prettier Integration** - Format code files as part of your kist build pipeline
- **Check Mode** - Validate formatting without modifying files
- **Full Configuration** - Support for all Prettier options
- **Multiple File Types** - Format JS, TS, CSS, HTML, JSON, Markdown, and more

## Installation

```bash
npm install --save-dev @getkist/action-prettier
```

## Usage

### Basic Formatting

Add to your `kist.yml`:

```yaml
pipeline:
    stages:
        - name: format
          steps:
              - name: format-code
                action: PrettierAction
                options:
                    targetFiles:
                        - "src/**/*.ts"
                        - "src/**/*.tsx"
                    write: true
```

### Check Mode (CI)

```yaml
pipeline:
    stages:
        - name: lint
          steps:
              - name: check-formatting
                action: PrettierAction
                options:
                    targetFiles:
                        - "src/**/*.ts"
                    write: false
```

### Custom Configuration

```yaml
pipeline:
    stages:
        - name: format
          steps:
              - name: format-with-options
                action: PrettierAction
                options:
                    targetFiles:
                        - "src/**/*.ts"
                    write: true
                    tabWidth: 4
                    singleQuote: true
                    trailingComma: all
                    printWidth: 100
```

## Action: PrettierAction

Formats code files using Prettier.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targetFiles` | string[] | **required** | Files or glob patterns to format |
| `write` | boolean | true | Write formatted files (false = check mode) |
| `configPath` | string | - | Path to Prettier config file |
| `tabWidth` | number | 2 | Tab width for indentation |
| `useTabs` | boolean | false | Use tabs instead of spaces |
| `semi` | boolean | true | Print semicolons |
| `singleQuote` | boolean | false | Use single quotes |
| `trailingComma` | "all" \| "es5" \| "none" | "es5" | Trailing comma style |
| `bracketSpacing` | boolean | true | Spaces in object literals |
| `bracketSameLine` | boolean | false | Closing bracket on same line |
| `arrowParens` | "always" \| "avoid" | "always" | Arrow function parentheses |
| `printWidth` | number | 80 | Line width for wrapping |
| `htmlWhitespaceSensitivity` | "css" \| "strict" \| "ignore" | "css" | HTML whitespace handling |
| `endOfLine` | "lf" \| "crlf" \| "cr" \| "auto" | "lf" | End of line style |
| `parser` | string | - | Force parser (auto-detected by default) |
| `ignoreUnknown` | boolean | false | Ignore files matching .prettierignore |

## Requirements

- Node.js >= 20.0.0
- kist >= 0.1.58

## License

MIT