# ORVAYNE — AI Narrative Platform

> A character-driven storytelling application focused on narrative continuity, responsive conversations, and mobile-first interaction.

**Repository note:** This project was previously named *Velvet Stories*. The repository and some internal package identifiers retain that legacy name to avoid disrupting existing integrations.

## Overview

ORVAYNE explores a difficult product challenge: how to maintain coherent, engaging AI-generated stories across many conversational turns. The application combines a React interface with a Supabase-backed architecture and mobile delivery.

### Product problems explored

- **Continuity:** keeping scenes, character identities, and relationships consistent across turns
- **Responsiveness:** reducing perceived delays and handling failed or slow generations
- **User experience:** supporting story creation, regeneration, and mobile chat flows
- **Reliability:** detecting regressions in story behavior and application interfaces

These are active engineering challenges, not claims that every issue has been fully solved.

## Technology

| Area | Tools |
| --- | --- |
| Web frontend | React 19, Vite 8, Lucide React |
| Backend and data | Supabase |
| Progressive web app | vite-plugin-pwa, Workbox |
| Android | Capacitor |
| Quality checks | oxlint and project-specific verification scripts |

## Running locally

Prerequisites: Node.js and npm. Features relying on hosted services require your own authorized configuration.

```bash
npm install
npm run dev
```

For available checks:

```bash
npm run lint
npm run build
npm run verify
```

Some checks may require external configuration or services. Passing a local check is not a guarantee of production behavior.

## Product and engineering portfolio

This project can be discussed from both a product-management and engineering perspective:

1. **Problem definition:** narrative coherence and conversation latency affect the user experience.
2. **Feature decisions:** story generation, character management, and regeneration are central product flows.
3. **Technical trade-offs:** PWA caching, backend orchestration, and automated checks create reliability challenges.
4. **Next validation steps:** collect real latency metrics, document reproducible defects, and run user tests before claiming measurable improvements.

### Evidence to add

- [ ] Screenshots or a short demo with sensitive user data removed
- [ ] Architecture diagram showing the major components
- [ ] A documented case study: problem, options considered, implementation, and outcome
- [ ] Performance metrics with methodology and dates
- [ ] Clear description of individual contributions and any AI-assisted work

## Security

Never commit service-role keys, tokens, passwords, or private user data. Keep secrets in environment variables and review repository history before sharing publicly.

## Status

Actively developed. This README documents the project's current direction; it does not imply that all functionality is production-ready.

## Author

Antonia — personal technology and product portfolio project.
