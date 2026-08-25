# Velvet Stories v2.11.9 — Referent Grounding

This release fixes multi-person handoff confusion in roleplay scenes.

- Tracks the owner/subject of a contact, the intermediary who passed it, the current holder, and the intended recipient as distinct roles.
- Buffers phone/contact handoff turns until validation completes.
- Rejects ambiguous outbound actions such as “I'm texting him” when multiple live male referents exist and the contact owner is known.
- Rejects impossible “before he changes his mind” revocation language after a completed contact handoff unless permission was visibly conditional.
- Rejects unsupported social epithets such as “campus saint” unless established by profile or visible canon.
- Adds a deterministic local referent-grounding shield after the one bounded repair, so a nearly-correct reply can be fixed without a third AI call.
- Preserves v2.11.8 Repair Shield, Scene Focus Lock, story-memory isolation, Edge boot checks, and deterministic npm install lock.
