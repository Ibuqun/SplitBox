import type { SplitGroup } from '@/types';

export type SplitMode = 'items_per_group' | 'max_chars_per_group' | 'target_group_count';
export type InputDelimiter = 'newline' | 'comma' | 'tab' | 'auto';
export type ValidationMode = 'none' | 'alphanumeric' | 'email' | 'custom_regex';
export type DedupeMode = 'none' | 'case_sensitive' | 'case_insensitive';

export interface SplitConfig {
  mode: SplitMode;
  value: number;
  delimiter: InputDelimiter;
}

export interface PrepareItemsConfig {
  delimiter: InputDelimiter;
  dedupeMode?: DedupeMode;
  dedupe?: boolean;
  validationMode: ValidationMode;
  customValidationPattern?: string;
}

export interface PrepareItemsStats {
  rawTokenCount: number;
  emptyRemoved: number;
  invalidRemoved: number;
  duplicatesRemoved: number;
  invalidExamples: string[];
}

export interface PrepareItemsResult {
  items: string[];
  stats: PrepareItemsStats;
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function getTokenSplitter(delimiter: InputDelimiter, rawInput: string): RegExp {
  if (delimiter === 'auto') {
    if (!rawInput.includes('\n') && !rawInput.includes('\t') && !rawInput.includes(',')) {
      return /\r?\n/;
    }
    return /(?:\r?\n|,|\t)/;
  }

  if (delimiter === 'newline') {
    return /\r?\n/;
  }

  if (delimiter === 'comma') {
    return /(?:\r?\n|,)/;
  }

  return /(?:\r?\n|\t)/;
}

function getValidationPattern(validationMode: ValidationMode, customPattern?: string): RegExp | null {
  if (validationMode === 'none') return null;
  if (validationMode === 'alphanumeric') return /^[A-Za-z0-9_-]+$/;
  if (validationMode === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!customPattern || customPattern.trim().length === 0) {
    throw new Error('customValidationPattern is required for custom_regex mode');
  }

  try {
    return new RegExp(customPattern);
  } catch {
    throw new Error('customValidationPattern is not a valid regular expression');
  }
}

function resolveDedupeMode(config: PrepareItemsConfig): DedupeMode {
  if (config.dedupeMode) return config.dedupeMode;
  return config.dedupe ? 'case_sensitive' : 'none';
}

export function parseItems(rawInput: string, delimiter: InputDelimiter): string[] {
  const splitter = getTokenSplitter(delimiter, rawInput);

  return rawInput
    .split(splitter)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function prepareItems(rawInput: string, config: PrepareItemsConfig): PrepareItemsResult {
  const splitter = getTokenSplitter(config.delimiter, rawInput);

  const rawTokens = rawInput.split(splitter);
  const trimmed = rawTokens.map(token => token.trim());
  const nonEmptyTokens = trimmed.filter(token => token.length > 0);

  const validationPattern = getValidationPattern(config.validationMode, config.customValidationPattern);
  const invalidExamples: string[] = [];
  const validTokens: string[] = [];

  for (const token of nonEmptyTokens) {
    const isValid = validationPattern ? validationPattern.test(token) : true;
    if (!isValid) {
      if (invalidExamples.length < 5) {
        invalidExamples.push(token);
      }
      continue;
    }
    validTokens.push(token);
  }

  let dedupedTokens = validTokens;
  let duplicatesRemoved = 0;

  const dedupeMode = resolveDedupeMode(config);
  if (dedupeMode !== 'none') {
    const seen = new Set<string>();
    dedupedTokens = [];
    for (const token of validTokens) {
      const dedupeKey = dedupeMode === 'case_insensitive' ? token.toLowerCase() : token;
      if (seen.has(dedupeKey)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(dedupeKey);
      dedupedTokens.push(token);
    }
  }

  return {
    items: dedupedTokens,
    stats: {
      rawTokenCount: rawTokens.length,
      emptyRemoved: rawTokens.length - nonEmptyTokens.length,
      invalidRemoved: nonEmptyTokens.length - validTokens.length,
      duplicatesRemoved,
      invalidExamples,
    },
  };
}

function buildGroups(chunks: string[][]): SplitGroup[] {
  return chunks.map((chunk, index) => ({
    index,
    items: chunk,
    label: `Batch ${index + 1} (${chunk.length} items)`,
  }));
}

function splitByItemsPerGroup(items: string[], perGroup: number): SplitGroup[] {
  const chunks: string[][] = [];
  for (let i = 0; i < items.length; i += perGroup) {
    chunks.push(items.slice(i, i + perGroup));
  }
  return buildGroups(chunks);
}

function splitByTargetGroupCount(items: string[], targetGroupCount: number): SplitGroup[] {
  if (items.length === 0) return [];

  const actualGroupCount = Math.min(targetGroupCount, items.length);
  const baseSize = Math.floor(items.length / actualGroupCount);
  const remainder = items.length % actualGroupCount;
  const chunks: string[][] = [];

  let cursor = 0;
  for (let i = 0; i < actualGroupCount; i += 1) {
    const size = baseSize + (i < remainder ? 1 : 0);
    chunks.push(items.slice(cursor, cursor + size));
    cursor += size;
  }

  return buildGroups(chunks);
}

function splitByMaxCharsPerGroup(items: string[], maxCharsPerGroup: number): SplitGroup[] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const item of items) {
    const itemLength = item.length;
    const separatorLength = currentChunk.length > 0 ? 1 : 0;
    const nextLength = currentLength + separatorLength + itemLength;

    if (currentChunk.length > 0 && nextLength > maxCharsPerGroup) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentLength = itemLength;
      continue;
    }

    currentChunk.push(item);
    currentLength = currentChunk.length === 1 ? itemLength : nextLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return buildGroups(chunks);
}

export function splitPreparedItems(items: string[], mode: SplitMode, value: number): SplitGroup[] {
  assertPositiveInteger(value, 'value');

  if (mode === 'items_per_group') {
    return splitByItemsPerGroup(items, value);
  }

  if (mode === 'target_group_count') {
    return splitByTargetGroupCount(items, value);
  }

  return splitByMaxCharsPerGroup(items, value);
}

export function splitItems(rawInput: string, config: SplitConfig): SplitGroup[] {
  const prepared = prepareItems(rawInput, {
    delimiter: config.delimiter,
    dedupeMode: 'none',
    validationMode: 'none',
  });

  return splitPreparedItems(prepared.items, config.mode, config.value);
}
