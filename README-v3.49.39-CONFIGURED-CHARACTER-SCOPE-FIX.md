# Velvet Stories v3.49.39 · Configured Character Scope Fix

Fixes the runtime `ReferenceError: configuredCharacter is not defined` in `buildNarrativePromptV3`. Relationship Attachment v3.49.36 had accidentally referenced request-handler locals (`configuredCharacter`, `loaded`, `latestUserMessage`, `recentCharacterReplies`) from inside the prompt builder. It now uses the prompt-local `character`, `conversation`, `latestUserRecord`, and `recentCharacterRepliesForVoice`. A dedicated regression verifier prevents this exact scope leak from returning.
