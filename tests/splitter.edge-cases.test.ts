// Regression: edge cases found during QA on 2026-04-29
// Report: .gstack/qa-reports/
import { describe, expect, it } from 'vitest';
import { parseItems, prepareItems, splitItems } from '../src/utils/splitter';

describe('parseItems — auto delimiter edge cases', () => {
  it('returns single item when input has no delimiters', () => {
    // Regression: auto fallback to /\r?\n/ when no delimiter present means whole string is one token
    expect(parseItems('noseparator', 'auto')).toEqual(['noseparator']);
  });

  it('auto splits on comma when no newline or tab present', () => {
    expect(parseItems('a,b,c', 'auto')).toEqual(['a', 'b', 'c']);
  });

  it('auto splits on tab when no newline present', () => {
    expect(parseItems('a\tb\tc', 'auto')).toEqual(['a', 'b', 'c']);
  });
});

describe('prepareItems — custom_regex security guards', () => {
  it('throws when custom_regex pattern is empty string', () => {
    expect(() =>
      prepareItems('test', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: '',
      }),
    ).toThrow('customValidationPattern is required for custom_regex mode');
  });

  it('throws when custom_regex pattern is whitespace only', () => {
    expect(() =>
      prepareItems('test', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: '   ',
      }),
    ).toThrow('customValidationPattern is required for custom_regex mode');
  });

  it('throws when custom_regex pattern exceeds 500 characters', () => {
    const longPattern = 'a'.repeat(501);
    expect(() =>
      prepareItems('test', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: longPattern,
      }),
    ).toThrow('customValidationPattern must be 500 characters or fewer');
  });

  it('accepts custom_regex pattern of exactly 500 characters', () => {
    const maxPattern = 'a'.repeat(500);
    expect(() =>
      prepareItems('aaa', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: maxPattern,
      }),
    ).not.toThrow();
  });

  it('throws on nested quantifier (a+)+ to prevent ReDoS', () => {
    expect(() =>
      prepareItems('test', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: '(a+)+',
      }),
    ).toThrow('customValidationPattern contains nested quantifiers');
  });

  it('throws on nested quantifier (a*)* to prevent ReDoS', () => {
    expect(() =>
      prepareItems('test', {
        delimiter: 'newline',
        dedupeMode: 'none',
        validationMode: 'custom_regex',
        customValidationPattern: '(a*)*',
      }),
    ).toThrow('customValidationPattern contains nested quantifiers');
  });
});

describe('prepareItems — dedupeMode new API', () => {
  it('case_sensitive dedupe keeps different cases as distinct', () => {
    const result = prepareItems('apple\nApple\napple', {
      delimiter: 'newline',
      dedupeMode: 'case_sensitive',
      validationMode: 'none',
    });
    expect(result.items).toEqual(['apple', 'Apple']);
    expect(result.stats.duplicatesRemoved).toBe(1);
  });
});

describe('splitItems — target_group_count edge cases', () => {
  it('caps group count at item count when target exceeds items', () => {
    // 3 items, target 10 groups → 3 groups (one per item)
    const result = splitItems('a\nb\nc', {
      mode: 'target_group_count',
      delimiter: 'newline',
      value: 10,
    });
    expect(result).toHaveLength(3);
    expect(result[0].items).toEqual(['a']);
    expect(result[1].items).toEqual(['b']);
    expect(result[2].items).toEqual(['c']);
  });
});

describe('splitItems — max_chars_per_group edge cases', () => {
  it('puts oversized item in its own batch when it exceeds the char budget', () => {
    // max 3 chars, but 'longword' is 8 chars — must still appear
    const result = splitItems('longword\nhi', {
      mode: 'max_chars_per_group',
      delimiter: 'newline',
      value: 3,
    });
    expect(result[0].items).toEqual(['longword']);
    expect(result[1].items).toEqual(['hi']);
  });

  it('puts every item in its own batch when all items exceed the budget', () => {
    const result = splitItems('alpha\nbeta\ngamma', {
      mode: 'max_chars_per_group',
      delimiter: 'newline',
      value: 3,
    });
    expect(result).toHaveLength(3);
    expect(result.map(g => g.items)).toEqual([['alpha'], ['beta'], ['gamma']]);
  });
});
