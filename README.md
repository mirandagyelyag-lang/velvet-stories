# Velvet Stories

> An AI-powered narrative chat platform for persistent character-driven stories.

Velvet Stories is a full-stack storytelling application built around long-running AI character conversations. The project focuses on narrative continuity, persistent context, character consistency, mobile-first interaction, and a story engine designed to keep scenes moving without requiring the user to direct every turn.

## Highlights

- AI-powered character conversations with persistent story context
- Character and conversation management
- Narrative continuity and relationship-state logic
- Chat-scoped NPC and story-state systems
- “Instant Story” generation and regeneration flows
- Progressive Web App support with offline asset caching
- Native Android build pipeline with Capacitor
- Supabase-backed application architecture
- Responsive, mobile-first chat experience
- Automated regression and stability verification scripts
- Production-oriented build metadata and release verification

## Tech stack

**Frontend:** React 19, Vite 8, Lucide React  
**Backend & data:** Supabase  
**Mobile:** Capacitor / Android  
**PWA:** vite-plugin-pwa, Workbox  
**Quality:** oxlint + custom regression, UI, mobile, story-engine and release verification scripts

## Engineering focus

Velvet Stories is not only a chat interface. Much of the engineering work is centered on keeping an evolving fictional world coherent across turns.

The project includes dedicated verification for areas such as scene continuity, dialogue integrity, character behavior, relationship dynamics, story momentum, user-authored scene control, NPC scoping, opening diversity, regeneration behavior, mobile layout stability, and regression protection.

The web build is configured as an installable PWA, while Capacitor provides a separate Android build path. Runtime caching is intentionally conservative for navigation so new deployments do not leave users with stale HTML referencing outdated bundles.

## Local development

```bash
npm install
npm run dev
```

Create the required local environment configuration before running features that depend on external services. Secrets and local environment files are excluded from version control.

## Quality checks

```bash
npm run lint
npm run build
npm run verify
```

The repository also contains targeted verification commands for story behavior, mobile UI, edge-function boot checks, regression protection, release validation, and Android builds.

## Android

```bash
npm run android:sync
npm run android:open
```

## Project status

Velvet Stories is an actively developed personal software project. Features and narrative systems are iterated frequently, with regression checks used to protect previously working behavior.

## Author

**Antonia Miranda**  
Software development portfolio project.
