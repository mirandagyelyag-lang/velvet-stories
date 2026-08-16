# Velvet Stories v1.6.1 · Quality Gate Fix

Built on v1.6.0 Calm Editorial.

Fixes the repeated error:

`Velvet rejected a weak or incomplete response before showing it. Regenerate once more.`

## What changed

- Velvet still validates every roleplay reply.
- A reply with quality/style concerns still receives one automatic repair attempt.
- After that repair, soft issues such as shortness, missing dialogue, repetition, or similarity are advisory and no longer force the user to regenerate repeatedly.
- If the repair becomes structurally worse but the original reply was safe, Velvet keeps the usable original.
- Velvet only blocks a reply when it is actually unsafe/incomplete: empty, model-truncated, unfinished, system-language leakage, or unsupported control of the user's POV.
- The user-POV detector now recognizes actions the user actually wrote in the latest turn more reliably, reducing false positives such as `I smile` -> `you smiled`.

## Deploy

The fix is in `supabase/functions/character-chat/index.ts`, so after updating the project run:

```bash
supabase functions deploy character-chat
```

If `supabase` is not installed globally, use:

```bash
npx supabase functions deploy character-chat
```
