VELVET STORIES v3.25.2 - VELVET EXPERIENCE PWA HOTFIX

Purpose
- Fix the two QA failures that prevented v3.25.1 from reaching build/deploy.
- Keep the real updater behavior instead of weakening the tests.

Changes
1. Production service-worker refresh now uses an explicit registration.update() call when a registration exists.
2. Update Doctor keeps a clearOldShellCaches compatibility helper that delegates to the newer clearVelvetCaches implementation.
3. Repair still preserves stories and localStorage. It only removes Velvet-owned caches and unregisters stale service workers.
4. stability:lab now starts with verify:v3252.

No Supabase schema, story data, character data, memories, or chat-core behavior was changed.
