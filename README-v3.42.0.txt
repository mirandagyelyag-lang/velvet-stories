VELVET STORIES v3.42.0 · SCENE INTELLIGENCE + DYNAMIC STORY DIRECTION

This release adds a deterministic Scene Director layer on top of v3.41 World Consequences, v3.40 Calendar/Life Simulation, v3.39 NPC Ecosystem, Scene Intelligence 3.37, Relationship Chemistry, Character Agency and all existing canon/physics/reality locks.

Core behavior
- Events compete for screen time instead of all demanding a scene.
- The latest visible user action/question receives first camera priority.
- Maximum two foreground threads and two brief mention threads per beat.
- Background and dormant queues preserve world state without dumping it into dialogue.
- Interruption/entrant gate requires availability + plausible location + motive + causal path.
- Group scenes use sparse attention; presence does not create a speaking quota.
- Recent high-intensity beats can cool down instead of auto-escalating.
- Romance does not automatically own neutral school/work/friendship/logistics scenes.
- Scene novelty never authorizes teleportation or random incidents.
- Natural scene endings are valid and need no teaser/cliffhanger.
- Story direction never authors the user's movement, emotion, consent or choice to reach a preferred plot.

Deterministic hard checks
- scene_thread_dump_overload
- dormant_thread_forced_onscreen
- ungrounded_scene_interruption
- user_momentum_hijacked
- cooldown_escalation_spike
- romance_gravity_monopoly
- director_forced_cliffhanger
- group_scene_roll_call
- background_actor_overactivation
- screen_time_selection_bypassed
- scene_pattern_recycled

Diagnostics
The existing Scene Intelligence Lab is upgraded to Scene Director Lab, showing foreground threads, dormant/off-screen threads, direction and sample camera discipline.

No new database migration is required.
