import { useState, useMemo, useEffect } from 'react';
import { Scissors, RotateCcw, Sun, Moon } from 'lucide-react';
import type { SplitGroup } from '@/types';
import { splitItems } from '@/utils/splitter';
import GroupCard from './GroupCard';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('splitbox-theme') as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function SplitBox() {
  const [rawInput, setRawInput] = useState('');
  const [groupSize, setGroupSize] = useState(200);
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [hasSplit, setHasSplit] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('splitbox-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  const itemCount = useMemo(() => {
    if (!rawInput.trim()) return 0;
    return rawInput.split('\n').filter(line => line.trim().length > 0).length;
  }, [rawInput]);

  function handleSplit() {
    if (!rawInput.trim() || groupSize < 1) return;
    const result = splitItems(rawInput, groupSize);
    setGroups(result);
    setHasSplit(true);
  }

  function handleClear() {
    setRawInput('');
    setGroups([]);
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
    const fullGroups = groups.filter(g => g.items.length === groupSize);
    const lastGroup = groups[groups.length - 1];
    const lastIsPartial = lastGroup.items.length < groupSize;

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
          {' '}group{groups.length > 1 ? 's' : ''}
        </span>
        {groups.length > 1 && lastIsPartial && (
          <span className="text-[--text-muted] ml-2 text-xs">
            ({fullGroups.length} &times; {groupSize}, 1 &times; {lastGroup.items.length})
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
                  Split<span style={{ color: 'var(--accent-gold)' }}>Box</span>
                </h1>
                <span
                  className="animate-breathe mb-1"
                  style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', fontSize: '2rem' }}
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
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
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
              style={{ background: 'var(--accent-gold)' }}
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
              Per Group
            </label>
            <input
              type="number"
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-20 rounded-md px-3 py-2.5 text-sm text-center outline-none border transition-all duration-300"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-gold)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          <button
            onClick={handleSplit}
            disabled={!rawInput.trim() || groupSize < 1}
            className="btn-shimmer flex items-center gap-2.5 px-6 py-2.5 rounded-md
                       text-[11px] tracking-[0.2em] uppercase font-semibold
                       transition-all duration-300 cursor-pointer
                       disabled:opacity-20 disabled:cursor-not-allowed disabled:pointer-events-none
                       hover:shadow-[0_0_24px_rgba(212,168,83,0.15)]"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Scissors className="w-3.5 h-3.5" />
            Split
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

          {!hasSplit && rawInput.trim() && (
            <span className="text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
              &#8984;+Enter to split
            </span>
          )}
        </div>

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
                style={{ background: 'var(--accent-gold)' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {buildSummary()}
              </p>
            </div>
          </div>
        )}

        {/* Groups Grid */}
        {hasSplit && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <GroupCard key={group.index} group={group} />
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
