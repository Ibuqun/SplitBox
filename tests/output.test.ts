import { describe, expect, it } from 'vitest';
import { formatBatchContent, getTemplateFileExtension } from '../src/utils/output';

describe('formatBatchContent', () => {
  it('formats plain output with selected delimiter', () => {
    expect(formatBatchContent(['a', 'b'], 'plain', 'newline')).toBe('a\nb');
    expect(formatBatchContent(['a', 'b'], 'plain', 'comma')).toBe('a,b');
    expect(formatBatchContent(['a', 'b'], 'plain', 'tab')).toBe('a\tb');
  });

  it('formats SQL IN template with proper escaping', () => {
    expect(formatBatchContent(["O'Reilly", 'x'], 'sql_in', 'newline')).toBe("('O''Reilly', 'x')");
  });

  it('formats quoted CSV template', () => {
    expect(formatBatchContent(['a"b', 'x'], 'quoted_csv', 'newline')).toBe('"a""b","x"');
  });

  it('formats JSON array template', () => {
    expect(formatBatchContent(['a', 'b'], 'json_array', 'newline')).toBe('[\n  "a",\n  "b"\n]');
  });
});

describe('getTemplateFileExtension', () => {
  it('returns extension per output template', () => {
    expect(getTemplateFileExtension('plain')).toBe('txt');
    expect(getTemplateFileExtension('sql_in')).toBe('sql');
    expect(getTemplateFileExtension('quoted_csv')).toBe('csv');
    expect(getTemplateFileExtension('json_array')).toBe('json');
  });
});
