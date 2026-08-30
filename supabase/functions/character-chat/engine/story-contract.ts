export type StoryContractInput = {
  character: Record<string, unknown>;
  userName: string;
  latestUserMessage: string;
  turnIntent: Record<string, unknown>;
  sceneState?: Record<string, unknown>;
  castState?: Record<string, unknown>;
  persistentCast?: Array<Record<string, unknown>>;
  storyBible?: Array<Record<string, unknown>>;
  castConnections?: Array<Record<string, unknown>>;
  calendarEvents?: Array<Record<string, unknown>>;
  canonCorrections?: Array<Record<string, unknown>>;
  storyArcs?: Array<Record<string, unknown>>;
  knowledgeLedger?: Array<Record<string, unknown>>;
  storyConsequences?: Array<Record<string, unknown>>;
  chemistryProfiles?: Array<Record<string, unknown>>;
  storyPlans?: Array<Record<string, unknown>>;
  storyConflicts?: Array<Record<string, unknown>>;
  storyMilestones?: Array<Record<string, unknown>>;
  recentMessages?: Array<Record<string, unknown>>;
  opening?: boolean;
};

export type StoryContract = {
  authority: string[];
  finalState: {
    location: string;
    time: string;
    present: string[];
    communicationMedium: string;
  };
  userAuthored: {
    literalTurn: string;
    stagedActions: string[];
    boundaries: string[];
    movementIsExplicit: boolean;
  };
  characterBehavior: {
    socialEcosystems: string[];
    voiceAnchors: string[];
    independence: number;
    initiative: number;
  };
  supportingCast: Array<Record<string, unknown>>;
  turnObjective: string;
  conversationQuality: {
    recentPatterns: string[];
    nextTurnAdjustments: string[];
  };
  independentLife: {
    anchors: string[];
    instruction: string;
  };
  storyAuthority: {
    bible: Array<Record<string, unknown>>;
    castConnections: Array<Record<string, unknown>>;
    calendar: Array<Record<string, unknown>>;
    corrections: string[];
  };
  storyDynamics: {
    activeArcs: Array<Record<string, unknown>>;
    knowledgeLedger: Array<Record<string, unknown>>;
    activeConsequences: Array<Record<string, unknown>>;
    dueCalendarEvents: Array<Record<string, unknown>>;
  };
  initiativePlan: {
    required: boolean;
    intensity: "low" | "medium" | "high";
    talkOnlyDrought: boolean;
    availablePressure: string[];
    instruction: string;
    guardrails: string[];
  };
  livingStoryEngine: {
    mode: "intimate" | "social" | "pressure" | "aftermath" | "ordinary";
    interestProofRequired: boolean;
    sceneChangeRequired: boolean;
    emotionalCost: string;
    instruction: string;
    realityRules: string[];
  };
  relationshipEngines: {
    chemistry: Record<string, unknown>;
    jealousy: Record<string, unknown>;
    plans: Record<string, unknown>;
    conflictAndRepair: Record<string, unknown>;
    milestones: Record<string, unknown>;
    choreography: Record<string, unknown>;
  };
};

