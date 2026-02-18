import { describe, expect, it } from 'vitest';
import { parseItems, prepareItems, splitItems } from '../src/utils/splitter';

const defaultConfig = {
  mode: 'items_per_group' as const,
  delimiter: 'newline' as const,
};

describe('parseItems', () => {
  it('parses by newline and trims empty entries', () => {
    expect(parseItems(' alpha \n\n beta\n', 'newline')).toEqual(['alpha', 'beta']);
  });

  it('parses by comma', () => {
    expect(parseItems('a, b, ,c', 'comma')).toEqual(['a', 'b', 'c']);
    expect(parseItems('a,\nb,\nc', 'comma')).toEqual(['a', 'b', 'c']);
  });

  it('parses by tab', () => {
    expect(parseItems('a\t b\t\tc', 'tab')).toEqual(['a', 'b', 'c']);
    expect(parseItems('a\tb\nc\td', 'tab')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('auto detects delimiter', () => {
    expect(parseItems('a,b,c', 'auto')).toEqual(['a', 'b', 'c']);
    expect(parseItems('a\tb\tc', 'auto')).toEqual(['a', 'b', 'c']);
    expect(parseItems('a\nb\nc', 'auto')).toEqual(['a', 'b', 'c']);
    expect(parseItems('a,\nb\tc\nd', 'auto')).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('splitItems', () => {
  it('splits trimmed non-empty lines into indexed groups', () => {
    const input = ' alpha\n\n beta \n gamma\n delta\n';

    const result = splitItems(input, { ...defaultConfig, value: 2 });

    expect(result).toEqual([
      {
        index: 0,
        items: ['alpha', 'beta'],
        label: 'Batch 1 (2 items)',
      },
      {
        index: 1,
        items: ['gamma', 'delta'],
        label: 'Batch 2 (2 items)',
      },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(splitItems(' \n\n  ', { ...defaultConfig, value: 10 })).toEqual([]);
  });

  it('splits by target group count', () => {
    const result = splitItems('a\nb\nc\nd\ne', {
      mode: 'target_group_count',
      delimiter: 'newline',
      value: 2,
    });

    expect(result.map(group => group.items)).toEqual([['a', 'b', 'c'], ['d', 'e']]);
  });

  it('splits by max chars per group', () => {
    const result = splitItems('ab\ncd\nef', {
      mode: 'max_chars_per_group',
      delimiter: 'newline',
      value: 5,
    });

    expect(result.map(group => group.items)).toEqual([['ab', 'cd'], ['ef']]);
  });

  it('splits comma-delimited input with line breaks into multiple batches', () => {
    const result = splitItems('a,\nb,\nc,\nd', {
      mode: 'items_per_group',
      delimiter: 'comma',
      value: 2,
    });

    expect(result.map(batch => batch.items)).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('splits tab-delimited input with line breaks into multiple batches', () => {
    const result = splitItems('a\tb\nc\td', {
      mode: 'items_per_group',
      delimiter: 'tab',
      value: 2,
    });

    expect(result.map(batch => batch.items)).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('throws when split value is invalid', () => {
    expect(() => splitItems('a\nb', { ...defaultConfig, value: 0 })).toThrow(
      'value must be a positive integer',
    );
    expect(() => splitItems('a\nb', { ...defaultConfig, value: -2 })).toThrow(
      'value must be a positive integer',
    );
    expect(() => splitItems('a\nb', { ...defaultConfig, value: 1.5 })).toThrow(
      'value must be a positive integer',
    );
  });
});

describe('prepareItems', () => {
  it('removes duplicates when dedupe is enabled', () => {
    const prepared = prepareItems('a\na\nb', {
      delimiter: 'newline',
      dedupe: true,
      validationMode: 'none',
    });

    expect(prepared.items).toEqual(['a', 'b']);
    expect(prepared.stats.duplicatesRemoved).toBe(1);
  });

  it('filters invalid items based on validation mode', () => {
    const prepared = prepareItems('alpha\nbad value\nok_2', {
      delimiter: 'newline',
      dedupe: false,
      validationMode: 'alphanumeric',
    });

    expect(prepared.items).toEqual(['alpha', 'ok_2']);
    expect(prepared.stats.invalidRemoved).toBe(1);
    expect(prepared.stats.invalidExamples).toEqual(['bad value']);
  });

  it('removes duplicates case-insensitively', () => {
    const prepared = prepareItems('ABC\nabc\nAbc\nxyz', {
      delimiter: 'newline',
      dedupeMode: 'case_insensitive',
      validationMode: 'none',
    });

    expect(prepared.items).toEqual(['ABC', 'xyz']);
    expect(prepared.stats.duplicatesRemoved).toBe(2);
  });

  it('supports custom regex validation', () => {
    const prepared = prepareItems('AB12\nzz99\nBAD-1', {
      delimiter: 'newline',
      dedupeMode: 'none',
      validationMode: 'custom_regex',
      customValidationPattern: '^[A-Z0-9]+$',
    });

    expect(prepared.items).toEqual(['AB12']);
    expect(prepared.stats.invalidRemoved).toBe(2);
  });

  it('throws on invalid custom regex pattern', () => {
    expect(() => prepareItems('A1', {
      delimiter: 'newline',
      dedupeMode: 'none',
      validationMode: 'custom_regex',
      customValidationPattern: '[',
    })).toThrow('customValidationPattern is not a valid regular expression');
  });
});
