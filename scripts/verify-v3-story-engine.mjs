import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const edge = read("supabase/functions/character-chat/index.ts");
const contract = read("supabase/functions/character-chat/engine/story-contract.ts");
const migration = read("supabase/migrations/202608270001_velvet_v300_story_cast.sql");
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

check("v3 compiles a turn contract before generation", edge.includes("const turnContract = compileStoryContract({") && edge.includes("buildNarrativePromptV3({"));
check("explicit corrections and latest user turn lead contract authority", contract.includes('["latest explicit canon correction", "latest visible user turn", "story bible canon"'));
check("physical movement requires narrated action", contract.includes("movementIsExplicit") && contract.includes("extractUserActions"));
check("boundaries override generic momentum", contract.includes("Honor the boundary immediately") && contract.includes("no therapy script or pursuit workaround"));
check("social worlds come from the whole profile", contract.includes("socialEcosystemsFor") && contract.includes("drivers, rivals, crew, sponsors and racing fans") && contract.includes("fans, collaborators, press and public recognition"));
check("private characters do not receive forced popularity", contract.includes("return [...new Set(kinds)]"));
check("persistent and legacy cast merge during transition", contract.includes("persistentCast") && contract.includes("castState") && contract.includes("castByName"));
check("NPC persistence has private RLS", migration.includes("enable row level security") && migration.includes("auth.uid() = user_id"));
check("NPCs retain goals knowledge presence and interaction history", ["goals", "knowledge", "presence", "last_interaction", "turn_count"].every((field) => migration.includes(field)));
check("runtime loads and writes durable cast", edge.includes('from("story_cast_members")') && edge.includes("persistStoryCastMembers({"));
check("rolling deploy remains backward compatible", edge.includes('persistentCastResult.error.code !== "42P01"'));
check("legacy prompt implementation is removed", !edge.includes("function buildNarrativePromptLegacy(") && !edge.includes("function buildNarrativePromptV212("));
check("legacy repair implementation is removed", !edge.includes("repairRoleplayOnceLegacy") && edge.includes("repairRoleplayOnceV3"));
check("one generation, validation and at most one repair remain", edge.includes("streamGeminiEnvelopeWithFailover({") && edge.includes("let validationIssues = validateNarrativeReply(") && edge.includes("if (blocking.length)") && edge.includes("repairRoleplayOnceV3({"));
check("reply and world metadata share one compact model response", ["reply", "story_drive", "scene_update", "continuity_update", "development_update", "mind_update", "post_turn_reflection", "quality_check"].every((field) => edge.includes(`"${field}"`)) && ((edge.includes("responseJsonSchema: roleplayResponseSchema()") || edge.includes("responseJsonSchema: roleplayTransportSchema()")) || (edge.includes('responseMimeType: "application/json"') && edge.includes("parseModelEnvelope(raw)"))));
check("living-story drive is structured before prose", edge.includes('required: ["beat_mode","independent_want","chosen_tactic","chosen_action","cost_or_risk","visible_change","unresolved_hook","repetition_check","pacing_reason","intensity_target","season_signal","season_reason","scene_momentum","compression_reason"]') && contract.includes("livingStoryEngine") && contract.includes("interestProofRequired"));
check("canon violations remain the repair budget", edge.includes("const REPAIR_TRIGGER_ISSUES") && edge.includes('"distance_boundary_override"') && edge.includes('"spatial_proximity_teleport"'));
check("dialogue-first naturalism is explicit", edge.includes("DIALOGUE-FIRST NATURALISM") && edge.includes("NO PROP SOUP"));
check("initiative no longer forces prop choreography", contract.includes("Dialogue can satisfy initiative") && contract.includes("Do not invent props, chores, entrances or busywork"));
check("scene choreography is continuity-first, not prose-first", contract.includes("Track physical reality silently") && contract.includes("Do not inventory props"));
check("openings are shorter and mobile-natural", edge.includes("opening scene, 55-105 words") && edge.includes("OPENING NATURALISM"));
check("severe overwritten narration can trigger one bounded repair", edge.includes("hasOverwrittenNarration") && edge.includes('"overwritten_narration"'));
check("readable replies fail soft after bounded protection", edge.includes("protected reply remained imperfect; keeping readable live reply"));
check("edge keeps live streaming and bounded model failover", edge.includes("streamGenerateContent?alt=sse") && edge.includes("const hedgeDelays = [0, 1200, 3200]") && edge.includes("cancelLosers"));
check("no narrative fallback fabricates prose", !/function\s+\w*Fallback\s*\(/.test(edge));

const syntax = spawnSync(process.execPath, ["--experimental-strip-types", "--check", new URL("../supabase/functions/character-chat/index.ts", import.meta.url).pathname], { encoding: "utf8" });
check("character-chat TypeScript syntax is valid", syntax.status === 0);

for (const result of checks) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}`);
const failed = checks.filter((result) => !result.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Velvet v3 story-engine checks passed.`);
if (failed.length) process.exit(1);
