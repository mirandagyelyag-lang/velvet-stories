# Velvet Stories v3.49.47 — Nonverbal Response Recovery

Fixes the regeneration dead-end where action-only user beats such as `*i sigh*` could repeatedly collapse to `Okay.`. Bare generic acknowledgements are now rejected for observable nonverbal beats, while silence and short character-specific reactions remain valid. Existing Target-Aware Dialogue, Spoken Naturalness and Turn State Ledger behavior is preserved.
