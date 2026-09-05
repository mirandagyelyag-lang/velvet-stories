Velvet Stories v3.21.3 — Gemini No-Schema Hotfix

- Removes responseJsonSchema from every Gemini request in character-chat.
- Keeps application/json response MIME where supported.
- Roleplay uses JSON mode first and retries with a bare contents-only request on HTTP 400.
- Keeps all v3.20 Emotional Intelligence systems and v3.21 Human Behavior changes.
- Server-side parsing, validation, repair, continuity and safety checks remain active.
