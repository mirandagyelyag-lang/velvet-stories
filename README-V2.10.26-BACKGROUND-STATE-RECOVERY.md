# Velvet Stories v2.10.26 — Background State Recovery

Fixes a mobile background-delivery race where a completed character reply could already be visible while the composer remained stuck in **Thinking** with the **Stop** button active.

## Fix

- Background completion is now anchored to the persisted user message id, not client/server timestamp comparison.
- A canonical character reply appearing after that user message immediately completes the active generation request.
- This clears the generation manager, Thinking state and Stop button through the existing request-finally path.
- Timestamp matching remains only as a compatibility fallback for older conversations without an expected user message id.

This avoids failures caused by phone/server clock skew after Android sleeps or resumes the PWA.
