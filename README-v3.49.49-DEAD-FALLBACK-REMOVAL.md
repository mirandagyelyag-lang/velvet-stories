# Velvet Stories v3.49.49 · Dead Fallback Removal

Fixes the repeated `"Okay."` regeneration loop at its actual source. The hard-validation recovery path itself used `"Okay."` as its deterministic fallback. That meant a candidate could correctly be rejected for `dead_ack_after_nonverbal_cue` and then be replaced by the exact response the validator was designed to reject.

## Change
- Removes `"Okay."` from the hard-repair fallback path.
- Uses a neutral deliberate-silence beat only as last-resort safety recovery.
- Keeps the v3.49.47 nonverbal detector and v3.49.48 regeneration reset intact.
- Adds a regression verifier that fails if the dead `"Okay."` fallback returns.
