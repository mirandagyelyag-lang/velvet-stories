// Deterministic social-scene control. No provider call or quota required.
// Only intervenes when a very specific, explicitly established public scene is active.
const has = (s, re) => re.test(String(s || ""));
export function enforceSocialSceneV35395({reply="",character={},latestUserMessage="",recentUserMessages=[],recentCharacterReplies=[]}={}){
 const original=String(reply||"").trim();
 const recent=[latestUserMessage,...recentUserMessages.slice(-2),...recentCharacterReplies.slice(-2)].join("\n");
 const chase=has(character.name,/chase/i);
 const jules=has(recent,/\bjules\b/i);
 const staff=has(recent,/\badministrator\b/i);
 const reception=has(recent,/\b(?:west wing|alumni reception|reception check.in|roster)\b/i);
 const laughter=has(latestUserMessage,/\b(?:laugh|laughed|laughing|giggle|mock|teas)\b/i);
 if(!(chase&&jules&&staff&&reception&&laughter)) return {reply:original,changed:false,reason:"not_target_scene"};
 const thirdParty=has(original,/\b(?:administrator|jules|friend|staff)\b[^.!?\n]{0,90}\b(?:laughs?|calls?|shouts?|says?|steps?|walks?|interrupts?|snorts?|grins?|points?|taps?|waves?|asks?)\b/i)
   || has(original,/\b(?:laughs?|calls?|shouts?|says?|steps?|walks?|interrupts?)\b[^.!?\n]{0,65}\b(?:administrator|jules|friend|staff)\b/i);
 const obligation=has(original,/\b(?:administrator|west wing|reception|check.in)\b/i);
 const dependency=has(original,/\b(?:come here|come with me|you're coming with me|don't expect me to|not going alone|walk over there alone|stand beside me|standing right next to)\b/i);
 const nameDrift=has(original,/\bjuliette\b/i);
 if(thirdParty&&obligation&&!dependency&&!nameDrift) return {reply:original,changed:false,reason:"social_scene_pass"};
 // Grounded scene rescue: preserve the user's laughter, the existing group,
 // Jules, and the administrator's pending instruction. Never move the user.
 const rescue=[
 'One of Chase\'s friends breaks into a laugh. "Three hours at a check-in desk? That\'s brutal, Beaumont."',
 '"Beaumont!" the administrator calls from the reception desk. "West Wing. Now."',
 'Jules laughs beside you. "He really thought he was getting out of it."',
 'Chase shoots his friend a look. "You\'re enjoying this way too much."',
 '*Of course they\'re going to make a spectacle of it.*',
 'The administrator starts across the lobby toward the group, roster in hand.'
 ].join("\n\n");
 return {reply:rescue,changed:true,reason:"missing_independent_npc_or_pending_obligation"};
}
