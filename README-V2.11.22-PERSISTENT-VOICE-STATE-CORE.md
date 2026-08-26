# Velvet Stories v2.11.22 — Persistent Voice State Core

This release replaces phrase-by-phrase dialogue patching with a persistent per-story voice state stored inside `relationship_state.voice_state`.

## What changes

- Tracks casual vs profile-ornate register, recent banter streak, latest user dialogue mode, and active post-time-skip relationship baseline.
- Neutral practical questions force a concrete answer in the first spoken sentence before any tease.
- Plain answers that end with a tiny follow-up such as `Nothing planned. Why?` remain classified as plain speech instead of falsely extending the banter streak.
- Ordinary questions also reject a cinematic reaction stack before the answer; direct dialogue or one tiny physical cue is preferred.
- Recent banter creates a real cooldown instead of letting every reply become another comeback.
- Post-time-skip state such as `we were nicer to each other` persists structurally even after the original time-skip message falls out of the recent prompt window.
- The current-turn Live Voice Contract is injected immediately beside the authoritative user turn, where it outranks generic style advice.
- Existing pursuit, spatial continuity, memory isolation, social-role grounding, and hedged live streaming remain intact.

## Regression case

`What are you up to tonight?` must not receive a rhetorical dodge such as `Depends... is there a committee I need to check with first?`. A plain answer such as `Nothing planned. Why?` is accepted.
