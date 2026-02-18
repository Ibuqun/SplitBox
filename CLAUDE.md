# SplitBox — Project Conventions

## Tech Stack
- React 19 + TypeScript + Vite (SWC) + Tailwind CSS 3
- Icons: custom inline SVG icons via `CustomIcon` component
- Toasts: sonner
- No backend, no router, no state library — single-page browser-only tool

## Project Structure
```
src/
  main.tsx          # Entry point, Toaster setup
  App.tsx           # Minimal wrapper
  index.css         # Global styles, CSS variables, animations
  components/
    SplitBox.tsx    # Main page (input, controls, summary, batch grid, theme toggle)
    GroupCard.tsx   # Individual batch card (preview, copy, download, expand)
    CustomIcon.tsx  # Shared custom SVG icon wrapper
  workers/
    splitWorker.ts  # Background split worker for large input responsiveness
  utils/
    splitter.ts    # Parsing/preprocessing + pure batch split functions
    clipboard.ts   # Copy to clipboard helper
    download.ts    # Download as .txt helper
    output.ts      # Output templates (plain/SQL/CSV/JSON)
    exportZip.ts   # Export all batches + manifest ZIP
  types/
    index.ts       # SplitGroup interface
```

## Design System
- **Fonts**: Bodoni Moda (display), Hanken Grotesk (body), Fira Code (mono)
- **Theme**: Dark/light via `data-theme` attribute on `<html>`, CSS variables in `:root`
- **Accent**: Gold (#D4A853 dark, #B8922D light)
- **Colors**: All via CSS custom properties (--bg-primary, --text-primary, etc.)
- Theme preference persisted in localStorage key `splitbox-theme`

## Commands
- `npm run dev` — dev server on port 8080
- `npm run build` — TypeScript check + production build to dist/
- `npm run lint` — ESLint
- `npm run test` — Vitest watch mode
- `npm run test:run` — one-off Vitest run (CI)

## Conventions
- Styling rules:
  - Use Tailwind utility classes for layout, spacing, and typography structure.
  - Use CSS variables (from `index.css`) for colors/fonts via inline `style` only when token values are dynamic or unavailable as utilities.
  - Avoid introducing hardcoded hex colors in components; add/modify variables in `index.css` instead.
- Animations defined in index.css, applied via utility classes (.animate-fade-up, etc.)
- Path alias: `@/` maps to `src/`
- No data collection, no external API calls — everything runs client-side
- Heavy split work runs in a Web Worker to avoid blocking the UI thread.

## Splitter Behavior Contract
- Parser options:
  - `newline` splits on line breaks.
  - `comma` splits on `,`.
  - `tab` splits on `\t`.
  - `auto` prefers newline when present, otherwise tab, otherwise comma.
- For all parser options, each token is trimmed and empty tokens are removed.
- Optional preprocessing:
  - `dedupeMode`:
    - `none`: no duplicate filtering.
    - `case_sensitive`: removes exact duplicates.
    - `case_insensitive`: removes duplicates using lowercase comparison.
  - `validationMode`:
    - `none`: no validation filter.
    - `alphanumeric`: allows `A-Z`, `a-z`, `0-9`, `_`, `-`.
    - `email`: applies a basic email format check.
    - `custom_regex`: validates against `customValidationPattern`.
- Ordering is preserved exactly as entered after trimming.
- `value` must be a positive integer; invalid values throw an error in `splitItems`.
- Split modes:
  - `items_per_group`: chunks items into batches of `value`.
  - `target_group_count`: distributes items as evenly as possible across `value` batches.
  - `max_chars_per_group`: packs lines by newline-joined character length budget.
- Each output batch uses:
  - `index`: zero-based batch index.
  - `items`: ordered items belonging to the batch.
  - `label`: `Batch {n} ({k} items)` where `{n}` is 1-based and `{k}` is the batch length.
- Output templates:
  - `plain`: delimiter-joined output.
  - `sql_in`: SQL-safe `'value'` list wrapped in parentheses.
  - `quoted_csv`: fully quoted CSV row.
  - `json_array`: pretty-printed JSON string array.
