# Velvet Stories v3.7.16 — Pulse Redesign + Auto Diagnostics

Private AI roleplay PWA built with React, Vite, Supabase and Gemini.

This tree is the single source of truth. It intentionally excludes nested historical project copies, dependencies, build output, deployment links, local secrets, obsolete audio and patch-by-patch release notes.

## Install

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Gemini and service-role secrets belong in Supabase Edge Function secrets, never in this repository.

## Deploy

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy character-chat
npx vercel --prod
```

## Verification and cleanup

```bash
npm run verify:stability
npm run build
npm run clean
```

`npm run clean` removes only reproducible build/cache output. It preserves source code, migrations, media, `.env.local`, `.git` and `.vercel`.

## Canonical structure

- `src/`: application interface and state.
- `public/`: PWA icons and the eight active ambience tracks.
- `supabase/migrations/`: complete ordered database history.
- `supabase/functions/character-chat/`: current story engine.
- `scripts/`: automated source and behavior verification.

Do not place extracted Velvet ZIPs, backups or `node_modules` inside this folder. `.gitignore` prevents them from becoming a second source of truth.
