import { useState } from 'react';
import { toast } from 'sonner';
import type { SplitGroup } from '@/types';
import { copyToClipboard } from '@/utils/clipboard';
import { downloadAsTextFile } from '@/utils/download';
import {
  formatBatchContent,
  getTemplateFileExtension,
  type OutputDelimiter,
  type OutputTemplate,
} from '@/utils/output';
import CustomIcon from './CustomIcon';

const PREVIEW_LINES = 4;

interface GroupCardProps {
  group: SplitGroup;
  outputDelimiter: OutputDelimiter;
  outputTemplate: OutputTemplate;
}

export default function GroupCard({ group, outputDelimiter, outputTemplate }: GroupCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const content = formatBatchContent(group.items, outputTemplate, outputDelimiter);
  const extension = getTemplateFileExtension(outputTemplate);
  const hasMore = group.items.length > PREVIEW_LINES;
  const visibleItems = expanded ? group.items : group.items.slice(0, PREVIEW_LINES);

  async function handleCopy() {
    await copyToClipboard(content);
    setCopied(true);
    toast.success(`Copied batch ${group.index + 1} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    downloadAsTextFile(content, `splitbox-batch-${group.index + 1}.${extension}`);
    toast.success(`Downloaded batch ${group.index + 1}`);
  }

  return (
    <div
      className="animate-slide-reveal rounded-lg border overflow-hidden transition-all duration-300 hover:border-[--border-default]"
      style={{
        animationDelay: `${group.index * 80}ms`,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          {/* Batch number badge */}
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-medium"
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {group.index + 1}
          </div>
          <div>
            <span
              className="text-[11px] tracking-[0.15em] uppercase font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Batch {group.index + 1}
            </span>
            <span
              className="text-[10px] ml-2"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {group.items.length}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] tracking-[0.15em] uppercase
                       transition-all duration-200 cursor-pointer border"
            style={{
              borderColor: copied ? 'var(--accent-green)' : 'var(--border-subtle)',
              color: copied ? 'var(--accent-green)' : 'var(--text-tertiary)',
              background: copied ? 'var(--accent-dim)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            {copied ? <CustomIcon name="check" className="w-3 h-3" /> : <CustomIcon name="copy" className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] tracking-[0.15em] uppercase
                       transition-all duration-200 cursor-pointer border"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-tertiary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <CustomIcon name="download" className="w-3 h-3" />
            .{extension}
          </button>
        </div>
      </div>

      {/* Card Body — Items Preview */}
      <div className="px-5 py-3.5">
        <div className="space-y-1">
          {visibleItems.map((item, i) => (
            <div
              key={i}
              className="text-[12px] truncate leading-relaxed"
              style={{
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 300,
              }}
            >
              <span className="inline-block w-6 text-right mr-3 select-none" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </span>
              {item}
            </div>
          ))}
        </div>

        {/* Expand / Collapse */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.15em] uppercase
                       transition-all duration-200 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {expanded ? (
              <>
                <CustomIcon name="chevronUp" className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <CustomIcon name="chevronDown" className="w-3 h-3" />
                {group.items.length - PREVIEW_LINES} more items
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
