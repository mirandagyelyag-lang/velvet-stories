VELVET STORIES v3.43.0 · LONG-STORY MEMORY + CANON COMPRESSION ARCHITECTURE

This release adds a deterministic long-story memory architecture on top of v3.42 Scene Director, v3.41 World Consequences, v3.40 Calendar/Life Simulation and all existing canon, privacy, social, relationship and physics locks.

Core behavior
- Memory is layered into immutable canon, long-term history, active/dormant/resolved threads, recent context and disposable detail.
- Progressive compression preserves meaning while shedding old transcript detail: recent detail → scene summary → event memory → historical fact.
- Creator/canon/pinned memories, boundaries, promises, milestones and behavior-changing history do not decay into trivia.
- Retrieval ranks by current people, relationship, domain, active thread and behavioral consequence instead of dumping the entire memory table into every prompt.
- Relationship memory keeps qualitative texture: promises, conflict residue, boundaries, firsts and milestones rather than reducing the relationship to one score.
- Entity memory keeps recurring NPC facts and relationships available when that entity returns.
- Objective history, character knowledge, public/social knowledge and secret/scoped knowledge remain distinct.
- Resolved threads stay historical instead of silently becoming active again.
- Low-value old automatic trivia can fade without deleting hard canon.
- Automatic memory writes pass a grounding gate before persistence.
- Unsupported remembered events are deterministic hard failures.

Deterministic hard checks
- false_memory_claim
- resolved_thread_reactivated
- perspective_memory_leak
- memory_conflict_overclaim

Memory Integrity Lab
The v3.43 verification suite stress-tests long histories, 100+ memory pools, retrieval caps, progressive compression, perspective separation, resolved-thread continuity, false-memory rejection, automatic-memory grounding and private-POV isolation.

No new database migration is required. Existing memory authority, importance, source, scope and supersession fields are reused.
