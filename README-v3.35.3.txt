VELVET STORIES v3.35.3 · SCENE PHYSICS + CONTINUITY LOCK

Built on v3.35.2 Character Agency + Scene Momentum. Chemistry remains intentionally unchanged.

NEW
- Structured Scene Physics state: posture/body state, spatial anchor, object holder/location/state, distance, visibility, door state and elapsed time.
- Spatial Continuity Hard Lock: no silent table→wall/door/car teleports.
- Object Continuity Hard Lock: props cannot jump between hands, surfaces, pockets or owners without an on-page transfer.
- Entrance/Exit + Line-of-Sight Lock: closed doors and offscreen exits block visual micro-reactions.
- Interaction Geometry: whispering, touching and tiny-expression reading require compatible distance or an explicit movement bridge.
- Temporal Continuity: precise clock times and long elapsed-duration claims require visible support.
- Action Repetition Watch: repeated jaw/eye/hair/weight/sip/lean gestures trigger repair; doing nothing is valid.
- Deterministic Scene State Merge: visible user actions update physics state even if the model metadata is incomplete.
- Raw model prose remains quarantined until validation.

DETERMINISTIC HARD FAILURES
- body_state_redundant_transition
- spatial_anchor_teleport
- object_possession_break
- object_state_rewind
- line_of_sight_violation
- interaction_geometry_violation
- precise_time_invention
- unsupported_elapsed_time_claim
- door_state_continuity_break

REPAIR WATCH
- repeated_action_fingerprint

Chemistry Engine is still not enabled in this release.
