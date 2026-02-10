# SplitBox — Project Conventions

## Tech Stack
- React 18 + TypeScript + Vite (SWC) + Tailwind CSS 3
- Icons: lucide-react
- Toasts: sonner
- No backend, no router, no state library — single-page browser-only tool

## Project Structure
```
src/
  main.tsx          # Entry point, Toaster setup
  App.tsx           # Minimal wrapper
  index.css         # Global styles, CSS variables, animations
  components/
    SplitBox.tsx    # Main page (input, controls, summary, group grid, theme toggle)
    GroupCard.tsx   # Individual group card (preview, copy, download, expand)
  utils/
    splitter.ts    # Pure function: splits input string into SplitGroup[]
    clipboard.ts   # Copy to clipboard helper
    download.ts    # Download as .txt helper
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

## Conventions
- All styling uses inline `style` with CSS variables + Tailwind utility classes
- Animations defined in index.css, applied via utility classes (.animate-fade-up, etc.)
- Path alias: `@/` maps to `src/`
- No data collection, no external API calls — everything runs client-side
