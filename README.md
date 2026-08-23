# CSS Design Token Auditor

A CLI tool that audits existing CSS files and extracts all design tokens in use — colors, spacing, typography, radii, shadows, transitions — then generates a consolidated token report and exports to JSON, CSS custom properties, or TypeScript types.

**Why this is useful:** Design tokens drift over time. Teams accumulate `--color-gray-100` through `--color-gray-900` with no single source of truth. This tool snapshots what's actually in your CSS, surfaces duplicates and inconsistencies, and generates a clean token sheet for documentation or downstream tooling.

---

## Features

- Extract all CSS custom properties (variables) from any `.css` / `.scss` / `.less` file
- Categorize tokens: `color`, `spacing`, `typography`, `radius`, `shadow`, `transition`, `motion`, `layout`, `z-index`, `other`
- Detect duplicate values and suggest aliases
- Find unused tokens (tokens defined but never referenced in the codebase)
- Generate exports:
  - `json` — raw token map
  - `css` — `:root { --token: value; }` block
  - `ts` — TypeScript `const tokens = {} as const`
  - `md` — Markdown documentation table
- CI-friendly exit codes
- Config file support (`css-audit.config.json`)

---

## Quick Start

```bash
# Install globally
npm install -g css-audit

# Audit a directory
css-audit ./src/styles --output ./tokens.json

# Export to multiple formats
css-audit ./src --format css,ts,md --output ./design-tokens/

# Find unused tokens
css-audit ./src --find-unused

# CI mode (exit 1 if tokens are inconsistent)
css-audit ./src --strict
```

---

## Architecture

```
src/
  cli.ts          # Commander.js CLI entry point
  audit.ts        # Core audit logic: parse, extract, categorize
  categorize.ts   # Heuristics for token category classification
  deduplicate.ts  # Find duplicate values and suggest aliases
  unused.ts       # Find defined-but-unreferenced tokens
  export-json.ts  # JSON export
  export-css.ts   # CSS custom properties export
  export-ts.ts    # TypeScript types export
  export-md.ts    # Markdown table export
  config.ts       # Config file loading
  utils.ts        # Shared utilities (color parsing, slugify, etc.)
  types.ts        # Shared TypeScript types
test/
  audit.test.ts   # Unit tests for audit logic
  fixtures/       # Sample CSS files for testing
```

---

## Token Categories

| Category     | Regex / Heuristic                                           |
|--------------|-------------------------------------------------------------|
| `color`      | `--color-*`, `--bg-*`, `--text-*`, `--border-*`, `--fill-*` |
| `spacing`    | `--space-*`, `--gap-*`, `--inset-*`, px/rem values          |
| `typography` | `--font-*`, `--text-*, `--leading-*`, `--tracking-*`        |
| `radius`     | `--radius-*`, `--rounded-*`                                 |
| `shadow`     | `--shadow-*`                                                 |
| `transition` | `--transition-*`, `--duration-*`, `--ease-*`               |
| `motion`     | `--ease-*, --duration-*, spring/bezier values               |
| `layout`     | `--container-*, --max-w-*`, container query values          |
| `z-index`    | `--z-*`                                                      |
| `other`      | anything else                                               |

---

## Exit Codes

| Code | Meaning                              |
|------|--------------------------------------|
| `0`  | Audit passed (tokens consistent)     |
| `1`  | `strict` mode: inconsistencies found |
| `2`  | File/folder not found                |
| `3`  | Config error                         |

---

## Config File

Create `css-audit.config.json` in your project root:

```json
{
  "exclude": ["node_modules", "dist", ".git"],
  "include": ["src/**/*.css"],
  "findUnused": true,
  "strict": false,
  "output": "./design-tokens.json",
  "format": ["json"]
}
```

---

## License

MIT
