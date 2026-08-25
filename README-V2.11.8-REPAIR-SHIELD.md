# Velvet Stories v2.11.8 — Repair Shield

- Fixes false positives where an NPC using a phone and later mentioning the lead was misclassified as unsolicited lead contact.
- Requires explicit communication evidence such as a sender label, message/call from the lead, or a lead texting/calling.
- If a repaired draft appends a genuine unsolicited off-screen lead contact, Velvet removes only that bridge locally, keeps the valid current-scene beat, and revalidates without a third AI request.
- Removes memory/timeline residue tied to the stripped contact.
- Internal validator issue names are no longer shown verbatim in the chat UI.
- Keeps v2.11.7 Scene Focus Lock, v2.11.6 scene canon, v2.11.5 memory isolation/dialogue grounding, and the deterministic npm install lock.
