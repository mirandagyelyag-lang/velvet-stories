const norm=(v="")=>String(v||"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
const hasAny=(s,rxs)=>rxs.some((rx)=>rx.test(s));

export function evaluateLiveStoryV35388({reply="",character={},latestUserMessage="",recentCharacterReplies=[],previousScene={},storyMemory={}}={}){
 const text=String(reply||"").trim(), n=norm(text);
 const profile=[character?.name,character?.role,character?.personality,character?.relationship,character?.values,character?.fears,character?.habits,character?.contradictions,character?.coreMotivation,character?.emotionalDefense,character?.speechStyle].filter(Boolean).join(" ");
 const profileTokens=[...new Set(norm(profile).split(" ").filter(x=>x.length>=5))];
 const specificHits=profileTokens.filter(t=>n.includes(t)).length;
 const action=hasAny(text,[/\b(?:walk|step|move|reach|take|grab|open|close|leave|stay|turn|pull|push|send|call|text|drive|sit|stand|touch|kiss|hug|hand|pocket|follow|wait|choose|decide|offer|refuse|tell|ask|answer|interrupt|arrive|enter|exit)s?\b/i]);
 const world=hasAny(text,[/\b(?:phone|message|door|elevator|car|class|campus|friend|room|street|music|rain|teacher|professor|party|hall|building|table|window|deadline|call)\b/i]);
 const direct=hasAny(text,[/["“][^"”]{3,}["”]/,/\b(?:yes|no|because|i want|i need|i'm|i am|i will|i won't|like you|don't want)\b/i]);
 const dead=hasAny(n,[/^\s*(?:okay|ok|sure|fine|fair enough|we'll see|i don't know yet)[.! ]*$/i,/\bi don't know yet\b/i,/\bwhat do you do\??$/i,/\bwhat happens next\??$/i]);
 const paraphraseOnly=latestUserMessage&&norm(latestUserMessage).length>8&&n===norm(latestUserMessage);
 const recent=(Array.isArray(recentCharacterReplies)?recentCharacterReplies:[]).slice(-4).map(norm).filter(Boolean);
 const repeated=recent.some(r=>r.length>20&&(n===r||n.includes(r.slice(0,Math.min(90,r.length)))));
 const continuityAnchors=[previousScene?.location,...(previousScene?.present||[]),storyMemory?.physical_state?.location].filter(Boolean).map(norm);
 const continuity=continuityAnchors.length===0||continuityAnchors.some(a=>a&&n.includes(a))||!hasAny(text,[/\b(?:suddenly|now they were|appeared at|back at)\b/i]);
 const emotional=Boolean(storyMemory?.emotional_residue?.value)||hasAny(text,[/\b(?:want|wanted|miss|jealous|nervous|care|afraid|hope|hurt|relief|relieved|tension|hesitat|soften|yearn|remember)\w*\b/i]);
 const romance=hasAny(text,[/\b(?:kiss|touch|close|closer|hand|mouth|lips|date|jealous|want|stay|look at her|look at you|like you)\b/i]);
 const specificity=Math.min(10,3+Math.min(4,specificHits)+(character?.name&&n.includes(norm(character.name))?1:0)+(action?1:0)+(direct?1:0));
 const movement=Math.min(10,(action?5:1)+(world?2:0)+(direct?2:0)+(text.length>120?1:0));
 const initiative=Math.min(10,(action?5:1)+(direct?2:0)+(world?2:0));
 const scores={
  characterFidelity:specificity,storyMovement:movement,
  emotionalContinuity:Math.min(10,(emotional?6:3)+(storyMemory?.emotional_residue?.value?2:0)+(continuity?2:0)),
  romanticProgression:Math.min(10,(romance?6:3)+(emotional?2:0)+(action?2:0)),
  specificity,initiative,subtext:Math.min(10,(emotional&&direct?7:4)+(action?2:0)),
  worldLife:Math.min(10,(world?7:3)+(action?2:0)),
  continuity:continuity?9:2,
  replyValue:Math.min(10,(action?3:0)+(direct?2:0)+(world?1:0)+(specificity>=6?2:0)+(!dead&&!repeated?2:0))
 };
 const collisionRisk=specificity<=4&&!profileTokens.some(t=>n.includes(t))&&!world;
 const issues=[];
 if(dead)issues.push("dead_safe_reply");
 if(paraphraseOnly)issues.push("user_paraphrase_only");
 if(repeated)issues.push("near_duplicate_reply");
 if(!continuity)issues.push("continuity_break");
 if(collisionRisk)issues.push("character_collision_risk");
 if(scores.storyMovement<=2&&scores.replyValue<=3)issues.push("no_story_movement");
 if(scores.initiative<=2&&text.length<180)issues.push("no_character_initiative");
 const blocking=issues.filter(x=>["dead_safe_reply","user_paraphrase_only","near_duplicate_reply","continuity_break"].includes(x));
 return {scores,issues,blocking,collisionRisk,pass:blocking.length===0&&scores.replyValue>=3};
}

export function liveStoryRepairIssuesV35388(report={}){
 return [...new Set([...(report?.blocking||[]),...((report?.scores?.replyValue||0)<3?["low_reply_value"]:[])])];
}