const text = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) => text(value).toLowerCase().replace(/[’']/g, "'");
const list = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];

export function socialEcosystemsFor(character: Record<string, unknown> = {}) {
  const profile = normalized([
    character.role, character.description, character.personality, character.relationship,
    character.scenario, character.world, character.character_values, character.habits,
  ].filter(Boolean).join(" | "));
  const kinds: string[] = [];
  if (/heartthrob|heartbreaker|campus crush|desired|playboy|womanizer|serial dater/.test(profile)) kinds.push("romantic attention and dating history");
  if (/race car|racecar|racing driver|street racer|motorsport|formula 1|f1 driver|nascar|indycar|drift|rally/.test(profile)) kinds.push("drivers, rivals, crew, sponsors and racing fans");
  if (/athlete|captain|quarterback|football|soccer|basketball|baseball|hockey|tennis|swimmer|olympian/.test(profile)) kinds.push("teammates, opponents, coaches and supporters");
  if (/musician|singer|actor|actress|model|celebrity|famous|influencer|streamer|artist|idol/.test(profile)) kinds.push("fans, collaborators, press and public recognition");
  if (/heir|heiress|billionaire|millionaire|old money|prominent family|socialite|family empire/.test(profile)) kinds.push("family networks, staff, status seekers and privileged access");
  if (/leader|president|ceo|founder|boss|kingpin|mafia|notorious|powerful/.test(profile)) kinds.push("allies, rivals, petitioners and visible authority");
  if (/beautiful|handsome|gorgeous|stunning|striking|charismatic|magnetic|turns heads/.test(profile)) kinds.push("appearance-based attention");
  return [...new Set(kinds)];
}

export function extractUserActions(value: string) {
  const source = text(value);
  const actions = [...source.matchAll(/\*([^*]{2,500})\*/g)].map((match) => text(match[1]));
  return actions.slice(-8);
}

export function extractBoundaries(value: string) {
  const source = normalized(value);
  const patterns = [
    /(?:leave|go) (?:me )?alone/, /go away/, /don'?t (?:follow|touch|talk to) me/,
    /stop (?:following|touching|pressuring) me/, /i (?:said|don'?t|do not) want (?:space|to talk)/,
  ];
  return patterns.filter((pattern) => pattern.test(source)).map((pattern) => pattern.source);
}

export function compileStoryContract(input: StoryContractInput): StoryContract {
  const scene = input.sceneState || {};
  const actions = extractUserActions(input.latestUserMessage);
  const movementIsExplicit = actions.some((action) => /\b(?:walk|step|move|leave|exit|turn|run|drive|pass|cross|enter|sit|stand|approach)/i.test(action));
  const present = list(scene.present);
  const persistent = (input.persistentCast || []).filter((member) => member && member.name);
  const castByName = new Map<string, Record<string, unknown>>();
  for (const member of persistent) castByName.set(normalized(member.name), member);
  for (const [name, state] of Object.entries(input.castState || {})) {
    const key = normalized(name);
    castByName.set(key, { ...(castByName.get(key) || {}), ...(typeof state === "object" && state ? state : {}), name });
  }
  const socialEcosystems = socialEcosystemsFor(input.character);
  const boundaries = extractBoundaries(input.latestUserMessage);
  const recentCharacterTurns = (input.recentMessages || []).filter((message) => message?.sender === "character").slice(-5).map((message) => text(message.content));
  const recentActionCount = recentCharacterTurns.filter((turn) => /\*[^*]+\*|\b(?:arrived|entered|called|texted|invited|pulled up|knocked|interrupted|police|security|friend|teammate|crew|party|race|practice|plan)\b/i.test(turn)).length;
  const talkOnlyDrought = recentCharacterTurns.length >= 3 && recentActionCount <= 1;
  const recentInterestProofCount = recentCharacterTurns.filter((turn) => /\b(?:chose|stayed|waited|returned|came back|showed up|invited|made room|saved|brought|remembered|risked|admitted|defended|covered for|cancelled|changed plans|gave up|turned down|drove|called|texted|asked .* out|picked .* up)\b/i.test(turn)).length;
  const recentBlock = normalized(recentCharacterTurns.join("\n"));
  const recentPatterns: string[] = [];
  if ((recentBlock.match(/\?/g) || []).length >= 6) recentPatterns.push("question-heavy rhythm");
  if ((recentBlock.match(/\b(?:smirk|scoff|jaw|gaze|low voice|raised an eyebrow)\b/g) || []).length >= 4) recentPatterns.push("recycled cinematic gestures");
  if ((recentBlock.match(/\b(?:naturally|keep up|how observant|point taken|fair point)\b/g) || []).length >= 3) recentPatterns.push("polished AI banter cadence");
  if ((recentBlock.match(/\b(?:i understand|give you space|if you change your mind|you know where to find me)\b/g) || []).length >= 2) recentPatterns.push("therapeutic or service-language drift");
  const nextTurnAdjustments = recentPatterns.map((pattern) => ({
    "question-heavy rhythm": "Use a statement, decision or interruption before asking anything.",
    "recycled cinematic gestures": "Open with dialogue or purposeful action; avoid the recent gesture vocabulary.",
    "polished AI banter cadence": "Use plain, uneven spoken language and let the character be briefly unpolished.",
    "therapeutic or service-language drift": "Respond in the character's own emotional vocabulary, without counselor phrasing.",
  }[pattern] || "Change conversational tactic."));
  const lifeAnchors = [input.character.role, input.character.world, input.character.scenario, input.character.habits, input.character.character_values]
    .map(text).filter(Boolean).slice(0, 5);
  const mode = text(input.turnIntent?.medium || "in_person");
  const initiative = Number(input.character.initiative || 65);
  const romance = Number(input.character.romance_intensity || 35);
  const drama = Number(input.character.drama || 45);
  const flirting = Number(input.character.flirting || 30);
  const activeArcs = (input.storyArcs || []).filter((arc) => ["active", "planned"].includes(text(arc?.status))).slice(0, 12);
  const activeConsequences = (input.storyConsequences || []).filter((item) => text(item?.status) !== "resolved").slice(0, 12);
  const dueCalendarEvents = (input.calendarEvents || []).filter((event) => ["active", "upcoming"].includes(text(event?.status))).slice(0, 8);
  const availablePressure: string[] = [];
  if (romance >= 35 || flirting >= 40) availablePressure.push("romantic initiative: create a specific invitation, shared task, private opening, earned closeness, playful challenge, or honest reveal now");
  availablePressure.push("ordinary-life opportunity: begin a concrete activity together—an errand, drive, meal, practice, problem, favor, arrival, departure, group plan or unfinished task—so dialogue happens while life moves");
  if (present.length > 2 || persistent.length || (input.castConnections || []).length) availablePressure.push("social initiative: bring one established friend, teammate, rival or group obligation into the beat with their own goal and voice");
  if (drama >= 40) availablePressure.push("grounded friction: use incompatible plans, a witnessed interaction, a broken commitment, embarrassment, competition, or incomplete information with evidence");
  if (activeConsequences.length) availablePressure.push("consequence pressure: let an unresolved choice materially affect access, trust, reputation, plans or safety");
  if (activeArcs.length) availablePressure.push("arc pressure: advance or complicate one active arc through its next pressure, not exposition");
  if (dueCalendarEvents.length) availablePressure.push("calendar pressure: prepare, interrupt, begin or complicate a due event without silently skipping story time");
  const riskLicensed = /race|racing|car|motor|party|fraternity|club|bar|trespass|illegal|street|campus|noise|public/i.test([input.character.role,input.character.world,input.character.scenario,scene.location,input.latestUserMessage].map(text).join(" "));
  if (drama >= 55 && riskLicensed) availablePressure.push("external complication: police, campus security, venue staff, rivals, traffic or authority may intervene only from a visible cause in this scene");
  const initiativeRequired = !boundaries.length && (initiative >= 55 || talkOnlyDrought || activeArcs.length > 0 || activeConsequences.length > 0);
  const chemistry = (input.chemistryProfiles || []).find((item) => normalized(item?.character_name) === normalized(input.character.name)) || {};
  const activePlans = (input.storyPlans || []).filter((item) => !["completed","cancelled","failed"].includes(text(item?.status))).slice(0, 10);
  const activeConflicts = (input.storyConflicts || []).filter((item) => text(item?.status) !== "resolved").slice(0, 8);
  const milestones = (input.storyMilestones || []).slice(0, 24);
  const socialEvidence = [
    ...(input.castConnections || []).filter((item) => /date|flirt|crush|ex|attract|interest|rival|jealous/i.test(text(item?.relationship))),
    ...(input.knowledgeLedger || []).filter((item) => /date|flirt|kiss|crush|interest|invite|ex\b/i.test(`${text(item?.subject)} ${text(item?.knowledge)}`)),
  ].slice(0, 8);
  const jealousyStage = !socialEvidence.length ? "none" : drama >= 70 ? "visible pressure" : drama >= 45 ? "contained reaction" : "noticed privately";
  const sceneActivity = text(scene.activity || scene.current_activity || "conversation");
  const sceneObjects = list(scene.objects_present || scene.objects);
  const romanticStory = romance >= 30 || flirting >= 35 || /romance|lover|crush|heartthrob|heartbreaker|dating|boyfriend|girlfriend|husband|wife|attract/i.test([
    input.character.role, input.character.relationship, input.character.description, input.character.scenario,
  ].map(text).join(" "));
  const interestProofRequired = !boundaries.length && romanticStory && (recentCharacterTurns.length < 2 || recentInterestProofCount === 0);
  const sceneChangeRequired = !boundaries.length && (talkOnlyDrought || (recentCharacterTurns.length >= 5 && recentActionCount <= 2));
  const livingMode: StoryContract["livingStoryEngine"]["mode"] = activeConsequences.length || activeConflicts.length
    ? "aftermath"
    : drama >= 60 && availablePressure.some((item) => item.startsWith("external complication"))
      ? "pressure"
      : (present.length > 2 || persistent.length) && socialEcosystems.length
        ? "social"
        : romanticStory
          ? "intimate"
          : "ordinary";
  let objective = input.opening
    ? "Establish one active, playable situation without inventing a user response."
    : "Answer the literal latest turn, advance one earned beat, and stop.";
  if (boundaries.length) objective = "Honor the boundary immediately while preserving the character's recognizable personality; no therapy script or pursuit workaround.";
  else if (socialEcosystems.length) objective += " In a relevant public scene, let the established social ecosystem exist organically without forcing jealousy or stealing the scene.";

  return {
    authority: ["latest explicit canon correction", "latest visible user turn", "story bible canon", "visible transcript", "confirmed memory", "stored derived state"],
    finalState: {
      location: text(scene.location || "unknown"),
      time: text(scene.time_label || "unknown"),
      present,
      communicationMedium: mode,
    },
    userAuthored: {
      literalTurn: text(input.latestUserMessage),
      stagedActions: actions,
      boundaries,
      movementIsExplicit,
    },
    characterBehavior: {
      socialEcosystems,
      voiceAnchors: [input.character.speech_style, input.character.voice_vocabulary, input.character.humor_style, input.character.conflict_style]
        .map(text).filter(Boolean).slice(0, 4),
      independence: Number(input.character.character_independence || 80),
      initiative,
    },
    supportingCast: [...castByName.values()].slice(0, 12),
    turnObjective: objective,
    conversationQuality: { recentPatterns, nextTurnAdjustments },
    independentLife: {
      anchors: lifeAnchors,
      instruction: "Give the character ongoing obligations, friendships, work and interests implied by these anchors. Use them only when relevant; never invent a schedule merely to avoid the user.",
    },
    storyAuthority: {
      bible: (input.storyBible || []).slice(0, 24),
      castConnections: (input.castConnections || []).slice(0, 24),
      calendar: (input.calendarEvents || []).filter((event) => event?.status !== "cancelled").slice(0, 20),
      corrections: (input.canonCorrections || []).map((item) => text(item?.correction)).filter(Boolean).slice(0, 12),
    },
    storyDynamics: {
      activeArcs,
      knowledgeLedger: (input.knowledgeLedger || []).slice(0, 30),
      activeConsequences,
      dueCalendarEvents,
    },
    initiativePlan: {
      required: initiativeRequired,
      intensity: initiative >= 75 || talkOnlyDrought ? "high" : initiative >= 45 ? "medium" : "low",
      talkOnlyDrought,
      availablePressure,
      instruction: initiativeRequired
        ? "Choose one grounded opportunity or pressure and STAGE IT IN THIS REPLY. The character must decide, invite, act, interrupt, arrive, involve someone, reveal something, or face a consequence—not merely discuss what could happen. Give the user a concrete situation to react to and stop before deciding their response."
        : "Advance only what the current beat earns. Initiative never overrides a boundary.",
      guardrails: [
        "Never narrate the user's thoughts, feelings, jealousy, consent, dialogue or unstated movement.",
        "Jealousy needs a real third-party action or social fact; never manufacture betrayal or instant possessiveness.",
        "Use at most one major complication per beat and make its cause visible before or as it lands.",
        "Police or security require a plausible witnessed risk; do not spawn them as random decoration.",
        "Supporting characters have distinct goals and voices. In group dialogue identify every speaker clearly.",
        "Persist consequences: do not erase damage, promises, social fallout or unfinished plans next turn.",
      ],
    },
    livingStoryEngine: {
      mode: livingMode,
      interestProofRequired,
      sceneChangeRequired,
      emotionalCost: "A meaningful choice should cost the character something small but real: time, convenience, pride, social ease, reputation, another opportunity, or the safety of staying emotionally hidden.",
      instruction: "Write a lived beat, not a response-shaped paragraph. The character enters with a want that exists independently of the user's line, chooses a tactic, and changes the situation on-page. If interestProofRequired is true, prove interest through one voluntary, character-specific investment or risk now; attraction words, staring, teasing, protectiveness and jealousy alone do not count. If sceneChangeRequired is true, materially alter the activity, access, participants, plan, information, stakes or physical situation before ending. Leave a clean opening for the user without asking them to invent the plot.",
      realityRules: [
        "Desire has behavior: the character arranges, remembers, returns, makes room, risks embarrassment, changes a plan, shares access, tells an inconvenient truth, or chooses the user when another option genuinely exists.",
        "Emotion is not constant intensity. Use contrast: ordinary activity, interruption, imperfect timing, embarrassment, silence, humor, practical detail, then one honest pressure point.",
        "NPCs are people, not jealousy props. Give an active NPC a separate goal, relationship and consequence; let them interrupt, disagree, need something, invite someone or change the plan.",
        "Conflict must threaten something specific. Nobody fights merely because the story needs drama; incompatible goals, loyalty, reputation, fear, bad timing, secrecy or a broken commitment create the collision.",
        "Coincidences may open a scene once. After that, consequences come from visible choices. Police, rivals, family, friends and authority follow causes already present in the world.",
        "Do not resolve the emotional consequence in the same beat that creates it. Let awkwardness, jealousy, hurt, desire, guilt or doubt alter later behavior until addressed on-page.",
        "Romantic initiative never means coercion. A refusal or boundary ends that tactic immediately; the character may feel and choose privately, but cannot pressure or engineer a workaround.",
      ],
    },
    relationshipEngines: {
      chemistry: {
        profile: chemistry,
        instruction: "Make this relationship recognizable without repeating a gimmick. Reuse at most one established joke, gesture or meaningful place in a scene; create new chemistry through choices, timing and vulnerability. Never copy another character's romantic pattern.",
      },
      jealousy: {
        stage: jealousyStage,
        evidence: socialEvidence,
        instruction: socialEvidence.length
          ? "React only to the listed witnessed action or established social fact. Express jealousy through this character's conflict style; escalation must pass from noticing to behavioral change to confrontation, never instantly to ownership."
          : "There is no grounded jealousy trigger. Do not invent an admirer, betrayal, possessive claim or the user's jealousy merely to manufacture drama.",
      },
      plans: {
        active: activePlans,
        instruction: "Characters may propose a specific plan with activity, participants and story timing. A proposal is not accepted until the user accepts it. Accepted plans must return, begin, change or be cancelled on-page; do not forget them.",
      },
      conflictAndRepair: {
        active: activeConflicts,
        instruction: activeConflicts.length
          ? "Carry the conflict residue into word choice, access, trust and behavior. Do not reset to normal. Repair must match the character: an imperfect attempt, concrete amends, honest admission or changed action—not therapy language or one apology that erases everything."
          : "Conflict needs a concrete incompatible goal, witnessed slight, broken promise or consequential misunderstanding. Never create cruelty without motive.",
      },
      milestones: {
        achieved: milestones,
        instruction: "Treat achieved firsts as canon and never replay them as firsts. Do not rush a new milestone simply to fill a turn; earn it through the current relationship phase and record only events that actually occur on-page.",
      },
      choreography: {
        location: text(scene.location || "unknown"), present, activity: sceneActivity, objects: sceneObjects,
        instruction: "Block the scene physically. Give active NPCs positions, tasks and entrances tied to the location. Every meaningful movement must have a cause and update distance or access. Let dialogue happen during an activity; never teleport people, move the user without authored action, or make a crowd stand silently as decoration.",
      },
    },
  };
}

export function storyContractPrompt(contract: StoryContract) {
  return `TURN CONTRACT — SINGLE SOURCE OF TRUTH\n${JSON.stringify(contract, null, 2)}\n\nExecution order: understand this contract, decide what the character wants before reacting, choose conduct consistent with the character, choreograph the beat, then write. Never reverse the order. If initiativePlan.required is true, create the selected playable action or event on-page now; dialogue alone does not satisfy it. If livingStoryEngine.interestProofRequired is true, the reply must contain visible proof of voluntary investment with a real cost or risk; attraction narration, eye contact, banter, questions and promises about later do not satisfy it. If livingStoryEngine.sceneChangeRequired is true, something materially different must be true at the end of the reply. Chemistry must be relationship-specific. Jealousy requires evidence. Proposed plans are not automatically accepted. Active conflict changes behavior until repaired, and achieved milestones are never repeated as firsts. Canon corrections retroactively replace contradicted derived state. Story Bible canon is binding; private/secret entries may guide narration but must not become character knowledge without evidence or the Knowledge Ledger. Calendar events are commitments, not permission to skip time. Active arcs and consequences exert pressure until resolved. Stored state is descriptive, not permission to contradict the latest visible turn.`;
}
