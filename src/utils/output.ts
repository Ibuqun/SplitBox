export type OutputDelimiter = 'newline' | 'comma' | 'tab';
export type OutputTemplate = 'plain' | 'sql_in' | 'quoted_csv' | 'json_array';

function getJoinSeparator(outputDelimiter: OutputDelimiter): string {
  if (outputDelimiter === 'comma') return ',';
  if (outputDelimiter === 'tab') return '\t';
  return '\n';
}

function escapeSqlValue(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function formatBatchContent(
  items: string[],
  outputTemplate: OutputTemplate,
  outputDelimiter: OutputDelimiter,
): string {
  if (outputTemplate === 'sql_in') {
    return `(${items.map(escapeSqlValue).join(', ')})`;
  }

  if (outputTemplate === 'quoted_csv') {
    return items.map(escapeCsvValue).join(',');
  }

  if (outputTemplate === 'json_array') {
    return JSON.stringify(items, null, 2);
  }

  return items.join(getJoinSeparator(outputDelimiter));
}

export function getTemplateFileExtension(outputTemplate: OutputTemplate): 'txt' | 'sql' | 'csv' | 'json' {
  if (outputTemplate === 'sql_in') return 'sql';
  if (outputTemplate === 'quoted_csv') return 'csv';
  if (outputTemplate === 'json_array') return 'json';
  return 'txt';
}
