import fs from "node:fs";
const read=(path)=>fs.readFileSync(path,"utf8");
const migration=read("supabase/migrations/202608280002_velvet_v330_story_dynamics.sql");
const contract=read("supabase/functions/character-chat/engine/story-contract.ts");
const edge=read("supabase/functions/character-chat/index.ts");
const studio=read("src/components/StoryWorldDrawer.jsx");
const chat=read("src/pages/Chat.jsx");
const roleplay=read("src/components/RoleplayText.jsx");
const checks=[
 ["Arc Board persists",/create table if not exists public\.story_arcs/.test(migration)&&/storyArcs/.test(edge)],
 ["Knowledge Ledger persists",/story_knowledge_entries/.test(migration)&&/persistStoryDynamics/.test(edge)],
 ["Consequence Engine persists",/story_consequences/.test(migration)&&/consequence persistence/.test(edge)],
 ["Calendar exerts pressure",/calendar pressure/.test(contract)&&/dueCalendarEvents/.test(contract)],
 ["Grounded initiative acts now",/STAGE IT IN THIS REPLY/.test(contract)&&/dialogue alone does not satisfy/.test(contract)],
 ["Romantic and social initiative",/romantic initiative/.test(contract)&&/social initiative/.test(contract)],
 ["Police requires cause",/Police or security require a plausible witnessed risk/.test(contract)],
 ["Jealousy needs evidence",/Jealousy needs a real third-party action/.test(contract)],
 ["Group speakers are distinct",/roleplay-speaker-beat/.test(roleplay)&&/identify every speaker/.test(contract)],
 ["Branch Compare is visible",/Branch Compare/.test(chat)&&/branch-compare/.test(chat)],
 ["World Studio exposes dynamics",/["']arc["']/.test(studio)&&/["']knowledge["']/.test(studio)&&/["']consequence["']/.test(studio)],
];
for(const [name,pass] of checks)console.log(`${pass?"PASS":"FAIL"} ${name}`);const failed=checks.filter(([,pass])=>!pass);console.log(`\n${checks.length-failed.length}/${checks.length} Velvet v3.3 Story Dynamics checks passed.`);if(failed.length)process.exit(1);
