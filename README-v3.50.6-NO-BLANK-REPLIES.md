# Velvet Stories v3.50.6 · NO BLANK REPLIES

Fixes the actual ghost-bubble path: sanitizer chains could erase readable model prose and the persistence layer accepted whitespace. v3.50.6 preserves the pre-sanitize candidate, performs one clean non-stream recovery if every local candidate is empty, refuses to persist whitespace, and makes the client reject whitespace-only done envelopes.
