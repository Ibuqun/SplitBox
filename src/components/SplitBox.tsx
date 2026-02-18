import { useState, useMemo, useEffect, useRef } from 'react';
import { Scissors, RotateCcw, Sun, Moon, Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { SplitGroup } from '@/types';
import {
  type DedupeMode,
  prepareItems,
  type InputDelimiter,
  type PrepareItemsStats,
  type SplitMode,
  type ValidationMode,
} from '@/utils/splitter';
import { downloadAllBatchesAsZip } from '@/utils/exportZip';
import type { OutputDelimiter, OutputTemplate } from '@/utils/output';
import GroupCard from './GroupCard';

type Theme = 'dark' | 'light';
const EMPTY_PREPARE_PREVIEW: { items: string[]; stats: PrepareItemsStats } = {
  items: [],
  stats: {
    rawTokenCount: 0,
    emptyRemoved: 0,
    invalidRemoved: 0,
    duplicatesRemoved: 0,
    invalidExamples: [],
  },
};

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('splitbox-theme') as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function SplitBox() {
  const [rawInput, setRawInput] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('items_per_group');
  const [delimiter, setDelimiter] = useState<InputDelimiter>('newline');
  const [splitValue, setSplitValue] = useState(200);
  const [dedupeMode, setDedupeMode] = useState<DedupeMode>('none');
  const [validationMode, setValidationMode] = useState<ValidationMode>('none');
  const [customValidationPattern, setCustomValidationPattern] = useState('');
  const [outputDelimiter, setOutputDelimiter] = useState<OutputDelimiter>('newline');
  const [outputTemplate, setOutputTemplate] = useState<OutputTemplate>('plain');
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [lastPrepareStats, setLastPrepareStats] = useState<PrepareItemsStats | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasSplit, setHasSplit] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const splitWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('splitbox-theme', theme);
  }, [theme]);

  useEffect(() => {
    splitWorkerRef.current = new Worker(new URL('../workers/splitWorker.ts', import.meta.url), {
      type: 'module',
    });

    return () => {
      splitWorkerRef.current?.terminate();
      splitWorkerRef.current = null;
    };
  }, []);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  const previewResult = useMemo(() => {
    try {
      return {
        prepared: prepareItems(rawInput, {
          delimiter,
          dedupeMode,
          validationMode,
          customValidationPattern,
        }),
        error: null as string | null,
      };
    } catch (error) {
      return {
        prepared: EMPTY_PREPARE_PREVIEW,
        error: error instanceof Error ? error.message : 'Invalid preprocessing config',
      };
    }
  }, [rawInput, delimiter, dedupeMode, validationMode, customValidationPattern]);
  const preparedPreview = previewResult.prepared;
  const prepareError = previewResult.error;

  const itemCount = useMemo(() => preparedPreview.items.length, [preparedPreview]);

  const valueLabel = useMemo(() => {
    if (splitMode === 'items_per_group') return 'Per Batch';
    if (splitMode === 'max_chars_per_group') return 'Max Chars';
    return 'Batch Count';
  }, [splitMode]);

  function runSplitInWorker(): Promise<{ groups: SplitGroup[]; stats: PrepareItemsStats }> {
    return new Promise((resolve, reject) => {
      const worker = splitWorkerRef.current;
      if (!worker) {
        reject(new Error('Split worker unavailable'));
        return;
      }

      const onMessage = (
        event: MessageEvent<{ groups?: SplitGroup[]; stats?: PrepareItemsStats; error?: string }>,
      ) => {
        worker.removeEventListener('message', onMessage);
        if (event.data.error) {
          reject(new Error(event.data.error));
          return;
        }

        if (!event.data.groups || !event.data.stats) {
          reject(new Error('Invalid split worker response'));
          return;
        }
        resolve({
          groups: event.data.groups,
          stats: event.data.stats,
        });
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage({
        rawInput,
        delimiter,
        dedupeMode,
        validationMode,
        customValidationPattern,
        splitMode,
        splitValue,
      });
    });
  }

  async function handleSplit() {
    if (!rawInput.trim() || splitValue < 1 || prepareError) return;
    setIsSplitting(true);
    try {
      const result = await runSplitInWorker();
      setGroups(result.groups);
      setLastPrepareStats(result.stats);
      setHasSplit(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to split items';
      toast.error(message);
    } finally {
      setIsSplitting(false);
    }
  }

  async function handleExportAll() {
    if (groups.length === 0) return;
    setIsExporting(true);
    try {
      await downloadAllBatchesAsZip(groups, {
        outputTemplate,
        outputDelimiter,
      });
      toast.success('Exported all batches as ZIP');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export ZIP';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleClear() {
    setRawInput('');
    setGroups([]);
    setLastPrepareStats(null);
    setHasSplit(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSplit();
    }
  }

  function buildSummary() {
    if (groups.length === 0) return null;
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
    const lastGroup = groups[groups.length - 1];

    return (
      <>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem' }}>
          {totalItems}
        </span>
        <span className="text-[--text-tertiary]"> items split into </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem' }}>
          {groups.length}
        </span>
        <span className="text-[--text-tertiary]">
          {' '}batch{groups.length > 1 ? 'es' : ''}
        </span>
        {splitMode === 'items_per_group' && groups.length > 1 && lastGroup.items.length < splitValue && (
          <span className="text-[--text-muted] ml-2 text-xs">
            ({groups.length - 1} &times; {splitValue}, 1 &times; {lastGroup.items.length})
          </span>
        )}
        {splitMode === 'target_group_count' && (
          <span className="text-[--text-muted] ml-2 text-xs">
            (target: {splitValue})
          </span>
        )}
        {splitMode === 'max_chars_per_group' && (
          <span className="text-[--text-muted] ml-2 text-xs">
            (max {splitValue} chars/batch)
          </span>
        )}
        {lastPrepareStats && (lastPrepareStats.invalidRemoved > 0 || lastPrepareStats.duplicatesRemoved > 0) && (
          <span className="text-[--text-muted] ml-2 text-xs">
            ({lastPrepareStats.invalidRemoved} invalid removed, {lastPrepareStats.duplicatesRemoved} duplicates removed)
          </span>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Ambient gradient */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, var(--ambient-glow) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <header className="mb-16 animate-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-end gap-3 mb-3">
                <h1
                  className="text-4xl md:text-5xl font-medium tracking-tight leading-none"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  Split<span style={{ color: 'var(--accent)' }}>Box</span>
                </h1>
                <span
                  className="animate-breathe mb-1"
                  style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '2rem' }}
                >
                  .
                </span>
              </div>
              <p
                className="text-xs tracking-[0.35em] uppercase"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 300 }}
              >
                Batch List Splitter
              </p>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="mt-2 w-9 h-9 rounded-lg border flex items-center justify-center
                         transition-all duration-300 cursor-pointer
                         hover:border-[--border-default]"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Input Section */}
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Input
            </label>
            {itemCount > 0 && (
              <span
                className="text-[11px] tabular-nums"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 300 }}
              >
                {itemCount.toLocaleString()} items detected
              </span>
            )}
          </div>

          <div className="relative group">
            {/* Gold accent line on focus */}
            <div
              className="absolute -left-px top-4 bottom-4 w-[2px] rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'var(--accent)' }}
            />
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste your list here, one item per line..."
              rows={10}
              className="w-full rounded-lg px-5 py-4 text-[13px] leading-relaxed resize-y
                         transition-all duration-300 outline-none border"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 300,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--border-default)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Controls */}
        <div
          className="flex flex-wrap items-center gap-5 mt-6 mb-12 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {valueLabel}
            </label>
            <input
              type="number"
              value={splitValue}
              onChange={(e) => setSplitValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min={1}
              className="w-20 rounded-md px-3 py-2.5 text-sm text-center outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Mode
            </label>
            <select
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as SplitMode)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="items_per_group">Items per batch</option>
              <option value="max_chars_per_group">Max chars per batch</option>
              <option value="target_group_count">Target number of batches</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Output
            </label>
            <select
              value={outputDelimiter}
              onChange={(e) => setOutputDelimiter(e.target.value as OutputDelimiter)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma</option>
              <option value="tab">Tab</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Template
            </label>
            <select
              value={outputTemplate}
              onChange={(e) => setOutputTemplate(e.target.value as OutputTemplate)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="plain">Plain</option>
              <option value="sql_in">SQL IN</option>
              <option value="quoted_csv">Quoted CSV</option>
              <option value="json_array">JSON array</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Parse
            </label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as InputDelimiter)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma</option>
              <option value="tab">Tab</option>
              <option value="auto">Auto detect</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Dedupe
            </label>
            <select
              value={dedupeMode}
              onChange={(e) => setDedupeMode(e.target.value as DedupeMode)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="none">None</option>
              <option value="case_sensitive">Case-sensitive</option>
              <option value="case_insensitive">Case-insensitive</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Validate
            </label>
            <select
              value={validationMode}
              onChange={(e) => setValidationMode(e.target.value as ValidationMode)}
              className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="none">None</option>
              <option value="alphanumeric">Alphanumeric</option>
              <option value="email">Email</option>
              <option value="custom_regex">Custom regex</option>
            </select>
          </div>

          {validationMode === 'custom_regex' && (
            <div className="flex items-center gap-3">
              <label
                className="text-[11px] tracking-[0.25em] uppercase font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Pattern
              </label>
              <input
                type="text"
                value={customValidationPattern}
                onChange={(e) => setCustomValidationPattern(e.target.value)}
                placeholder="^[A-Z0-9]+$"
                className="rounded-md px-3 py-2.5 text-xs outline-none border transition-all duration-300"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          )}

          <button
            onClick={() => { void handleSplit(); }}
            disabled={!rawInput.trim() || splitValue < 1 || isSplitting || Boolean(prepareError)}
            className="btn-shimmer flex items-center gap-2.5 px-6 py-2.5 rounded-md
                       text-[11px] tracking-[0.2em] uppercase font-semibold
                       transition-all duration-300 cursor-pointer
                       disabled:opacity-20 disabled:cursor-not-allowed disabled:pointer-events-none
                       hover:shadow-[0_0_24px_rgba(74,234,188,0.15)]"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Scissors className="w-3.5 h-3.5" />
            {isSplitting ? 'Splitting...' : 'Split'}
          </button>

          {hasSplit && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.15em] uppercase
                         transition-all duration-200 cursor-pointer rounded-md border hover:border-[--border-default]"
              style={{
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
                borderColor: 'var(--border-subtle)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}

          {hasSplit && groups.length > 0 && (
            <button
              onClick={() => { void handleExportAll(); }}
              disabled={isExporting || Boolean(prepareError)}
              className="flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.15em] uppercase
                         transition-all duration-200 cursor-pointer rounded-md border
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Archive className="w-3 h-3" />
              {isExporting ? 'Exporting...' : 'Export all ZIP'}
            </button>
          )}

          {!hasSplit && rawInput.trim() && (
            <span className="text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
              &#8984;+Enter to split ({itemCount} prepared items)
            </span>
          )}

          {prepareError && (
            <span className="text-[10px] tracking-wide" style={{ color: '#ef4444' }}>
              {prepareError}
            </span>
          )}
        </div>

        {rawInput.trim() && (
          <div className="mb-10 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Removed before split: {preparedPreview.stats.emptyRemoved} empty
            {`, ${preparedPreview.stats.invalidRemoved} invalid`}
            {`, ${preparedPreview.stats.duplicatesRemoved} duplicates`}
            {preparedPreview.stats.invalidExamples.length > 0 && (
              <span>
                {' '}| examples: {preparedPreview.stats.invalidExamples.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        {hasSplit && groups.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-lg border"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {buildSummary()}
              </p>
            </div>
          </div>
        )}

        {/* Batch Grid */}
        {hasSplit && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.index}
                group={group}
                outputDelimiter={outputDelimiter}
                outputTemplate={outputTemplate}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              No data leaves your browser
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent-green)' }}
              />
              <span className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                100% Client-Side
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
