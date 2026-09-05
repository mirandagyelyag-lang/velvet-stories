VELVET STORIES v3.25.0 · VELVET EXPERIENCE

20 experience upgrades added as a protected frontend layer:
1 Chat Composer 2.0
2 Context Chips
3 Memory Book 3.0
4 Scene Cards
5 Character Dashboard
6 Group Stories 2.0
7 Character Availability
8 Notification Simulation
9 Conversation Search 2.0
10 Favorite Moments
11 Smart Story Recap
12 Automatic Chaptering
13 Character Voice Preview
14 Relationship History Graph
15 Director Notes 2.0
16 Scene Templates
17 Visual Themes per Story
18 Performance Dashboard
19 Safe Auto-clean Memory
20 Release Center

Safety invariants:
- Supabase character-chat unchanged (sha256 eabd8136d1d9f389314113207e250073d726fd479d6c356d69559ab64af74eb2)
- ChatsContext / SSE / Envelope Guard unchanged (sha256 19ccc44748b78df8be41fedc733a348225183d63f153bbad7b84bf72b2f32cbd)
- No database migration required.
- No Supabase function deploy required.
- DEPLOY-PWA-STABLE.sh now always prints a final failure stage if deployment exits early.

Verification completed in build workspace:
- 20/20 Velvet Experience
- 20/20 Stability Sweep
- 244/244 UI
- 63/63 Mobile QA
- 26/26 Story Engine
- 10/10 Relationship Dynamics
- character-chat TypeScript syntax OK
- 70 src JS/JSX/TS files parsed with zero syntax errors

Final Vite build must run on the target machine after npm install. The package installation in the artifact environment timed out before Vite was installed, so the deploy script intentionally runs build before publication and will abort before Vercel if it fails.
