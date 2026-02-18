import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadAsTextFile } from '../src/utils/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadAsTextFile', () => {
  it('creates an object URL and triggers a download click', () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:splitbox-test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    downloadAsTextFile('content', 'group-1.txt');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:splitbox-test');
  });
});
