VELVET STORIES v3.25.3 — DESKTOP BOOT FIX

Fixes a deterministic React startup crash when Velvet restored directly into a chat on desktop.
Root cause: Chat.jsx referenced `conversation` inside the Velvet Experience effect before the const was initialized (JavaScript temporal dead zone).

Also keeps the Windows-safe TypeScript verifier and exposes the technical startup error inside Velvet Recovery for future diagnostics.
No story, memory, Supabase, or character data is deleted.
