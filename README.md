# SplitBox

A browser-based tool for splitting large lists into manageable groups. Built for anyone who regularly needs to chunk transaction references, IDs, or any list of items into batches for SQL queries or similar operations.

**No data ever leaves your browser.**

## Features

- Paste a list of any size and split it into groups of a specified size
- All groups visible at once in a responsive grid
- Copy any group to clipboard with one click
- Download any group as a `.txt` file
- Expand/collapse item previews per group
- Dark/light theme toggle (persisted to localStorage)
- Keyboard shortcut: `Cmd+Enter` to split

## Tech Stack

- React 18 + TypeScript
- Vite (SWC)
- Tailwind CSS 3
- Lucide React (icons)
- Sonner (toast notifications)

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:8080`.

## Build

```bash
npm run build
```

Output goes to `dist/`.
