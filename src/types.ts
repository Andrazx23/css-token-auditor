// ─── Core Types ─────────────────────────────────────────────────────────────

export type TokenCategory =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'radius'
  | 'shadow'
  | 'transition'
  | 'motion'
  | 'layout'
  | 'z-index'
  | 'other';

export interface Token {
  name: string;       // e.g. "color-background-primary"
  value: string;      // e.g. "#0a0a0a"
  category: TokenCategory;
  raw: string;        // full CSS declaration line
  file: string;       // relative path
  line: number;
  references: TokenReference[]; // where it's used in CSS
}

export interface TokenReference {
  file: string;
  line: number;
  context: string; // surrounding CSS for context
}

export interface TokenSet {
  [name: string]: Token;
}

export interface AuditResult {
  tokens: TokenSet;
  duplicates: DuplicateGroup[];
  unused: UnusedToken[];
  stats: AuditStats;
  files: string[];
}

export interface DuplicateGroup {
  value: string;
  tokens: Array<{ name: string; file: string; line: number }>;
  suggestedAlias?: string;
}

export interface UnusedToken {
  name: string;
  file: string;
  line: number;
  value: string;
}

export interface AuditStats {
  totalTokens: number;
  byCategory: Record<TokenCategory, number>;
  duplicateCount: number;
  unusedCount: number;
  filesScanned: number;
}

// ─── Export Types ────────────────────────────────────────────────────────────

export type ExportFormat = 'json' | 'css' | 'ts' | 'md';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  sortBy?: 'category' | 'name' | 'value';
}

// ─── CLI Types ───────────────────────────────────────────────────────────────

export interface CliOptions {
  paths: string[];
  output?: string;
  format?: ExportFormat | ExportFormat[];
  findUnused?: boolean;
  strict?: boolean;
  exclude?: string[];
  config?: string;
  verbose?: boolean;
  json?: boolean; // raw JSON output for piping
}

// ─── Config Types ────────────────────────────────────────────────────────────

export interface ConfigFile {
  exclude?: string[];
  include?: string[];
  findUnused?: boolean;
  strict?: boolean;
  output?: string;
  format?: ExportFormat | ExportFormat[];
}
