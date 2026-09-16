const KEY_PREFIX = "velvet_story_collections_v34915_";
function keyFor(userId) {
  return `${KEY_PREFIX}${userId || "guest"}`;
}
function cleanName(value = "") {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 40);
}
export function loadStoryCollectionsV34915(userId) {
  if (!userId || typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && item.id && item.name).map(item => ({
      id: String(item.id),
      name: cleanName(item.name),
      storyIds: [...new Set((Array.isArray(item.storyIds) ? item.storyIds : []).map(String))],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}
export function saveStoryCollectionsV34915(userId, collections) {
  if (!userId || typeof localStorage === "undefined") return [];
  const safe = (Array.isArray(collections) ? collections : []).slice(0, 24).map(item => ({
    ...item,
    name: cleanName(item.name),
    storyIds: [...new Set((item.storyIds || []).map(String))].slice(0, 500)
  }));
  localStorage.setItem(keyFor(userId), JSON.stringify(safe));
  return safe;
}
export function createStoryCollectionV34915(userId, collections, name) {
  const safeName = cleanName(name);
  if (!safeName) throw new Error("Give this collection a name.");
  if ((collections || []).some(item => item.name.toLowerCase() === safeName.toLowerCase())) throw new Error("A collection with that name already exists.");
  const now = new Date().toISOString();
  const next = [...(collections || []), {
    id: crypto.randomUUID(),
    name: safeName,
    storyIds: [],
    createdAt: now,
    updatedAt: now
  }];
  return saveStoryCollectionsV34915(userId, next);
}
export function removeStoryCollectionV34915(userId, collections, collectionId) {
  return saveStoryCollectionsV34915(userId, (collections || []).filter(item => item.id !== collectionId));
}
export function toggleStoryInCollectionV34915(userId, collections, collectionId, storyId) {
  const now = new Date().toISOString();
  const next = (collections || []).map(item => {
    if (item.id !== collectionId) return item;
    const ids = new Set(item.storyIds || []);
    if (ids.has(storyId)) ids.delete(storyId);else ids.add(storyId);
    return {
      ...item,
      storyIds: [...ids],
      updatedAt: now
    };
  });
  return saveStoryCollectionsV34915(userId, next);
}
export function removeStoryFromAllCollectionsV34915(userId, collections, storyId) {
  const now = new Date().toISOString();
  const next = (collections || []).map(item => item.storyIds?.includes(storyId) ? {
    ...item,
    storyIds: item.storyIds.filter(id => id !== storyId),
    updatedAt: now
  } : item);
  return saveStoryCollectionsV34915(userId, next);
}
export function normalizedStorySearchV34915(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
export function storySearchScoreV34915(text = "", query = "") {
  const haystack = normalizedStorySearchV34915(text);
  const needle = normalizedStorySearchV34915(query);
  if (!haystack || !needle) return 0;
  if (haystack.includes(needle)) return 50;
  const tokens = [...new Set(needle.split(" ").filter(token => token.length >= 2))];
  const hitCount = tokens.filter(token => haystack.includes(token)).length;
  return hitCount ? hitCount * 8 + (hitCount === tokens.length ? 12 : 0) : 0;
}
