# Velvet Stories v2.7.1 · Living Scenes Hotfix

This hotfix keeps Living Scenes but separates continuity-quality issues from truly structural failures.

- Continuity Guard can still trigger one bounded repair.
- Location/time/presence/object metadata no longer bricks an otherwise readable reply after the repair.
- Only empty, truncated, unfinished, user-POV-controlling, or system-language replies remain fatal after the repair.
- When both drafts are readable, Velvet keeps the one with fewer repair-trigger issues.
- The misleading "structurally invalid twice" regeneration loop is removed.

No database migration is required. Redeploy `character-chat`, then deploy the frontend.
