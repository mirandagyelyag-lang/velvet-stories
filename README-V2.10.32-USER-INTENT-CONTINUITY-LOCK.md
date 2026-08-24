# Velvet Stories v2.10.32 — User Intent Continuity Lock

This release closes a roleplay continuity gap where character banter could overwrite the user's explicit recent motive.

## Fixed
- The latest user-stated reason wins over romantic inference. Fresh air, space, leaving, and other explicit motives stay canonical.
- Walking away from a character cannot be reframed as secretly looking for that same character unless the user explicitly says so.
- Unsupported claims such as “you were looking for me”, “you came outside for me”, jealousy, or attention-seeking are validation failures.
- A rejected pursuit/protection frame such as “I didn't ask for a bodyguard” cannot be immediately re-justified as guarding, watching, keeping tabs, or preventing the user from wandering off.
- The single bounded repair prompt now receives these exact constraints.
- A deterministic final filter removes the hard contradiction if the optional repair fails or preserves it, without adding another model call.
- Regression coverage includes the Chase fresh-air/bodyguard scenario that exposed the bug.

## Architecture preserved
- One live generation.
- One validation pass.
- At most one bounded repair model call.
- No extra background story generation.
