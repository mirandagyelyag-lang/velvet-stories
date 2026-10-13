// Select a creator-authored facet, not a shared plot template. No model/network dependency.
const FACETS = ['coreMotivation', 'values', 'habits', 'contradictions', 'emotionalDefense',
  'fears', 'softeningTriggers', 'role', 'personality', 'description'];
const hash = (value) => [...value].reduce((n, c) => ((n * 33) ^ c.charCodeAt(0)) >>> 0, 5381);

export function buildInstantStoryIdentity(draft = {}, variationKey = '', recentSeeds = []) {
  const facets = FACETS.filter((key) => String(draft[key] || '').trim());
  if (!facets.length) return '';
  const history = Array.isArray(recentSeeds) ? recentSeeds.map(String) : [];
  const unused = facets.filter((key) => !history.some((seed) => seed.includes(`FOCUS=${key}\n`)));
  const pool = unused.length ? unused : facets;
  const fingerprint = facets.map((key) => `${key}:${draft[key]}`).join('|');
  const focus = pool[hash(`${variationKey}|${fingerprint}`) % pool.length];
  const source = String(draft[focus]).trim().slice(0, 1200);
  return `FOCUS=${focus}
CHARACTER-OWNED PREMISE
Creator-authored focal trait: ${source}
- Derive the activity, immediate desire and consequential choice from this trait AND the configured role/world. The shared story mode describes pacing only; it must not supply a generic plot.
- Choose one specific interest, obligation, skill, value or goal explicitly supported by the profile. Show how it causes what THIS character does now. Do not merely decorate a stock invitation/detour with their name or job.
- Combine the focal trait with a second configured trait where compatible. Do not force every trait into one scene, manufacture trauma, or treat a fear as permission for a crisis.
- Preserve boundaries and relationship stage. Softening triggers are influences, and growth direction is a future possibility, never already-earned change.
- Match creator-approved exampleDialogue, speechStyle, vocabulary and humor. Generic playful banter is not a universal voice.
- SILENT SWAP TEST: if replacing the lead with a differently motivated character leaves the premise and choice unchanged, redesign them from this profile.
- Use the creator's language and tone. These instructions apply regardless of the language of the profile.`;
}
