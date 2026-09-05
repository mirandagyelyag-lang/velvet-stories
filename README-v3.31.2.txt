VELVET STORIES v3.31.2 — POV PRIVACY LOCK

Fixes character mind-reading from user narration.

Rules
- Text inside *asterisks* is user narration, never automatically spoken dialogue.
- Characters may react to externally observable actions described there.
- Characters may NOT hear or answer private thoughts, motives, evaluations, memories, labels or narrator commentary inside the same asterisks.
- Example: *I walk to our usual seat where we waste time* means the walk/seat is visible, but “where we waste time” is private narration. The character cannot answer “Waste of time?”.
- *I nod* is visible. *I wonder if he hates me* is private.
- A deterministic validator catches direct leakage from private narration and forces one repair.
