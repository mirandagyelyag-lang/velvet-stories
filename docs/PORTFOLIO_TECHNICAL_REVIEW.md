# ORVAYNE — Technical Review and Portfolio Case Study

**Review date:** 2026-11-14  
**Scope:** Selected repository files reviewed remotely; this is not a full security audit or a successful test run.

## Product case study

### Problem
Character-driven AI chat must balance continuity, narrative quality, response speed, and reliable mobile delivery. A delay or an inconsistent scene can disrupt the experience.

### Approach visible in the repository
- React pages are lazy-loaded from `src/App.jsx`.
- `src/main.jsx` assembles multiple context providers and application recovery utilities.
- Vite and PWA configuration support web installation; Capacitor supports Android.
- Supabase is used for backend services, including the `character-chat` edge function.
- `package.json` includes lint, build, and extensive project-specific verification scripts.

### Trade-offs and risks
- **Verification maintenance:** The large chain of version-specific scripts may be expensive to maintain. Measure runtime, identify duplicated coverage, and prioritize a smaller smoke suite plus targeted regression tests.
- **Style accumulation:** Numerous versioned CSS imports in `src/main.jsx` suggest styling layers worth consolidating only after visual regression coverage.
- **Legacy naming:** Velvet identifiers remain in the source and configuration. Rename incrementally, with deployment and storage migration checks.
- **Release metadata:** `index.html` includes a static version tag, while the Vite plugin also writes build metadata. Verify that production HTML always receives the generated version.
- **Backend authorization:** `supabase/config.toml` sets `verify_jwt = false` for `character-chat`. This setting is not proof of unauthorized access; inspect function-level authentication, rate limits, abuse protection, and cost controls before changing it.

### Validation needed before portfolio claims
1. Run `npm ci`, `npm run lint`, `npm run build`, and selected verification scripts in a clean environment.
2. Trace one complete story-generation request through client, edge function, and data persistence.
3. Confirm authorization and ownership checks for every chat or character data operation.
4. Measure response latency (p50/p95), errors, and recovery behavior using anonymized events.
5. Test PWA update flows and Android mobile scrolling on real devices.
6. Scan the repository and git history for secrets, then rotate any exposed credentials.
7. Document which components were personally authored, adapted, or AI-assisted.

## Portfolio evidence template

| Question | Evidence to collect |
| --- | --- |
| Who is the user? | Target audience and primary use case |
| What problem matters? | Reproducible issue and user impact |
| What options were considered? | Alternatives and trade-offs |
| What was built? | Screenshots, architecture, commit references |
| What changed? | Before/after measurements |
| What remains? | Known limitations and next experiments |

**Do not invent impact numbers.** Record measurements and dates before presenting outcomes to recruiters.

## Suggested portfolio narrative

> ORVAYNE is an independently developed AI storytelling product that I use to explore user experience, product trade-offs, and software reliability. Its central challenge is sustaining coherent, character-driven conversations while keeping the application responsive across web and mobile. My ongoing work includes prioritizing defects, validating story behavior, and documenting technical decisions.

Adapt this narrative to accurately distinguish personal implementation from AI-assisted development.
