import type { SplitGroup } from '@/types';

export function splitItems(rawInput: string, groupSize: number): SplitGroup[] {
  const items = rawInput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const groups: SplitGroup[] = [];
  for (let i = 0; i < items.length; i += groupSize) {
    const chunk = items.slice(i, i + groupSize);
    const groupIndex = groups.length;
    groups.push({
      index: groupIndex,
      items: chunk,
      label: `Group ${groupIndex + 1} (${chunk.length} items)`,
    });
  }
  return groups;
}
