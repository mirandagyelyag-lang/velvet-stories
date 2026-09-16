const AMBIENCE_LABELS = {
  rain: "Rain",
  night_city: "Night",
  street_racing: "Street Racing",
  cafe: "Café",
  campus: "Campus",
  fireplace: "Fireplace",
  party: "Party",
  home_tv: "Home TV"
};
function clean(value = "", max = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function uniqueNames(value = []) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => clean(item, 80)).filter(Boolean))].slice(0, 12);
}
export function buildLivingSceneHeader(conversation = {}, primaryName = "") {
  const scene = conversation?.sceneState && typeof conversation.sceneState === "object" ? conversation.sceneState : {};
  const location = clean(scene.location, 72);
  const time = clean(scene.time_label, 72);
  const ambience = AMBIENCE_LABELS[conversation?.ambientMode] || "";
  const present = uniqueNames(scene.present);
  const primary = clean(primaryName, 80);
  const visiblePresent = primary ? present.filter(name => name.toLowerCase() !== primary.toLowerCase()) : present;
  const items = [location, time, ambience].filter(Boolean).slice(0, 3);
  return {
    items,
    present,
    presenceLabel: present.length > 0 ? `${present.length} present` : "Presence tracked",
    presenceTitle: present.length > 0 ? `Present: ${present.join(", ")}` : "Velvet is tracking who is physically in the scene.",
    supportingPresent: visiblePresent
  };
}
function activeResidue(conversation = {}) {
  const residue = Array.isArray(conversation?.characterDevelopment?.emotional_residue) ? conversation.characterDevelopment.emotional_residue : [];
  return residue.filter(item => clean(item?.emotion) && Number(item?.remaining_turns || 0) > 0).sort((a, b) => Number(b?.intensity || 0) - Number(a?.intensity || 0))[0] || null;
}
export function buildNextBeatSuggestion(conversation = {}, primaryName = "Character") {
  const name = clean(primaryName, 70) || "the character";
  const intelligence = conversation?.intelligenceState && typeof conversation.intelligenceState === "object" ? conversation.intelligenceState : {};
  const scene = conversation?.sceneState && typeof conversation.sceneState === "object" ? conversation.sceneState : {};
  const cast = conversation?.castState && typeof conversation.castState === "object" ? conversation.castState : {};
  const commitments = Array.isArray(intelligence.commitments) ? intelligence.commitments.map(item => clean(item, 180)).filter(Boolean) : [];
  const residue = activeResidue(conversation);
  if (residue) {
    const emotion = clean(residue.emotion, 80);
    return {
      id: `residue:${emotion}`,
      label: "Let it linger",
      detail: emotion,
      instruction: `Let the emotional aftermath of “${emotion}” continue to shape ${name}'s behavior subtly. Do not reset the mood or turn it into exposition.`
    };
  }
  if (commitments.length) {
    return {
      id: `thread:${commitments[0]}`,
      label: "Follow the open thread",
      detail: commitments[0],
      instruction: `Move the next beat naturally toward this already-established unresolved thread: ${commitments[0]}. Do not invent a new reason or skip continuity.`
    };
  }
  const present = uniqueNames(scene.present);
  if (present.length > 1) {
    return {
      id: `room:${present.join("|")}`,
      label: "Use the room",
      detail: present.join(" · "),
      instruction: `Let the people already present in the scene participate naturally where relevant: ${present.join(", ")}. Do not erase side characters or force everyone to speak.`
    };
  }
  const absent = Object.entries(cast).filter(([, value]) => /left|absent|away|outside|exited/i.test(String(value?.current_status || ""))).map(([key]) => clean(key, 80)).filter(Boolean);
  if (absent.length) {
    return {
      id: `absence:${absent[0]}`,
      label: "Keep the separation",
      detail: `${absent[0]} is out of scene`,
      instruction: `Respect that ${absent[0]} is currently outside the scene. Let that absence matter; do not bring them back without a visible, plausible transition.`
    };
  }
  const location = clean(scene.location, 90);
  return {
    id: `advance:${location || "scene"}`,
    label: "Advance naturally",
    detail: location || "Current scene",
    instruction: `Move the current scene forward by one meaningful, grounded beat${location ? ` while preserving the established location at ${location}` : ""}. Do not force a confession, time skip, or location change.`
  };
}
export function continuityGuardLabel(guard = {}) {
  if (guard?.status === "repaired") return "Continuity protected";
  if (guard?.status === "blocked") return "Continuity blocked";
  return "Continuity on";
}
const GUARD_LABELS = {
  location_changed_without_scene_change: "location",
  time_changed_without_scene_change: "time",
  present_character_silently_dropped: "scene presence",
  absent_character_reappeared: "character re-entry",
  offscreen_character_heard_turn: "who could hear",
  invented_plot_object: "established objects"
};
export function continuityGuardTitle(guard = {}) {
  const protectedItems = Array.isArray(guard?.protected) ? guard.protected.map(item => GUARD_LABELS[item]).filter(Boolean) : [];
  if (guard?.status === "repaired" && protectedItems.length) return `Velvet protected ${protectedItems.join(", ")} before committing the reply.`;
  return "Velvet checks location, presence, exits, knowledge and established objects before committing continuity.";
}
