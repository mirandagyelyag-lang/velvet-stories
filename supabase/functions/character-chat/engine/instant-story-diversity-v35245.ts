export const INSTANT_STORY_NON_ACADEMIC_SCENES = [
  "a quiet neighborhood street after separate plans have just ended",
  "a crowded restaurant or takeout counter where something practical brings them together",
  "a grocery store or market during an ordinary errand",
  "a parking garage or curbside pickup with somewhere real to go next",
  "a friend's apartment or shared social gathering already in progress",
  "a family or friend-group event where the character has their own reason to attend",
  "a train station, bus stop, airport pickup, or other transit moment",
  "a park, waterfront, lookout, trail, or outdoor public place tied to an actual activity",
  "a shop, record store, bookstore, arcade, cinema, gallery, or event venue chosen for a specific activity",
  "the character's work, training, garage, studio, office, club, or hobby space when their profile supports it",
  "a home kitchen, living room, hallway, balcony, or building entrance when the relationship plausibly allows it",
];

const clean = (value: unknown, limit = 240) => String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);

export function instantStorySceneFamily(value = "") {
  const seed = String(value || "").toLowerCase();
  if (/garage|workshop|roadside|gas station|car meet|race-adjacent/.test(seed)) return "motors";
  if (/training|stadium|equipment|post-practice/.test(seed)) return "training";
  if (/office|hotel lobby|private event|work-adjacent/.test(seed)) return "work_event";
  if (/restaurant|takeout counter/.test(seed)) return "restaurant";
  if (/friend's apartment|shared social gathering/.test(seed)) return "friend_gathering";
  if (/family or friend-group event/.test(seed)) return "family_event";
  if (/grocery store|market|ordinary errand/.test(seed)) return "market";
  if (/parking garage|curbside pickup/.test(seed)) return "parking_pickup";
  if (/train station|bus stop|airport|transit/.test(seed)) return "transit";
  if (/park|waterfront|lookout|trail|outdoor/.test(seed)) return "outdoor";
  if (/shop|record store|bookstore|arcade|cinema|gallery|event venue/.test(seed)) return "culture_leisure";
  if (/home kitchen|living room|hallway|balcony|building entrance/.test(seed)) return "home_building";
  if (/neighborhood street/.test(seed)) return "neighborhood";
  return clean(seed, 80) || "other";
}

function instantStoryHash(value = "") {
  return [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
}

export function instantStorySceneSeed(draft: Record<string, unknown> = {}, idea = "", variationKey = "", recentSceneSeeds: unknown[] = []) {
  const cleanIdea = clean(idea, 180);
  if (cleanIdea) return `USER-SPECIFIED DIRECTION: ${cleanIdea}`;
  const profile = `${draft?.role || ""} ${draft?.description || ""} ${draft?.personality || ""} ${draft?.relationship || ""} ${draft?.world || ""} ${draft?.scenario || ""}`.toLowerCase();
  const specialized: string[] = [];
  if (/race|racing|racer|garage|car|track|circuit|street race/.test(profile)) specialized.push("garage, workshop, roadside stop, gas station, car meet, or race-adjacent place");
  if (/athlete|captain|team|practice|training|football|soccer|basketball|polo|sport/.test(profile)) specialized.push("training facility, stadium exterior, equipment pickup, recovery stop, or post-practice food run");
  if (/business|ceo|company|wealth|millionaire|billionaire|family empire|executive/.test(profile)) specialized.push("office after hours, hotel lobby, private event, restaurant, car ride, building entrance, or work-adjacent errand");
  const pool = specialized.length ? [...specialized, ...INSTANT_STORY_NON_ACADEMIC_SCENES] : INSTANT_STORY_NON_ACADEMIC_SCENES;
  const recent = new Set((Array.isArray(recentSceneSeeds) ? recentSceneSeeds : []).map((item) => clean(item, 240)).filter(Boolean));
  const recentFamilies = new Set([...recent].map(instantStorySceneFamily));
  const available = pool.filter((seed) => !recent.has(seed) && !recentFamilies.has(instantStorySceneFamily(seed)));
  const candidates = available.length ? available : pool;
  const entropy = `${variationKey}|${Date.now()}|${Math.random()}|${draft?.name || ""}`;
  return candidates[instantStoryHash(entropy) % candidates.length];
}
