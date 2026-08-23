import { readFileSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import fg from 'fast-glob';
import type { Token, TokenSet, AuditResult, AuditStats, TokenCategory } from './types.js';
import { categorizeToken } from './categorize.js';
import { findDuplicates } from './deduplicate.js';
import { findUnusedTokens } from './unused.js';

// ─── Token Extraction ────────────────────────────────────────────────────────

const VAR_DECL_REGEX = /([ \t]*)((?:--[\w-]+(?:\[[\w-']+\])?)+)\s*:\s*([^;]+);/gm;
const VAR_USE_REGEX = /var\((--[\w-]+)(?:,\s*([^)]+))?\)/g;
const CUSTOM_PROP_IN_AT_RULE = /@property\s+(--[\w-]+)\s*\{([^}]+)\}/gs;

export interface ExtractOptions {
  exclude?: string[];
  include?: string[];
  findUnused?: boolean;
}

export async function audit(
  paths: string[],
  options: ExtractOptions = {}
): Promise<AuditResult> {
  // Find all CSS files
  const cssFiles = await findCssFiles(paths, options.include ?? ['**/*.css']);

  if (cssFiles.length === 0) {
    throw new Error(`No CSS files found in: ${paths.join(', ')}`);
  }

  // Parse each file
  const allTokens: Token[] = [];
  const tokenSet: TokenSet = {};
  const allVarUsages = new Map<string, { file: string; line: number; context: string }[]>();

  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf-8');
    const fileTokens = parseFile(content, file, allVarUsages);
    allTokens.push(...fileTokens);

    for (const token of fileTokens) {
      if (!tokenSet[token.name]) {
        tokenSet[token.name] = { ...token, references: [] };
      }
      // Merge references
      const refs = allVarUsages.get(token.name) ?? [];
      tokenSet[token.name].references.push(...refs);
    }
  }

  // Remove duplicates from set (first definition wins)
  const dedupedSet: TokenSet = {};
  for (const token of allTokens) {
    if (!dedupedSet[token.name]) {
      dedupedSet[token.name] = {
        ...token,
        references: allVarUsages.get(token.name) ?? [],
      };
    }
  }

  // Find duplicate values
  const duplicates = findDuplicates(dedupedSet);

  // Find unused tokens
  const unused = options.findUnused
    ? findUnusedTokens(dedupedSet, allVarUsages)
    : [];

  // Build stats
  const stats = buildStats(dedupedSet, duplicates, unused, cssFiles.length);

  return {
    tokens: dedupedSet,
    duplicates,
    unused,
    stats,
    files: cssFiles,
  };
}

function parseFile(
  content: string,
  filePath: string,
  usageMap: Map<string, { file: string; line: number; context: string }[]>
): Token[] {
  const tokens: Token[] = [];
  const lines = content.split('\n');

  // Extract @property definitions
  let propMatch: RegExpExecArray | null;
  CUSTOM_PROP_IN_AT_RULE.lastIndex = 0;
  while ((propMatch = CUSTOM_PROP_IN_AT_RULE.exec(content)) !== null) {
    const name = propMatch[1];
    const body = propMatch[2];
    const valueMatch = /initial\s*:\s*([^;]+);/.exec(body);
    const value = valueMatch ? valueMatch[1].trim() : '';
    const line = content.substring(0, propMatch.index).split('\n').length;
    const category = categorizeToken(name, value);

    tokens.push({
      name,
      value,
      category,
      raw: `@property ${name} { ... }`,
      file: filePath,
      line,
      references: [],
    });
  }

  // Extract custom property declarations
  let match: RegExpExecArray | null;
  VAR_DECL_REGEX.lastIndex = 0;
  while ((match = VAR_DECL_REGEX.exec(content)) !== null) {
    const [full, indent, name, value] = match;
    const line = content.substring(0, match.index).split('\n').length;
    const category = categorizeToken(name, value.trim());
    const trimmedValue = value.trim();

    // Skip internal / debug tokens
    if (name.startsWith('--_')) continue;

    tokens.push({
      name,
      value: trimmedValue,
      category,
      raw: full.trim(),
      file: filePath,
      line,
      references: [],
    });
  }

  // Extract all var() usages (for unused detection)
  lines.forEach((line, idx) => {
    let useMatch: RegExpExecArray | null;
    VAR_USE_REGEX.lastIndex = 0;
    while ((useMatch = VAR_USE_REGEX.exec(line)) !== null) {
      const varName = useMatch[1];
      if (!usageMap.has(varName)) {
        usageMap.set(varName, []);
      }
      usageMap.get(varName)!.push({
        file: filePath,
        line: idx + 1,
        context: line.trim(),
      });
    }
  });

  return tokens;
}

async function findCssFiles(paths: string[], include: string[]): Promise<string[]> {
  const patterns: string[] = [];

  for (const path of paths) {
    const isDir = (() => {
      try { return statSync(path).isDirectory(); }
      catch { return false; }
    })();

    if (isDir) {
      patterns.push(...include.map(i => `${path}/${i}`));
    } else {
      patterns.push(path);
    }
  }

  // Use fast-glob for cross-platform globbing
  const files = await fg(patterns, {
    absolute: false,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  });

  return files.filter(f => f.endsWith('.css') || f.endsWith('.scss'));
}

function buildStats(
  tokens: TokenSet,
  duplicates: any[],
  unused: any[],
  filesScanned: number
): AuditStats {
  const byCategory: Record<TokenCategory, number> = {
    color: 0,
    spacing: 0,
    typography: 0,
    radius: 0,
    shadow: 0,
    transition: 0,
    motion: 0,
    layout: 0,
    'z-index': 0,
    other: 0,
  };

  for (const token of Object.values(tokens)) {
    byCategory[token.category]++;
  }

  return {
    totalTokens: Object.keys(tokens).length,
    byCategory,
    duplicateCount: duplicates.reduce((acc, g) => acc + g.tokens.length - 1, 0),
    unusedCount: unused.length,
    filesScanned,
  };
}

// ─── Named exports for testability ───────────────────────────────────────────

export { parseFile };
