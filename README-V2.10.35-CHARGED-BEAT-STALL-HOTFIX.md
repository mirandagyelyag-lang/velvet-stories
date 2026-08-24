# Velvet Stories v2.10.35 — Charged Beat Stall Hotfix

Keeps the release at **2.10.35 Charged Beat Continuity**.

This hotfix closes the remaining charged-beat loophole where a high-initiative character could technically remain present after a charged nonverbal user cue but still stall through eye contact, smirking, silence, breathing, or weight-shifting without adding dialogue, movement, flirtation, social complication, or another concrete choice.

The exact reported Chase response after `*i raise an eyebrow*` is now a regression test and triggers the one bounded repair through `charged_beat_stalled`.

Build export contract remains intact, including `VELVET_BUILD_TIME`.
