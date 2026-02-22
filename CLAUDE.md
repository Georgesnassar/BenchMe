# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

No test framework is configured.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase

**App Router structure** under `app/`:
- `layout.tsx` — root layout with Geist fonts
- `page.tsx` — home (`/`)
- `login/page.tsx` — login (`/login`)
- `upload/page.tsx` — bench upload (`/upload`)
- `me/page.tsx` — user uploads (`/me`)
- `lib/supabase.ts` — browser Supabase client (uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `globals.css` — Tailwind v4 import + CSS vars for light/dark theme

**Environment variables** go in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Path alias:** `@/*` maps to the project root (e.g. `@/app/lib/supabase`).
