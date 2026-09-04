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
  intelligenceState?: Record<string, unknown>;
  developmentState?: Record<string, unknown>;
  relationshipState?: Record<string, unknown>;
  storyChapters?: Array<Record<string, unknown>>;
  activeChapter?: Record<string, unknown>;
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
  characterMind: {
    know: string;
    believe: string;
    misunderstand: string;
    want: string;
    avoid: string;
    wontAdmit: string;
    outsidePriority: string;
    shortGoal: string;
    midGoal: string;
    longGoal: string;
    attachmentPattern: string;
    microvoice: string;
    energy: string;
  };
  temporalEngine: {
    storyNow: string;
    recentElapsed: string;
    upcoming: Array<Record<string, unknown>>;
    instruction: string;
  };
  intensityDirector: {
    recentLevel: number;
    targetBand: string;
    instruction: string;
  };
  driftProtection: {
    anchors: string[];
    recentVoiceShift: string;
    instruction: string;
  };
  storySeason: {
    current: Record<string, unknown>;
    previous: Array<Record<string, unknown>>;
    instruction: string;
  };
  emotionalIntelligence: {
    emotionalCausality: { trigger: string; interpretation: string; emotion: string; behavioralPressure: string };
    anticipation: { next: string; expected: string; feared: string };
    publicPrivateMode: string;
    behavioralMemory: { pattern: string; conflictPattern: string; contradiction: string };
    conflictPersonality: string;
    groupDynamics: Array<Record<string, unknown>>;
    misunderstanding: string;
    slowChange: string;
    sceneMomentum: "hold" | "turn" | "close";
    narrativeCompression: string;
    contradictions: string[];
    privateIntentions: { intention: string; expected: string; feared: string };
    antiRepetition: string[];
    reflection: Record<string, unknown>;
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
  const intelligence = input.intelligenceState && typeof input.intelligenceState === "object" ? input.intelligenceState : {};
  const priorMind = intelligence.character_mind && typeof intelligence.character_mind === "object" ? intelligence.character_mind as Record<string, unknown> : {};
  const development = input.developmentState && typeof input.developmentState === "object" ? input.developmentState : {};
  const relationshipState = input.relationshipState && typeof input.relationshipState === "object" ? input.relationshipState : {};
  const recentIntensity = Math.max(1, Math.min(10, Number(intelligence.intensity_level || 4)));
  const targetBand = activeConflicts.length || activeConsequences.some((item) => Number(item?.weight || 0) >= 4)
    ? "5-8"
    : romanticStory && recentIntensity >= 7
      ? "3-6"
      : drama >= 65
        ? "4-7"
        : "2-5";
  const currentChapter = input.activeChapter && typeof input.activeChapter === "object" ? input.activeChapter : {};
  const pastChapters = (input.storyChapters || []).slice(-4);
  const mindFrom = (key: string, fallback = "") => text((priorMind as Record<string, unknown>)[key] || fallback);
  const priorReflection = intelligence.last_reflection && typeof intelligence.last_reflection === "object" ? intelligence.last_reflection as Record<string, unknown> : {};
  const publicPrivateMode = mode === "digital" ? "digital" : present.length >= 3 ? "public" : present.length <= 2 ? "private" : "mixed";
  const conflictPersonality = text(input.character.conflict_style || input.character.emotional_defense || "react according to established defense and pride");
  const contradictionList = [text(input.character.contradictions), text(development.active_contradiction), mindFrom("contradiction_in_play")].filter(Boolean).slice(0, 4);
  const groupDynamicEvidence = (input.castConnections || []).filter((item) => {
    const from = normalized(item?.from_name), to = normalized(item?.to_name);
    return present.some((name) => normalized(name) === from || normalized(name) === to);
  }).slice(0, 8);
  const sceneMomentum: "hold" | "turn" | "close" = boundaries.length ? "close" : talkOnlyDrought ? "turn" : recentCharacterTurns.length >= 4 && recentActionCount <= 1 ? "turn" : "hold";

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
      instruction: "Give the character ongoing obligations, friendships, work, interests and private priorities implied by these anchors. Their life may inconveniently compete with the relationship: they can be busy, late, distracted, committed elsewhere, or choose another responsibility without this meaning rejection. Use only grounded anchors; never invent a schedule merely to avoid the user. Do not make the character permanently available or optimize their life around the protagonist.",
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
        ? "Choose one grounded opportunity or pressure and make it real IN THIS REPLY. It may be a decision, invitation, reveal, interruption, concise action, arrival, social move, or consequence. Dialogue can satisfy initiative when it contains a real choice, answer, reveal, invitation or refusal. Do not invent props, chores, entrances or busywork merely to prove the scene is moving. Give the user one concrete thing to react to and stop before deciding their response."
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
    characterMind: {
      know: mindFrom("know"),
      believe: mindFrom("believe"),
      misunderstand: mindFrom("misunderstand"),
      want: mindFrom("want", text(development.independent_priority || input.character.core_motivation)),
      avoid: mindFrom("avoid", text(input.character.emotional_defense)),
      wontAdmit: mindFrom("wont_admit"),
      outsidePriority: mindFrom("outside_priority", text(development.independent_priority)),
      shortGoal: mindFrom("short_goal", text(development.independent_priority || input.character.core_motivation)),
      midGoal: mindFrom("mid_goal", text(input.character.core_motivation)),
      longGoal: mindFrom("long_goal", text(input.character.growth_direction || input.character.character_values)),
      attachmentPattern: mindFrom("attachment_pattern", "unknown"),
      microvoice: mindFrom("microvoice", text(development.voice_shift || relationshipState.voice_shift)),
      energy: mindFrom("energy", "steady"),
    },
    temporalEngine: {
      storyNow: text(scene.time_label || "unknown"),
      recentElapsed: text(intelligence.elapsed_since_previous || "unspecified"),
      upcoming: dueCalendarEvents.slice(0, 5),
      instruction: "Treat story time as canon. Distinguish minutes, days, weeks and long absences when the transcript/calendar establishes them. Never call something yesterday, months ago, or soon unless supported. Upcoming commitments may pressure choices, but do not silently jump time or complete them off-screen.",
    },
    intensityDirector: {
      recentLevel: recentIntensity,
      targetBand,
      instruction: "Emotional intensity must breathe. Do not ratchet upward every turn. After a 7-10 beat, prefer decompression, awkward normality, practical behavior or quiet residue unless a visible cause escalates again. Ordinary scenes may sit at 2-4 without being filler.",
    },
    driftProtection: {
      anchors: [input.character.core_motivation, input.character.emotional_defense, input.character.contradictions, input.character.character_values, input.character.voice_avoidances].map(text).filter(Boolean).slice(0, 5),
      recentVoiceShift: text(development.voice_shift || relationshipState.voice_shift),
      instruction: "Compare the next choice to the base motivation, defense, contradictions and voice. Growth may bend behavior but cannot replace the person with a generic nicer, colder, more romantic or more emotionally fluent version. If a recent shift conflicts with the base identity, preserve the identity and make the shift smaller.",
    },
    storySeason: {
      current: currentChapter,
      previous: pastChapters,
      instruction: "Treat chapters as invisible story seasons. A new season requires a durable change in normal life, relationship baseline, location/time era, major goal or social world—not one dramatic line. Inside a season, let motifs and consequences recur lightly without summarizing the arc to the user.",
    },
    livingStoryEngine: {
      mode: livingMode,
      interestProofRequired,
      sceneChangeRequired,
      emotionalCost: "A meaningful choice should cost the character something small but real: time, convenience, pride, social ease, reputation, another opportunity, or the safety of staying emotionally hidden.",
      instruction: "Write one lived beat, not a mini-novel. Answer the user's literal turn first. The character has an independent want and chooses one tactic, but that tactic may be spoken: a decision, reveal, refusal, invitation, admission or joke can move the scene without extra choreography. If interestProofRequired is true, prove interest through one voluntary, character-specific investment or risk now; attraction words, staring, teasing, protectiveness and jealousy alone do not count. If sceneChangeRequired is true, change the activity, access, participants, plan, information or stakes with the smallest natural beat needed. Do not manufacture props or physical business just to show movement. Leave a clean opening for the user without asking them to invent the plot.",
      realityRules: [
        "Desire has behavior: the character arranges, remembers, returns, makes room, risks embarrassment, changes a plan, shares access, tells an inconvenient truth, or chooses the user when another option genuinely exists.",
        "Emotion is not constant intensity. Use contrast: ordinary dialogue, imperfect timing, embarrassment, silence, humor, practical behavior, then one honest pressure point. Strong emotion leaves residue but should not hijack every later line. Do not decorate every beat with weather, objects or body-language detail.",
        "Development is asymmetric. A character can become more trusting while remaining avoidant, more affectionate while still bad at apologies, or more honest while still proud. Never flatten growth into universally nicer, calmer, wiser behavior.",
        "People relapse under pressure. Established defenses, habits and verbal instincts may briefly return when stress is high, but the relapse must reflect accumulated growth rather than reset canon to day one.",
        "Learning the protagonist is not optimization. Remember preferences, boundaries and patterns naturally, but the character may still disagree, forget a minor detail, misread an ambiguous situation, have incompatible wants or say no.",
        "NPCs are people, not jealousy props. Give an active NPC a separate goal, relationship and consequence; let them interrupt, disagree, need something, invite someone or change the plan.",
        "Conflict must threaten something specific. Nobody fights merely because the story needs drama; incompatible goals, loyalty, reputation, fear, bad timing, secrecy or a broken commitment create the collision.",
        "Coincidences may open a scene once. After that, consequences come from visible choices. Police, rivals, family, friends and authority follow causes already present in the world.",
        "Do not resolve the emotional consequence in the same beat that creates it. Let awkwardness, jealousy, hurt, desire, guilt or doubt alter later behavior until addressed on-page.",
        "Romantic initiative never means coercion. A refusal or boundary ends that tactic immediately; the character may feel and choose privately, but cannot pressure or engineer a workaround.",
      ],
    },
    emotionalIntelligence: {
      emotionalCausality: {
        trigger: mindFrom("emotion_trigger"),
        interpretation: mindFrom("emotion_interpretation"),
        emotion: mindFrom("current_emotion"),
        behavioralPressure: mindFrom("behavioral_pressure"),
      },
      anticipation: { next: mindFrom("anticipated_next"), expected: mindFrom("expected_outcome"), feared: mindFrom("feared_outcome") },
      publicPrivateMode,
      behavioralMemory: { pattern: mindFrom("behavioral_pattern", text(development.private_pattern)), conflictPattern: mindFrom("conflict_pattern", conflictPersonality), contradiction: mindFrom("contradiction_in_play", contradictionList[0] || "") },
      conflictPersonality,
      groupDynamics: groupDynamicEvidence,
      misunderstanding: mindFrom("misunderstand"),
      slowChange: text(development.retained_growth || development.voice_shift || relationshipState.voice_shift),
      sceneMomentum,
      narrativeCompression: "Compress only uneventful transit/routine after the live interaction is complete. Never summarize over an unresolved user choice, conflict, promise, intimacy milestone or active conversation.",
      contradictions: contradictionList,
      privateIntentions: { intention: mindFrom("private_intention"), expected: mindFrom("expected_outcome"), feared: mindFrom("feared_outcome") },
      antiRepetition: [...recentPatterns, text(priorReflection.avoid_repeat)].filter(Boolean).slice(0, 6),
      reflection: priorReflection,
    },
    relationshipEngines: {
      chemistry: {
        profile: chemistry,
        instruction: "Make this relationship recognizable without repeating a gimmick. Reuse at most one established joke, gesture or meaningful place in a scene; create new chemistry through choices, timing, mutual history and vulnerability. Chemistry must have contrast: ease can coexist with irritation, attraction with embarrassment, trust with one unresolved doubt. Never copy another character's romantic pattern and never make every interaction romantic.",
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
          ? "Carry the conflict residue into word choice, access, trust and behavior. Do not reset to normal. Repair must match the character: an imperfect attempt, concrete amends, honest admission or changed action—not therapy language or one apology that erases everything. A repair attempt can partially fail, be mistimed, protect pride, or solve the practical issue before the emotional one. Improvement must be demonstrated across later behavior, not declared in one scene."
          : "Conflict needs a concrete incompatible goal, witnessed slight, broken promise or consequential misunderstanding. Never create cruelty without motive.",
      },
      milestones: {
        achieved: milestones,
        instruction: "Treat achieved firsts as canon and never replay them as firsts. Do not rush a new milestone simply to fill a turn; earn it through accumulated behavior and the current relationship phase. A milestone changes expectations afterward, but does not erase defenses, awkwardness or old habits overnight. record only events that actually occur on-page.",
      },
      choreography: {
        location: text(scene.location || "unknown"), present, activity: sceneActivity, objects: sceneObjects,
        instruction: "Track physical reality silently. Narrate movement only when it changes distance, access, contact, participants or stakes. Do not inventory props, assign everyone a task, or choreograph routine walking/looking/handling objects just to make the scene feel cinematic. Dialogue may happen with little or no movement. Never teleport people or move the user without authored action.",
      },
    },
  };
}

