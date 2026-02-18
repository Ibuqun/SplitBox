# SplitBox

A browser-based tool for splitting large lists into manageable batches. Built for anyone who regularly needs to chunk transaction references, IDs, or any list of items into batches for SQL queries or similar operations.

**No data ever leaves your browser.**

## Features

- Paste a list of any size and split it into batches of a specified size
- Split modes: items per batch, max chars per batch, or target number of batches
- Parser options: newline, comma, tab, or auto-detect
- Output options for batch results: newline, comma, or tab
- Output templates: plain, SQL IN, quoted CSV, or JSON array
- Export all batches at once as a ZIP with a manifest
- Optional preprocessing: dedupe (none/case-sensitive/case-insensitive) and token validation (alphanumeric/email/custom regex)
- Split runs in a Web Worker to keep the UI responsive on large inputs
- All batches visible at once in a responsive grid
- Copy any batch to clipboard with one click
- Download any batch with template-aware extension (`.txt`, `.sql`, `.csv`, `.json`)
- Expand/collapse item previews per batch
- Dark/light theme toggle (persisted to localStorage)
- Keyboard shortcut: `Cmd+Enter` to split

## Tech Stack

- React 19 + TypeScript
- Vite (SWC)
- Tailwind CSS 3
- Custom inline SVG icon system
- Sonner (toast notifications)

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:8080/`.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Test

```bash
npm run test:run
```

## Split Rules

- Input is parsed one line per item.
- Input parser can be set to newline, comma, tab, or auto-detect.
- Duplicate removal supports case-sensitive or case-insensitive comparison and preserves first occurrence order.
- Validation mode can drop malformed tokens before splitting (`alphanumeric`, `email`, or custom regex).
- Leading/trailing whitespace is trimmed per line.
- Empty lines are ignored.
- Split value must be a positive integer.
- Output order is preserved.
