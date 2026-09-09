# Velvet Stories v3.49.46 · Turn State Ledger

Fixes a production continuity failure where a running joke silently swapped who owed the action.

Production regression:
- Chase: “I'll see if I can find some heavy cardstock...”
- User: “I'll wait for it.”
- User: *i sigh*
- Invalid: “Good. I'll hold you to it.”
- Invalid: “I'll keep the cardstock safe until you're ready...”

The dialogue prompt now reconstructs a small OBJECT / ACTOR / ACTION / RECIPIENT / STATUS ledger for the live exchange. Short reactions do not transfer ownership. The validator receives recent user messages as well as recent character replies, so it can reject role reversals after the latest turn has moved beyond “I'll wait for it.”

Target-Aware Dialogue and Spoken Naturalness remain intact.