export function storyContractPrompt(contract: StoryContract) {
  const take = (value: unknown, maximum = 6) => Array.isArray(value) ? value.slice(0, maximum) : [];
  const pick = (value: Record<string, unknown> = {}, keys: string[] = []) => Object.fromEntries(
    keys.map((key) => [key, value?.[key]]).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );

  // The full engine remains available to deterministic persistence, but the model
  // gets a compact turn contract. This keeps the useful story brain without sending
  // a mini database dump on every message.
  const compact = {
    finalState: contract.finalState,
    userAuthored: contract.userAuthored,
    characterBehavior: {
      socialEcosystems: take(contract.characterBehavior.socialEcosystems, 3),
      voiceAnchors: take(contract.characterBehavior.voiceAnchors, 4),
      independence: contract.characterBehavior.independence,
      initiative: contract.characterBehavior.initiative,
    },
    supportingCast: take(contract.supportingCast, 4).map((item) => pick(item as Record<string, unknown>, ["name", "role", "relationship", "current_dynamic", "goals", "presence", "status"])),
    turnObjective: contract.turnObjective,
    conversationQuality: contract.conversationQuality,
    independentLife: { anchors: take(contract.independentLife.anchors, 4) },
    canon: {
      bible: take(contract.storyAuthority.bible, 4).map((item) => pick(item as Record<string, unknown>, ["category", "title", "content", "authority"])),
      castConnections: take(contract.storyAuthority.castConnections, 4).map((item) => pick(item as Record<string, unknown>, ["from_name", "to_name", "relationship", "visibility"])),
      calendar: take(contract.storyAuthority.calendar, 3).map((item) => pick(item as Record<string, unknown>, ["title", "story_time", "details", "participants", "status"])),
      corrections: take(contract.storyAuthority.corrections, 4),
    },
    dynamics: {
      arcs: take(contract.storyDynamics.activeArcs, 4).map((item) => pick(item as Record<string, unknown>, ["title", "summary", "kind", "status", "stakes", "next_pressure", "participants"])),
      knowledge: take(contract.storyDynamics.knowledgeLedger, 6).map((item) => pick(item as Record<string, unknown>, ["character_name", "subject", "knowledge", "status", "secret"])),
      consequences: take(contract.storyDynamics.activeConsequences, 4).map((item) => pick(item as Record<string, unknown>, ["title", "cause", "effect", "status", "weight", "participants"])),
      dueEvents: take(contract.storyDynamics.dueCalendarEvents, 3).map((item) => pick(item as Record<string, unknown>, ["title", "story_time", "details", "participants", "status"])),
    },
    initiative: {
      required: contract.initiativePlan.required,
      intensity: contract.initiativePlan.intensity,
      talkOnlyDrought: contract.initiativePlan.talkOnlyDrought,
      options: take(contract.initiativePlan.availablePressure, 2),
    },
    mind: contract.characterMind,
    temporal: { storyNow: contract.temporalEngine.storyNow, recentElapsed: contract.temporalEngine.recentElapsed, upcoming: take(contract.temporalEngine.upcoming, 3).map((item) => pick(item as Record<string, unknown>, ["title", "story_time", "details", "participants", "status"])) },
    intensity: contract.intensityDirector,
    drift: contract.driftProtection,
    season: contract.storySeason,
    living: {
      mode: contract.livingStoryEngine.mode,
      interestProofRequired: contract.livingStoryEngine.interestProofRequired,
      sceneChangeRequired: contract.livingStoryEngine.sceneChangeRequired,
      emotionalCost: contract.livingStoryEngine.emotionalCost,
    },
    emotionalIntelligence: {
      emotionalCausality: contract.emotionalIntelligence.emotionalCausality,
      anticipation: contract.emotionalIntelligence.anticipation,
      publicPrivateMode: contract.emotionalIntelligence.publicPrivateMode,
      behavioralMemory: contract.emotionalIntelligence.behavioralMemory,
      conflictPersonality: contract.emotionalIntelligence.conflictPersonality,
      groupDynamics: take(contract.emotionalIntelligence.groupDynamics, 5).map((item) => pick(item as Record<string, unknown>, ["from_name","to_name","relationship","visibility"])),
      misunderstanding: contract.emotionalIntelligence.misunderstanding,
      slowChange: contract.emotionalIntelligence.slowChange,
      sceneMomentum: contract.emotionalIntelligence.sceneMomentum,
      contradictions: take(contract.emotionalIntelligence.contradictions, 4),
      privateIntentions: contract.emotionalIntelligence.privateIntentions,
      antiRepetition: take(contract.emotionalIntelligence.antiRepetition, 5),
      reflection: contract.emotionalIntelligence.reflection,
    },
    relationship: {
      chemistry: pick((contract.relationshipEngines.chemistry?.profile || {}) as Record<string, unknown>, ["character_name", "signature", "chemistry_score", "trust_score", "tension_score", "notes"]),
      jealousy: { stage: contract.relationshipEngines.jealousy?.stage, evidence: take(contract.relationshipEngines.jealousy?.evidence, 3) },
      plans: take(contract.relationshipEngines.plans?.active, 3).map((item) => pick(item as Record<string, unknown>, ["title", "activity", "participants", "status", "story_time"])),
      conflicts: take(contract.relationshipEngines.conflictAndRepair?.active, 3).map((item) => pick(item as Record<string, unknown>, ["title", "cause", "positions", "intensity", "status", "resolution_need"])),
      milestones: take(contract.relationshipEngines.milestones?.achieved, 4).map((item) => pick(item as Record<string, unknown>, ["milestone_type", "title", "details", "created_at"])),
      choreography: contract.relationshipEngines.choreography,
    },
  };

  return `TURN CONTRACT — compact canon and story pressure\n${JSON.stringify(compact)}\n\nUse this order: visible canon → user ownership → physical reality → character mind/perception → character voice → one earned story beat. Answer the latest turn before subtext. If initiative.required is true, MAKE ONE CONCRETE CHOICE IN THIS REPLY without deciding the user's response. Dialogue can satisfy initiative when it contains a real decision, invitation, refusal, reveal, request or commitment; empty banter cannot. If living.interestProofRequired is true, prove interest through a voluntary choice with a real cost, not staring or narration. If living.sceneChangeRequired is true, something materially changes on-page. Jealousy needs listed evidence. Plans are not accepted until the user accepts them. Active conflicts retain residue until repaired. Achieved milestones are never replayed as firsts. Treat mind.believe and mind.misunderstand as SUBJECTIVE, never as canon. Track time literally, let intensity rise and fall, and protect identity from drift. Emotional causality must be event → interpretation → feeling → pressure, not mood roulette. Prefer subtext over self-explanation when the character would protect pride. Respect public/private mode, learned behavioral patterns, conflict personality and contradictions. Use emotionalIntelligence.sceneMomentum to know when to hold, turn or close a scene, but never skip a pending user choice. Vary response STRUCTURE as well as wording. Stored state never overrides the latest visible user turn.`;
}
