import JSZip from 'jszip';
import type { SplitGroup } from '@/types';
import {
  formatBatchContent,
  getTemplateFileExtension,
  type OutputDelimiter,
  type OutputTemplate,
} from '@/utils/output';

interface ExportZipOptions {
  outputTemplate: OutputTemplate;
  outputDelimiter: OutputDelimiter;
}

interface BatchManifestEntry {
  batch: number;
  itemCount: number;
  filename: string;
}

export async function downloadAllBatchesAsZip(
  groups: SplitGroup[],
  options: ExportZipOptions,
): Promise<void> {
  const zip = new JSZip();
  const ext = getTemplateFileExtension(options.outputTemplate);
  const manifestEntries: BatchManifestEntry[] = [];

  groups.forEach((group) => {
    const filename = `batch-${group.index + 1}.${ext}`;
    const content = formatBatchContent(group.items, options.outputTemplate, options.outputDelimiter);
    zip.file(filename, content);
    manifestEntries.push({
      batch: group.index + 1,
      itemCount: group.items.length,
      filename,
    });
  });

  const manifest = {
    createdAt: new Date().toISOString(),
    batchCount: groups.length,
    totalItems: groups.reduce((sum, group) => sum + group.items.length, 0),
    outputTemplate: options.outputTemplate,
    outputDelimiter: options.outputDelimiter,
    batches: manifestEntries,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `splitbox-batches-${Date.now()}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
