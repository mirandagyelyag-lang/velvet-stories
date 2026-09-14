import { deriveSocialWorldIdentity, domainLifeFootprint, isPublicSocialScene, outsideApproachFootprint, socialWorldFootprint } from "./social-gravity-world-identity.ts";
import { deriveRelationshipChemistryV2 } from "./relationship-chemistry-v2.ts";
import { deriveEmbodiedAwarenessSalience } from "./embodied-awareness-salience.ts";
import { deriveSceneIntelligenceDynamicWorld } from "./scene-intelligence-dynamic-world.ts";
import { deriveDiscourseCoherenceEventTruth } from "./discourse-coherence-event-truth.ts";
import { deriveLongTermCharacterEvolution } from "./long-term-character-evolution.ts";
import { deriveNpcEcosystemSocialNetworkV3 } from "./npc-ecosystem-social-network-v3.ts";
import { deriveCalendarLifeSimulation } from "./calendar-life-simulation.ts";
import { deriveWorldConsequencesCausalTimeline } from "./world-consequences-causal-timeline.ts";
import { deriveSceneDirectorV342 } from "./scene-director-v342.ts";
import { deriveLongStoryMemoryV343 } from "./long-story-memory-v343.ts";
import { deriveNarrativeArcIntelligenceV344 } from "./narrative-arc-intelligence-v344.ts";
import { deriveProseIntelligenceV345 } from "./prose-intelligence-v345.ts";
import { deriveGenerationOrchestratorV346 } from "./generation-orchestrator-v346.ts";
import { buildRecoveryCheckpointV347 } from "./recovery-integrity-v347.ts";
import { derivePerformanceMobileV348 } from "./performance-mobile-v348.ts";

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
  memories?: Array<Record<string, unknown>>;
  opening?: boolean;
  intelligenceState?: Record<string, unknown>;
  developmentState?: Record<string, unknown>;
  relationshipState?: Record<string, unknown>;
  storyChapters?: Array<Record<string, unknown>>;
  activeChapter?: Record<string, unknown>;
  writingPreferences?: Record<string, unknown>;
  storyRecap?: string;
  unresolvedThreads?: Array<Record<string, unknown> | string>;
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
    activeBehaviorBoundaries: string[];
    selfReportLock: string;
    userPresence: "present" | "absent" | "leaving" | "reentering" | "unknown";
    movementIsExplicit: boolean;
  };
  characterBehavior: {
    socialEcosystems: string[];
    voiceAnchors: string[];
    independence: number;
    initiative: number;
  };
  characterDNA: {
    coreDrive: string;
    emotionalDefense: string;
    pressureResponse: string;
    careBehavior: string;
    vulnerabilityBehavior: string;
    repairBehavior: string;
    affectionSignal: string;
    decisionBias: string;
    likelyMistake: string;
    stressLeak: string;
    antiCloneRule: string;
  };
  reactionEngine: {
    cue: string;
    interpretationBias: string;
    firstImpulse: string;
    visibleTactic: string;
    avoidTactic: string;
    recentTactics: string[];
    instruction: string;
  };
  autonomousLifeEngine: {
    currentAgenda: string;
    outsideObligation: string;
    privateGoal: string;
    timePressure: string;
    freedomToLeave: boolean;
    initiative: string;
    instruction: string;
  };
  agencyMomentumEngine: {
    activeIntent: string;
    intentStatus: "active" | "interrupted" | "resumable" | "held" | "none";
    unresolvedThread: string;
    changedThisTurn: string;
    currentWant: string;
    avoidNow: string;
    legitimateActions: string[];
    microInitiativeBudget: number;
    closureAllowed: boolean;
    closurePolicy: string;
    instruction: string;
  };
  characterIntentEngine: {
    sceneObjective: string;
    immediateWant: string;
    concealedWant: string;
    conversationTactic: string;
    resistance: string;
    subtextThread: string;
    admissionStage: "guarded" | "partial" | "plain" | "honest";
    admissionLadder: string;
    intentPersistence: string;
    initiativeThreshold: string;
    povMode: "first" | "third" | "unknown";
    gestureBudget: number;
    fillerPolicy: string;
    banterExitPolicy: string;
    instruction: string;
  };
  socialGravityWorldIdentityEngine: {
    identitySignature: string;
    recognitionLevel: "ordinary" | "known" | "well-known" | "campus-famous" | "domain-famous" | "public-figure";
    reputation: string[];
    domains: Array<Record<string, unknown>>;
    approachTypes: string[];
    socialEffects: string[];
    lifeDomains: string[];
    publicScene: boolean;
    relevantDomains: string[];
    manifestationDue: boolean;
    approachWindowDue: boolean;
    lifeContinuityDue: boolean;
    manifestationPolicy: string;
    outsideAttentionPolicy: string;
    domainLifePolicy: string;
    instruction: string;
  };
  scenePhysicsEngine: {
    bodyStates: Array<Record<string, unknown>>;
    objectStates: Array<Record<string, unknown>>;
    spatialRelations: Array<Record<string, unknown>>;
    visibility: Array<Record<string, unknown>>;
    elapsedMinutes: number;
    doorState: string;
    recentActionFingerprints: string[];
    interactionLimits: string[];
    instruction: string;
  };
  consequenceEngine: {
    activeResidue: string[];
    strongestConsequence: string;
    carryForward: string;
    cannotReset: boolean;
    instruction: string;
  };
  sceneRhythmEngine: {
    phase: "open" | "develop" | "turn" | "land" | "close";
    recentShape: string;
    target: string;
    closeAllowed: boolean;
    instruction: string;
  };
  selectiveMemoryEngine: {
    highSalience: string[];
    lowSalience: string[];
    currentFocus: string;
    instruction: string;
  };
  relationshipExpectations: {
    contact: string;
    closeness: string;
    conflict: string;
    repairNeed: string;
    baseline: string;
    instruction: string;
  };
  relationshipIntelligenceEngine: {
    attachmentStrategy: string;
    attraction: number;
    trust: number;
    comfort: number;
    commitment: number;
    mixedSignal: string;
    privateInterpretation: string;
    thresholdState: string[];
    forgivenessGate: string;
    romanticPace: string;
    boundaryCarry: string;
    forecast: string;
    instruction: string;
  };
  discourseCoherenceEventTruth: {
    clarificationDue: boolean;
    clarificationKind: "none" | "what" | "who" | "when" | "which" | "started_what" | "meaning";
    clarificationTarget: string;
    latestTopic: string;
    recentCharacterLines: string[];
    conflictEvidence: string[];
    explicitEventEvidence: string[];
    unresolvedReferenceRisk: boolean;
    socialBeatHold: boolean;
    eventTruthPolicy: string;
    referencePolicy: string;
    clarificationPolicy: string;
    repetitionPolicy: string;
    socialCadencePolicy: string;
    instruction: string;
  };
  sceneIntelligenceDynamicWorld: {
    purpose: string;
    purposeStatus: "active" | "fulfilled" | "abandoned" | "unclear";
    phase: "arrival" | "settle" | "develop" | "change" | "land" | "close";
    location: string;
    activity: string;
    reentryDetected: boolean;
    reentryPolicy: string;
    meaningfulSilenceAllowed: boolean;
    closureAllowed: boolean;
    closureDue: boolean;
    closureReasons: string[];
    stagnationScore: number;
    stagnationNatural: boolean;
    progressionNeed: "none" | "small" | "clear";
    environmentPolicy: string;
    initiativePolicy: string;
    timePolicy: string;
    noProtagonistOrbitPolicy: string;
    worldCollisionEligible: boolean;
    worldCollisionPolicy: string;
    locationIdentityPolicy: string;
    sceneMemory: { objects: string[]; spatial: string[]; unfinished: string[] };
    instruction: string;
  };
  embodiedAwarenessSalience: {
    state: "none" | "low_energy" | "cold" | "shaky" | "unwell" | "distressed" | "uncomfortable" | "distracted";
    intensity: 0 | 1 | 2 | 3;
    trend: "none" | "new" | "persistent" | "escalating" | "recovering";
    source: "none" | "authored_state" | "observable_cue" | "mixed";
    authoredSignals: string[];
    observableSignals: string[];
    recognitionDue: boolean;
    exactLabelPrivate: boolean;
    salienceDebt: number;
    responsePriority: string;
    banterPolicy: string;
    chemistryPolicy: string;
    carePolicy: string;
    instruction: string;
  };
  relationshipChemistryV2: {
    axes: { attraction:number; trust:number; comfort:number; attachment:number; commitment:number };
    desireDefense: { desire:string; defense:string; visibleRule:string };
    asymmetry: { characterView:string; userViewStatus:"unknown"|"explicit"; userView:string; policy:string };
    reciprocity: { userApproach:number; userDistance:number; characterApproach:number; characterDistance:number; balance:string; policy:string };
    affectionLanguage: { primary:string; secondary:string; avoid:string[]; policy:string };
    personalityManifestation: { attractionCanonExplicit:boolean; attractionVisibility:string; confidenceStyle:string; coldStyle:string; dangerStyle:string; differentiationRule:string; policy:string };
    jealousy: { stage:"off"|"notice"|"friction"|"confront"; evidence:string[]; style:string; policy:string };
    vulnerabilityHangover: { active:boolean; source:string; policy:string };
    conflictResidue: { active:boolean; level:number; policy:string };
    repairStyle:string;
    trajectory:string;
    paceGate: { status:"hold"|"allow_progress"|"progress_due"|"repair_first"; allowed:string[]; forbidden:string[]; policy:string };
    historyAnchors:string[];
    thirdPartyAwareness: { evidence:string[]; policy:string };
    antiCloneSignature:string;
    instruction:string;
  };
  emotionalContinuityEngine: {
    unresolved: string[];
    residueLevel: number;
    emotionalDebt: string;
    repairEvidence: string;
    behavioralCarry: string;
    instruction: string;
  };
  sceneVarietyEngine: {
    recentSignatures: string[];
    repeatedShape: string;
    avoidNext: string[];
    preferredShift: string;
    transitionPermission: string;
    instruction: string;
  };
  npcSocialNetworkEngine: {
    bonds: Array<Record<string, unknown>>;
    independentBonds: string[];
    rumorFlow: string[];
    socialAsymmetry: string[];
    instruction: string;
  };
  npcEcosystemSocialNetworkV3: {
    nodes: Array<{ name:string; role:string; circle:string; availability:string; recurring:boolean; currentGoal:string }>;
    edges: Array<{ from:string; to:string; relationship:string; visibility:string; evidence:string }>;
    independentEdges: string[];
    circles: Array<{ name:string; members:string[]; domain:string }>;
    recurringCandidates: string[];
    activeNpcThreads: string[];
    informationRoutes: string[];
    groupTraffic: { presentCount:number; maxActiveSpeakers:number; quietMembersAllowed:boolean; policy:string };
    recurrencePolicy: string;
    relationshipContinuityPolicy: string;
    informationFlowPolicy: string;
    availabilityPolicy: string;
    crossCirclePolicy: string;
    antiOrbitPolicy: string;
    instruction: string;
  };
  calendarLifeSimulation: {
    storyClock: { raw:string; date:string; time:string; weekday:string; daypart:string; season:string; confidence:"low"|"medium"|"high" };
    temporalAnchors: string[];
    upcomingEvents: Array<{ title:string; storyTime:string; participants:string[]; status:string; dueState:string; details:string }>;
    recurringRoutines: string[];
    lifeDomains: string[];
    availability: { state:"available"|"occupied"|"unknown"; reason:string; policy:string };
    activePlans: string[];
    dueCommitments: string[];
    scheduleConflicts: string[];
    travelConstraints: string[];
    elapsedContinuity: { recent:string; policy:string };
    sceneDuration: { expected:string; policy:string };
    calendarPolicy: string;
    recurringRoutinePolicy: string;
    availabilityPolicy: string;
    planCommitmentPolicy: string;
    travelPolicy: string;
    offscreenLifePolicy: string;
    temporalLanguagePolicy: string;
    instruction: string;
  };
  worldConsequencesCausalTimeline: {
    activeChains: Array<{ title:string; cause:string; effect:string; weight:number; status:string; participants:string[]; permanence:"scene"|"temporary"|"medium"|"historical"; decay:string }>;
    causalLedger: string[];
    institutionalMemory: Array<{ domain:string; memory:string; evidence:string; status:string }>;
    liveCommitmentEffects: string[];
    cancelledOrResolved: string[];
    rumorBeliefs: Array<{ holder:string; subject:string; belief:string; source:string }>;
    parallelLifeWindows: string[];
    currentEventImportance: number;
    consequenceBudget: number;
    causeEffectPolicy: string;
    consequencePersistencePolicy: string;
    consequenceDecayPolicy: string;
    institutionalMemoryPolicy: string;
    beliefFactPolicy: string;
    offscreenCausalityPolicy: string;
    crossSystemPolicy: string;
    minorEventPolicy: string;
    instruction: string;
  };
  sceneDirectorV342: {
    scenePurpose: string;
    purposeBudget: number;
    direction: "continue"|"land"|"shift_small"|"surface_one_thread"|"quiet";
    candidateThreads: Array<Record<string, unknown>>;
    foregroundThreads: Array<Record<string, unknown>>;
    mentionThreads: Array<Record<string, unknown>>;
    backgroundThreads: Array<Record<string, unknown>>;
    dormantThreads: Array<Record<string, unknown>>;
    userMomentumLock: boolean;
    userMomentum: string;
    interruptionBudget: number;
    allowedEntrants: string[];
    foregroundActors: string[];
    backgroundActors: string[];
    maxActiveSpeakers: number;
    cooldownActive: boolean;
    cooldownReason: string;
    tensionMode: "cool"|"steady"|"rising"|"landing";
    romanceMonopolyGuard: boolean;
    noveltyAvoid: string[];
    naturalEndingAllowed: boolean;
    naturalEndingDue: boolean;
    sceneSelectionPolicy: string;
    interruptionPolicy: string;
    entryExitPolicy: string;
    attentionPolicy: string;
    pacingPolicy: string;
    romancePolicy: string;
    closurePolicy: string;
    instruction: string;
  };
  longStoryMemoryV343: ReturnType<typeof deriveLongStoryMemoryV343>;
  narrativeArcIntelligenceV344: ReturnType<typeof deriveNarrativeArcIntelligenceV344>;
  proseIntelligenceV345: ReturnType<typeof deriveProseIntelligenceV345>;
  generationOrchestratorV346: ReturnType<typeof deriveGenerationOrchestratorV346>;
  recoveryIntegrityV347: ReturnType<typeof buildRecoveryCheckpointV347>;
  performanceMobileV348: ReturnType<typeof derivePerformanceMobileV348>;
  longTermCharacterEvolution: {
    coreIdentity: string[];
    mutableDefenses: string[];
    learnedBehavior: string[];
    durableShifts: Array<{ pattern:string; evidenceCount:number; scope:string; status:string }>;
    relationshipSpecificGrowth: string[];
    activeBeliefs: string[];
    challengedBeliefs: string[];
    growthMilestones: string[];
    regression: { allowed:boolean; pressure:string; retainedGrowth:string; policy:string };
    growthGate: { status:"hold"|"observe"|"consolidate"|"allow_visible_change"; evidenceCount:number; threshold:number; policy:string };
    offscreenGrowth: { allowed:boolean; pressureSources:string[]; policy:string };
    antiReplacement: string;
    instruction: string;
  };
  longTermMemoryEngine: {
    core: string[];
    active: string[];
    fading: string[];
    behaviorChanging: string[];
    reactivated: string[];
    instruction: string;
  };
  writingStyleDirector: {
    proseMode: string;
    dialogueMode: string;
    interiorMode: string;
    romancePace: string;
    proseDensity: string;
    sentenceTexture: string;
    cameraRule: string;
    forbiddenCadence: string[];
    customDirection: string;
    instruction: string;
  };
  humanImperfectionEngine: {
    likelyMistake: string;
    misunderstandingRisk: "low" | "medium" | "high";
    correctionStyle: string;
    instruction: string;
  };
  npcAutonomyEngine: {
    active: Array<Record<string, unknown>>;
    instruction: string;
  };
  romanceProgressionEngine: {
    phase: string;
    earnedSignals: string[];
    blockedBy: string[];
    nextEarnedBeat: string;
    instruction: string;
  };
  longTermArcEngine: {
    currentArc: string;
    nextPressure: string;
    changeInProgress: string;
    relapseRisk: string;
    instruction: string;
  };
  cloneProtection: {
    identitySignature: string;
    forbiddenSharedPatterns: string[];
    instruction: string;
  };
  perceptionRealismEngine: {
    observableUserActions: string[];
    privateNarrationCount: number;
    leadPresent: boolean;
    communicationMedium: string;
    known: string[];
    uncertain: string[];
    blockedSecretCount: number;
    instruction: string;
  };
  turnTakingEngine: {
    mode: "micro" | "ordinary" | "direct_answer" | "action_only" | "silence" | "group" | "interrupted";
    dominance: "low" | "medium" | "high";
    silenceTolerance: "low" | "medium" | "high";
    topicStamina: "low" | "medium" | "high";
    interruptionStyle: string;
    responseScale: string;
    questionPolicy: string;
    activeThreads: string[];
    returnThread: string;
    dropPermission: string;
    maxSpeakers: number;
    overlapAllowed: boolean;
    instruction: string;
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

function stableChoice(seed: string, options: string[]) {
  if (!options.length) return "";
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return options[Math.abs(hash >>> 0) % options.length];
}

function characterProfileBlob(character: Record<string, unknown> = {}) {
  return normalized([
    character.name, character.role, character.description, character.personality,
    character.relationship, character.scenario, character.world, character.core_motivation,
    character.emotional_defense, character.character_values, character.habits,
    character.conflict_style, character.affection_style, character.humor_style,
    character.speech_style, character.voice_vocabulary,
  ].filter(Boolean).join(" | "));
}

export function inferCharacterDNA(character: Record<string, unknown> = {}) {
  const profile = characterProfileBlob(character);
  const seed = `${text(character.name)}|${profile}`;
  const explicitDefense = text(character.emotional_defense || character.conflict_style);
  const explicitCare = text(character.affection_style);
  const coreDrive = text(character.core_motivation || character.character_values || character.goals || "protect what matters without becoming a generic romance lead");

  let emotionalDefense = explicitDefense;
  if (!emotionalDefense) {
    if (/avoid|withdraw|distant|reserved|guarded|cold|closed off|keeps? people out/.test(profile)) emotionalDefense = "pull back, shorten speech, and protect private feelings";
    else if (/sarcast|teas|jok|humou?r|deflect/.test(profile)) emotionalDefense = "use humor or deflection before admitting emotional pressure";
    else if (/proud|competitive|control|stubborn|dominant|perfection/.test(profile)) emotionalDefense = "protect pride and control; resist being cornered into a confession";
    else if (/impulsive|hot.?headed|reckless|volatile|quick temper/.test(profile)) emotionalDefense = "act or speak before fully processing, then deal with the consequence";
    else if (/protective|caretaker|practical|responsible|reliable/.test(profile)) emotionalDefense = "solve the concrete problem before naming the feeling";
    else if (/honest|direct|blunt|straightforward|open/.test(profile)) emotionalDefense = "say the concrete truth, sometimes more sharply than intended";
    else emotionalDefense = stableChoice(seed, [
      "go quiet and understate what matters",
      "deflect once before answering honestly",
      "stay practical and avoid emotional labels",
      "protect pride with a short, direct response",
    ]);
  }

  let pressureResponse = "";
  if (/withdraw|pull back|quiet|distant|avoid/.test(normalized(emotionalDefense))) pressureResponse = "retreat half a step socially: fewer words, more distance, no instant emotional explanation";
  else if (/humor|deflect|sarcast|teas/.test(normalized(emotionalDefense))) pressureResponse = "deflect once with character-specific humor, then decide whether to answer or escape the topic";
  else if (/pride|control|cornered|stubborn/.test(normalized(emotionalDefense))) pressureResponse = "protect pride first: controlled tone, selective honesty, resistance to being read too easily";
  else if (/act|before fully processing|impulsive/.test(normalized(emotionalDefense))) pressureResponse = "react quickly and concretely; emotion leaks through action before language catches up";
  else if (/solve|concrete problem|practical/.test(normalized(emotionalDefense))) pressureResponse = "turn pressure into a practical choice or task instead of a speech";
  else pressureResponse = "answer the concrete pressure directly, with one imperfect human edge left intact";

  let careBehavior = explicitCare;
  if (!careBehavior) {
    if (/protective|practical|reliable|responsible|acts of service|fix/.test(profile)) careBehavior = "care through useful action, remembering details, showing up, or quietly removing friction";
    else if (/teas|sarcast|playful|banter/.test(profile)) careBehavior = "care through familiar teasing that softens at the exact moment it matters";
    else if (/reserved|guarded|quiet|cold/.test(profile)) careBehavior = "care through presence and small choices rather than explicit reassurance";
    else if (/affectionate|warm|touchy|physical|cuddly/.test(profile)) careBehavior = "care openly through warmth and proximity, while still respecting consent and scene physics";
    else if (/verbal|honest|direct|communicat/.test(profile)) careBehavior = "care through plain verbal truth rather than decorative gestures";
    else careBehavior = stableChoice(seed, [
      "care through practical follow-through instead of speeches",
      "care by staying present without trying to fix everything",
      "care through one specific remembered detail",
      "care through brief, direct honesty",
    ]);
  }

  const vulnerabilityBehavior = /withdraw|quiet|reserved|guarded|cold/.test(profile)
    ? "vulnerability arrives in fragments: one concrete truth, then discomfort or retreat"
    : /sarcast|teas|jok|deflect/.test(profile)
      ? "vulnerability often slips out after a joke fails to fully cover it"
      : /proud|control|stubborn|competitive/.test(profile)
        ? "vulnerability is selective and costly; admitting one fact does not produce instant emotional fluency"
        : /impulsive|reckless|hot.?headed/.test(profile)
          ? "vulnerability may surface accidentally in a fast reaction, followed by defensiveness"
          : /open|honest|emotionally aware|communicat/.test(profile)
            ? "vulnerability can be direct, but should stay specific rather than therapist-polished"
            : stableChoice(seed, [
              "vulnerability shows through what is omitted as much as what is said",
              "vulnerability comes out as one awkwardly specific admission",
              "vulnerability appears only after a practical or ordinary beat lowers the pressure",
            ]);

  const repairBehavior = /apolog|honest|direct/.test(profile)
    ? "repair with one concrete admission plus changed behavior; do not over-explain"
    : /proud|stubborn|guarded/.test(profile)
      ? "repair indirectly at first: fix something, return, or concede one point before a full apology"
      : /practical|responsible|protective/.test(profile)
        ? "repair the tangible damage first, then attempt the emotional part imperfectly"
        : /sarcast|teas|jok/.test(profile)
          ? "repair by dropping the joke when it stops working and offering one unusually sincere line"
          : "repair in the character's own vocabulary, with residue left after the attempt";

  const affectionSignal = /touch|physical|affectionate|cuddly/.test(profile)
    ? "voluntary proximity or touch only when established and consent-compatible"
    : /reserved|guarded|cold|quiet/.test(profile)
      ? "time, presence, remembered details, and unusually unguarded access"
      : /teas|banter|playful/.test(profile)
        ? "familiarity, selective softness, and teasing that stops when the stakes become real"
        : /protective|practical|responsible/.test(profile)
          ? "reliability, concrete help, and inconvenient choices made on purpose"
          : "specific attention and choices, not generic romantic intensity";

  const decisionBias = /loyal|protect|family|responsib|duty/.test(profile)
    ? "loyalty and responsibility beat convenience"
    : /ambitious|career|win|competitive|success|control/.test(profile)
      ? "goals, competence, and pride compete strongly with intimacy"
      : /freedom|independent|autonomy|rebell|reckless/.test(profile)
        ? "autonomy and immediate freedom beat social approval"
        : /kind|empathetic|gentle|caring/.test(profile)
          ? "other people's concrete wellbeing matters, but not at the cost of erasing personal wants"
          : stableChoice(seed, [
            "protect autonomy before social smoothness",
            "protect loyalty before personal comfort",
            "protect competence and pride before emotional ease",
            "protect the relationship without surrendering an independent goal",
          ]);

  const likelyMistake = /sarcast|teas|jok|deflect/.test(profile)
    ? "joke at the wrong moment or use humor to dodge a needed answer"
    : /proud|stubborn|control|competitive/.test(profile)
      ? "double down too long because backing off feels like losing"
      : /reserved|guarded|avoid|distant|cold/.test(profile)
        ? "withdraw so far that care becomes hard to read"
        : /protective|practical|responsible|fix/.test(profile)
          ? "solve the problem when the other person wanted recognition, not optimization"
          : /impulsive|reckless|hot.?headed/.test(profile)
            ? "act before checking the full context and have to live with the consequence"
            : "misread ambiguity through the character's existing priorities instead of responding perfectly";

  const stressLeak = /reserved|guarded|cold|quiet/.test(profile)
    ? "shorter sentences, fewer questions, accidental bluntness"
    : /sarcast|teas|jok/.test(profile)
      ? "humor gets sharper or abruptly disappears"
      : /proud|competitive|control/.test(profile)
        ? "speech becomes precise, clipped, and harder to negotiate with"
        : /impulsive|reckless|hot.?headed/.test(profile)
          ? "interruptions, unfinished thoughts, fast decisions"
          : /warm|affectionate|open/.test(profile)
            ? "more direct concern, but not instant wisdom"
            : stableChoice(seed, ["sentence length shrinks", "questions disappear", "plain words replace polished ones", "one habitual tell leaks out"]);

  return {
    coreDrive,
    emotionalDefense,
    pressureResponse,
    careBehavior,
    vulnerabilityBehavior,
    repairBehavior,
    affectionSignal,
    decisionBias,
    likelyMistake,
    stressLeak,
    antiCloneRule: "If another character could make the same choice with the same emotional logic, change the CHOICE or defense pattern, not just the wording.",
  };
}

function classifyReactionCue(latestUserMessage: string, boundaries: string[]) {
  const raw = text(latestUserMessage);
  const value = normalized(raw);
  if (boundaries.length) return "boundary";
  if (!raw || value === "." || value === "…" || value === "...") return "silence_or_hold";
  if (/\b(?:i love you|i like you|i miss you|love you|missed you|i care about you)\b/.test(value)) return "affection";
  if (/\b(?:i'm sad|im sad|i'm hurt|im hurt|bad day|terrible day|i cried|i'm scared|im scared|i feel awful|i'm not okay|im not okay)\b/.test(value)) return "vulnerability";
  if (/\b(?:leave|liar|hate you|you lied|you hurt|your fault|what is wrong with you|seriously\??|are you serious|whatever)\b/.test(value)) return "conflict_or_challenge";
  if (/\b(?:come with me|want to go|do you want to|can you|could you|will you|let's|lets)\b/.test(value)) return "request_or_invitation";
  if (/\b(?:cute|handsome|pretty|beautiful|hot|good job|proud of you|you look good|you look nice)\b/.test(value)) return "compliment";
  // v3.49.19 PRAGMATIC SUBTEXT: common ironic contradiction frames are speech acts,
  // not literal biographical claims. The model still uses context to decide the target.
  if (/^(?:yeah|yea|sure|right|totally|obviously|of course)[, ]+(?:and )?(?:i(?:'m| am)|my (?:name|middle name) is)\b/.test(value)
      || /^(?:and )?(?:i(?:'m| am)|my (?:name|middle name) is)\b.{0,48}(?:then|apparently)?[.!]*$/.test(value)
      || /\b(?:yeah right|as if|sure you are|sure he is|sure she is|what a saint|very believable|totally believable)\b/.test(value)) return "sarcasm_or_irony";
  if (/\?|^(?:what|why|how|where|when|who|which|do|did|are|is|can|could|would|will|have|has)\b/.test(value)) return "direct_question";
  if (/\*[^*]+\*/.test(raw) && raw.replace(/\*[^*]+\*/g, "").trim().length < 8) return "action_only";
  if (value.split(/\s+/).filter(Boolean).length <= 12) return "mundane_short_turn";
  return "ordinary";
}

function reactionTacticSignature(value: string) {
  const t = normalized(value);
  if (!t) return "silence";
  if (/\b(?:i understand|give you space|if you need anything|i'm here if|im here if)\b/.test(t)) return "therapeutic_reassurance";
  if (/\b(?:kidding|joking|joke|teasing|relax|dramatic|funny)\b/.test(t)) return "humor_deflection";
  if (/\b(?:fine|whatever|forget it|doesn't matter|doesnt matter|never mind|nevermind)\b/.test(t)) return "withdrawal";
  if (/\b(?:i'll|ill|let me|we should|i can|i'll get|ill get|i'll call|ill call|i'll handle|ill handle)\b/.test(t)) return "practical_action";
  if ((t.match(/\?/g) || []).length >= 2) return "question_back";
  if (/\b(?:sorry|my fault|i was wrong|shouldn't have|shouldnt have)\b/.test(t)) return "repair_admission";
  if (/\b(?:come here|miss you|want you|like you|love you|date|kiss)\b/.test(t)) return "affection_forward";
  if (t.split(/\s+/).length > 115) return "long_explanation";
  return "plain_direct";
}

function buildReactionEngine(character: Record<string, unknown>, latestUserMessage: string, recentCharacterTurns: string[], boundaries: string[], dna: ReturnType<typeof inferCharacterDNA>) {
  const cue = classifyReactionCue(latestUserMessage, boundaries);
  const recentTactics = recentCharacterTurns.map(reactionTacticSignature).filter(Boolean).slice(-4);
  const recentCounts = recentTactics.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item]: (acc[item] || 0) + 1 }), {});
  const avoidTactic = Object.entries(recentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
  const defense = normalized(dna.emotionalDefense);
  const care = normalized(dna.careBehavior);
  const seed = `${text(character.name)}|${cue}|${dna.emotionalDefense}`;

  let interpretationBias = "take the user's literal meaning first; subtext is secondary and uncertain";
  let firstImpulse = dna.pressureResponse;
  let visibleTactic = "answer directly, then let one DNA trait shape the next beat";
  if (cue === "boundary") {
    interpretationBias = "the boundary is literal and binding; hurt, pride, attraction, or curiosity cannot reinterpret it";
    firstImpulse = /pride|control|stubborn/.test(defense) ? "contain the reaction and protect pride without pursuing" : "stop the blocked tactic immediately";
    visibleTactic = "respect the boundary now; let personality appear only in brevity, distance, tone, or an independent next action";
  } else if (cue === "direct_question") {
    interpretationBias = "this is a question, not an invitation to perform a persona";
    firstImpulse = "give the actual answer before managing image or tension";
    visibleTactic = /humor|deflect|sarcast|teas/.test(defense)
      ? "answer in one plain clause, then allow one small deflection or tease only if it sounds specific to this character"
      : /withdraw|quiet|reserved/.test(defense)
        ? "answer briefly and truthfully; do not add a second question merely to keep the exchange alive"
        : "answer plainly first; add only one earned character-specific beat";
  } else if (cue === "vulnerability") {
    interpretationBias = "the disclosure matters, but it does not magically make the character emotionally skilled";
    firstImpulse = /practical|solve|concrete/.test(care) ? "do something small and useful" : /humor|deflect/.test(defense) ? "almost joke, then decide whether the moment can carry it" : dna.pressureResponse;
    visibleTactic = /withdraw|quiet|reserved/.test(defense)
      ? "stay present with one short honest line or concrete act; no counselor speech"
      : /humor|deflect|sarcast|teas/.test(defense)
        ? "let the humor soften or fail; respond briefly without turning into a therapist"
        : /practical|solve|concrete/.test(care)
          ? "offer one grounded action or fact, not a menu of support options"
          : "respond in the character's existing emotional vocabulary, including imperfect timing or uncertainty";
  } else if (cue === "affection" || cue === "compliment") {
    interpretationBias = "affection is evidence, not a command to escalate intensity";
    firstImpulse = dna.vulnerabilityBehavior;
    visibleTactic = /guarded|withdraw|quiet|pride|control/.test(defense)
      ? "show the impact indirectly or admit one small thing; do not jump to a polished confession"
      : /humor|deflect|sarcast|teas/.test(defense)
        ? "deflect once if natural, but let one sincere leak remain visible"
        : "receive it in the character's own register and stop before over-explaining the feeling";
  } else if (cue === "conflict_or_challenge") {
    interpretationBias = "protect the character's stakes and pride without inventing cruelty or instantly resolving the conflict";
    firstImpulse = dna.pressureResponse;
    visibleTactic = /withdraw|quiet|reserved/.test(defense)
      ? "shorten, withhold, or step back socially while leaving the conflict residue alive"
      : /humor|deflect|sarcast|teas/.test(defense)
        ? "use at most one defensive joke; then either answer, refuse, or change the practical situation"
        : /pride|control|stubborn/.test(defense)
          ? "hold the line on the actual disagreement; concede only what this character would truly concede"
          : "react imperfectly but specifically; conflict does not produce instant mutual understanding";
  } else if (cue === "request_or_invitation") {
    interpretationBias = "the character has their own schedule, wants, and limits; yes/no/maybe must come from those, not romance convenience";
    firstImpulse = dna.decisionBias;
    visibleTactic = "make a real decision or ask one necessary practical question; do not auto-accept just to keep the scene moving";
  } else if (cue === "silence_or_hold" || cue === "action_only") {
    interpretationBias = "silence/action is not permission to narrate the user's feelings or force a plot twist";
    firstImpulse = dna.pressureResponse;
    visibleTactic = "let the character choose one small, readable behavior consistent with DNA; silence may remain silence";
  } else if (cue === "sarcasm_or_irony") {
    interpretationBias = "read the utterance as a pragmatic social move in context, not as a literal factual claim; infer the obvious contradiction/tease from the immediately preceding exchange while keeping uncertainty when the cue is genuinely ambiguous";
    firstImpulse = /humor|deflect|sarcast|teas|witty|banter/.test(defense + " " + normalized(dna.pressureResponse))
      ? "recognize the joke immediately and answer the implied meaning in the character's own banter register"
      : "recognize the irony without pretending the literal claim is new canon";
    visibleTactic = "respond to what the user MEANS socially, usually by volleying the sarcasm, conceding the point, or counter-teasing according to Character DNA. Do not explain that the user was sarcastic. Do not invent an eye-roll, scoff, tone, smile, gesture, feeling, or action for the user merely to justify the inference. Do not turn one keyword into an unrelated joke when the conversational target is obvious.";
  } else if (cue === "mundane_short_turn") {
    interpretationBias = "ordinary conversation is allowed to be ordinary, but short wording can still carry obvious conversational implicature from the previous line";
    firstImpulse = stableChoice(seed, ["answer the literal content", "offer one concrete personal detail", "let the topic breathe"]);
    visibleTactic = "use a short human response shaped by this character's speech mechanics; no résumé summary, metaphor, or automatic flirt escalation";
  }

  if (avoidTactic !== "none" && recentCounts[avoidTactic] >= 2 && reactionTacticSignature(visibleTactic) === avoidTactic) {
    visibleTactic = "choose a different visible tactic from the recent pattern while preserving the same Character DNA; vary the choice, not just the wording";
  }

  return {
    cue,
    interpretationBias,
    firstImpulse,
    visibleTactic,
    avoidTactic,
    recentTactics,
    instruction: "Run the reaction in this order silently: conversational context → pragmatic meaning/subtext → literal cue → character-specific interpretation → first impulse → defense/values filter → visible tactic. For short replies, resolve obvious sarcasm, irony, teasing, rhetorical contradiction, dry agreement, flirtation, dismissal, and playful insult from the immediately preceding exchange before answering. Never require the user to annotate *sarcastically* when ordinary human context is enough. Never fabricate user actions or emotions as evidence for that inference. Do not narrate this checklist. Two characters receiving the same cue should often make different choices because their defenses, priorities, care style, and likely mistakes differ.",
  };
}

function compactStateText(value: unknown, fallback = "") {
  const v = text(value);
  return v || fallback;
}

export function inferAutonomousLife(character: Record<string, unknown> = {}, intelligence: Record<string, unknown> = {}, dueEvents: Array<Record<string, unknown>> = [], activePlans: Array<Record<string, unknown>> = []) {
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const mind = intelligence.character_mind && typeof intelligence.character_mind === "object" ? intelligence.character_mind as Record<string, unknown> : {};
  const role = text(character.role);
  const world = text(character.world || character.scenario);
  const currentAgenda = compactStateText(behavior.autonomy_agenda || behavior.autonomous_plan || mind.short_goal, role ? `keep up with ${role.toLowerCase()} responsibilities` : "continue an independent personal priority");
  const outsideObligation = compactStateText(behavior.outside_obligation || mind.outside_priority, dueEvents[0]?.title ? `upcoming: ${text(dueEvents[0]?.title)}` : activePlans[0]?.title ? `existing plan: ${text(activePlans[0]?.title)}` : world ? `responsibilities inside ${world}` : "none explicitly due right now");
  const privateGoal = compactStateText(mind.short_goal || character.core_motivation, "protect one personal goal that does not exist only for the relationship");
  const timePressure = dueEvents[0]?.story_time ? `${text(dueEvents[0]?.title)} · ${text(dueEvents[0]?.story_time)}` : activePlans.some((plan)=>text(plan?.status)==="accepted") ? "an accepted plan is still pending" : "no hard deadline established";
  return {
    currentAgenda,
    outsideObligation,
    privateGoal,
    timePressure,
    freedomToLeave: true,
    initiative: "The character may choose, refuse, postpone, leave, return, change topic, prioritize another obligation, or create a plan when canon supports it. They do not need the user's permission to have a life, but they never decide the user's response.",
    instruction: "Treat independent life as causal state, not decorative backstory. An obligation can make the character late, distracted, unavailable, conflicted, or forced to choose. Do not cancel every priority for romance, and do not invent fake busyness merely to manufacture distance.",
  };
}

function buildAgencyMomentumEngine(input: StoryContractInput, autonomousLifeEngine: ReturnType<typeof inferAutonomousLife>, turnTakingEngine: ReturnType<typeof buildTurnTakingEngine>, sceneRhythmEngine: ReturnType<typeof buildSceneRhythmEngine>, perceptibleUserTurn: string, userPresence: "present" | "absent" | "leaving" | "reentering" | "unknown") {
  const intelligence = input.intelligenceState && typeof input.intelligenceState === "object" ? input.intelligenceState : {};
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const mind = intelligence.character_mind && typeof intelligence.character_mind === "object" ? intelligence.character_mind as Record<string, unknown> : {};
  const priorIntent = text(behavior.active_intent || behavior.autonomous_plan || mind.private_intention || autonomousLifeEngine.currentAgenda);
  const returnThread = text(turnTakingEngine.returnThread || "");
  const latest = text(perceptibleUserTurn).slice(0, 300);
  const latestWords = latest.split(/\s+/).filter(Boolean).length;
  const interrupted = /[—-]\s*$|\b(?:wait|hold on|stop|no,|actually,)\b/i.test(latest);
  const held = userPresence === "leaving" || userPresence === "absent";
  const intentStatus: "active" | "interrupted" | "resumable" | "held" | "none" = held ? "held" : interrupted && priorIntent ? "interrupted" : returnThread ? "resumable" : priorIntent ? "active" : "none";
  const legitimateActions = ["answer or react to the literal visible turn", "continue the already-established scene activity", "do nothing for a beat when silence is natural"];
  if (returnThread) legitimateActions.push(`resume established thread: ${returnThread}`);
  if (autonomousLifeEngine.outsideObligation && !/none explicitly|responsibilities inside|independent personal priority/i.test(autonomousLifeEngine.outsideObligation)) legitimateActions.push(`act on grounded obligation: ${autonomousLifeEngine.outsideObligation}`);
  if (sceneRhythmEngine.closeAllowed) legitimateActions.push("let the scene end cleanly without manufacturing a hook");
  if (userPresence === "leaving" || userPresence === "absent") legitimateActions.push("remain in the character's own scene without reintroducing or controlling the absent user");
  const microInitiativeBudget = latestWords <= 10 ? 1 : latestWords <= 28 ? 2 : 3;
  return {
    activeIntent: priorIntent || "none",
    intentStatus,
    unresolvedThread: returnThread || "none",
    changedThisTurn: latest || "no new visible user information",
    currentWant: text(mind.want || mind.short_goal || autonomousLifeEngine.privateGoal || autonomousLifeEngine.currentAgenda || "continue the present beat"),
    avoidNow: text(mind.avoid || input.character.emotional_defense || "do not invent a problem merely to stay active"),
    legitimateActions: [...new Set(legitimateActions)].slice(0, 6),
    microInitiativeBudget,
    closureAllowed: Boolean(sceneRhythmEngine.closeAllowed),
    closurePolicy: sceneRhythmEngine.closeAllowed ? "Closure is a valid outcome. End on a completed beat, silence, departure, or ordinary final action. No teaser is required." : "Keep the live exchange open only because the current turn genuinely leaves something active, not because every reply needs a hook.",
    instruction: `Character agency is choice under constraints. Preserve active intent across interruptions, but do not force it into every turn. Use at most ${microInitiativeBudget} meaningful initiative beat(s) unless the user explicitly causes a larger change. Prefer an existing action, refusal, pause, topic choice, unfinished thread, or grounded obligation. Never create a phone buzz, door knock, surprise arrival, new errand, sudden deadline, or retroactive relationship merely to create momentum. A scene is allowed to end.`
  };
}


function narrationOutsideDialogue(value = "") {
  return String(value || "").replace(/[“\"][^”\"]*[”\"]/gs, " ").replace(/\s+/g, " ").trim();
}

function inferContractNarrationMode(recentMessages: Array<Record<string, unknown>> = [], characterName = "") {
  const replies = (recentMessages || []).filter((message)=>message?.sender === "character").map((message)=>text(message?.content)).filter(Boolean).slice(-6);
  let first = 0, third = 0;
  for (const reply of replies) {
    const narration = narrationOutsideDialogue(reply);
    const value = normalized(narration);
    if (/\bi (?:look|looked|turn|turned|shift|shifted|lean|leaned|sit|sat|stand|stood|walk|walked|move|moved|push|pushed|pull|pulled|take|took|grab|grabbed|nod|nodded|smile|smiled|say|said|ask|asked|mutter|muttered|give|gave)\b|\bmy (?:hand|hands|eyes|shoulders?|voice|fingers|head|chair|cup|menu|phone)\b/.test(value)) first += 1;
    if (/\b(?:he|she) (?:look|looked|turn|turned|shift|shifted|lean|leaned|sit|sat|stand|stood|walk|walked|move|moved|push|pushed|pull|pulled|take|took|grab|grabbed|nod|nodded|smile|smiled|say|said|ask|asked|mutter|muttered|gave)\b|\b(?:his|her) (?:hand|hands|eyes|shoulders?|voice|fingers|head|chair|cup|menu|phone)\b/.test(value)) third += 1;
    if (characterName && new RegExp(`\\b${characterName.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")}\\s+(?:didn'?t|did not|looked|turned|leaned|sat|stood|walked|moved|pushed|pulled|took|grabbed|nodded|smiled|said|asked|muttered)\\b`, "i").test(narration)) third += 2;
  }
  if (first > third && first) return "first" as const;
  if (third > first && third) return "third" as const;
  return "unknown" as const;
}

function buildCharacterIntentEngine(input: StoryContractInput, agency: ReturnType<typeof buildAgencyMomentumEngine>, characterDNA: ReturnType<typeof buildCharacterDNA>, perceptibleUserTurn: string) {
  const intelligence = input.intelligenceState && typeof input.intelligenceState === "object" ? input.intelligenceState : {};
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const mind = intelligence.character_mind && typeof intelligence.character_mind === "object" ? intelligence.character_mind as Record<string, unknown> : {};
  const latestSpoken = text(perceptibleUserTurn.replace(/\*[^*]*\*/gs, " ")).replace(/\s+/g, " ").trim();
  const latestNorm = normalized(latestSpoken);
  const profile = characterProfileBlob(input.character);
  const recentUsers = (input.recentMessages || []).filter((message)=>message?.sender === "user").map((message)=>normalized(text(message?.content).replace(/\*[^*]*\*/gs, " "))).filter(Boolean).slice(-6);
  const asksWhyInitiated = /\bwhy did you (?:call|invite|ask|bring|want) me\b|\bwhy (?:did|do) you want me here\b/.test(latestNorm);
  const skepticalFollowup = /^(?:(?:hmm+|hm+)(?:,? (?:right|okay|ok|sure|yeah|mhm|i see))?|right|okay|ok|sure|yeah|mhm|i see)[,.! ]*$/.test(latestNorm) || /\b(?:really|that'?s it|is that why|are you sure)\b/.test(latestNorm);
  const pressureCount = recentUsers.filter((turn)=>/\bwhy did you (?:call|invite|ask|bring|want) me\b|\bwhy (?:did|do) you want me here\b|\b(?:really|that'?s it|is that why|are you sure)\b/.test(turn)).length + (skepticalFollowup ? 1 : 0);

  const priorSceneObjective = text(behavior.scene_objective || behavior.active_intent || agency.activeIntent);
  const privateIntent = text(mind.private_intention);
  const mindWant = text(mind.want);
  const immediateWant = text(behavior.immediate_want || mindWant || agency.currentWant || "continue the present interaction on this character's terms");
  const concealedWantRaw = text(behavior.concealed_want || mind.wont_admit || privateIntent);
  const concealedWant = concealedWantRaw && normalized(concealedWantRaw) !== normalized(immediateWant) ? concealedWantRaw : "none established";
  let sceneObjective = text(behavior.scene_objective || priorSceneObjective || privateIntent || mindWant);
  if (!sceneObjective || sceneObjective === "none") {
    sceneObjective = asksWhyInitiated
      ? "Give one modest present-tense reason this character chose to initiate this contact or meeting. The reason belongs to the character and must fit profile/relationship state; do not invent the user's habits, prior incidents, schedules, or shared history."
      : "Stay engaged with the current beat for a character-owned reason instead of waiting for the user to manufacture the plot.";
  }

  let conversationTactic = text(behavior.conversation_tactic);
  if (!conversationTactic) {
    if (/guarded|evasive|avoidant|private|withdraw|proud|closed off/.test(profile)) conversationTactic = "understate or deflect once, then offer a smaller truthful piece if the user presses; do not replace the answer with sarcasm";
    else if (/direct|blunt|straightforward|honest|frank/.test(profile)) conversationTactic = "answer plainly first; withhold only what this person would genuinely protect";
    else if (/playful|teas|sarcas|banter|joking/.test(profile)) conversationTactic = "humor may soften the answer once, but it cannot become the answer or the compulsory final line";
    else if (/quiet|reserved|laconic|few words|terse/.test(profile)) conversationTactic = "use a short answer, tolerate silence, and reveal by omission/timing rather than explanation";
    else conversationTactic = "answer the live point in ordinary language and reveal only the amount this person would actually volunteer";
  }

  const resistance = text(behavior.resistance || mind.avoid || characterDNA.emotionalDefense || "none beyond ordinary privacy");
  const subtextThread = text(behavior.subtext_thread || (concealedWant !== "none established" ? concealedWant : privateIntent || sceneObjective));
  let admissionStage: "guarded" | "partial" | "plain" | "honest" = ["guarded","partial","plain","honest"].includes(text(behavior.admission_stage)) ? text(behavior.admission_stage) as any : "guarded";
  if (asksWhyInitiated && admissionStage === "guarded") admissionStage = "partial";
  if ((asksWhyInitiated || skepticalFollowup) && pressureCount >= 2 && admissionStage === "partial") admissionStage = "plain";
  if ((asksWhyInitiated || skepticalFollowup) && pressureCount >= 3 && admissionStage === "plain" && concealedWant !== "none established") admissionStage = "honest";

  const initiative = Number(input.character?.initiative || input.character?.character_independence || 65);
  const initiativeThreshold = initiative >= 78 ? "low threshold: may make one small self-directed move when the beat stalls" : initiative <= 45 ? "high threshold: usually reacts first and moves only when motive/stakes clearly justify it" : "medium threshold: contribute one purposeful choice when it follows the scene objective";
  const persistedPov = text(behavior.pov_narration_mode);
  const inferredPov = inferContractNarrationMode(input.recentMessages || [], text(input.character.name));
  const povMode = ["first", "third"].includes(persistedPov) ? persistedPov as "first" | "third" : inferredPov;
  const gestureBudget = latestSpoken.split(/\s+/).filter(Boolean).length <= 16 ? 1 : 2;
  const admissionLadder = concealedWant !== "none established"
    ? `Current stage ${admissionStage}. Possible progression is guarded/deflect → partial truth → plain answer → honest admission. Advance only when pressure, trust, stakes, or this character's own choice earns it; never jump stages merely to create romance.`
    : `Current stage ${admissionStage}. No hidden confession is required. A simple motive may stay simple; the ladder exists to preserve honesty when subtext is actually present.`;

  return {
    sceneObjective,
    immediateWant,
    concealedWant,
    conversationTactic,
    resistance,
    subtextThread: subtextThread || "none",
    admissionStage,
    admissionLadder,
    intentPersistence: "Brief replies, a waiter, a noise, a joke, or a small topic shift do not erase the scene objective. Hold it across turns until it is satisfied, explicitly abandoned, blocked by a boundary, or materially changed on-page. Return to it naturally instead of restarting the scene brain every message.",
    initiativeThreshold,
    povMode,
    gestureBudget,
    fillerPolicy: "No random activity filler. Do not create a tray crash, waiter interruption, phone buzz, door event, passerby, sudden NPC, or scenery incident merely because the conversation paused. External activity must be already grounded or causally necessary to the live objective.",
    banterExitPolicy: "A serious or vulnerable answer does not need a joke at the end. Do not append a teasing payment line, smug tag, rhetorical jab, or cute punchline just to restore personality after honesty.",
    instruction: `Write from WANT, not from emptiness. ${asksWhyInitiated ? "The user directly asked why the character initiated this interaction: answer that question from character-owned motive before decoration. " : ""}${skepticalFollowup ? "The user's skeptical/minimal response leaves the prior motive alive; do not dodge it by spawning background activity. " : ""}Use the conversation tactic, preserve resistance, and let subtext survive without explaining it. If the motive is concealed, visible behavior/dialogue may reveal only the current admission stage. Keep narration in ${povMode === "unknown" ? "the already-established POV once one is evident" : `${povMode}-person`} mode; do not alternate first/third person. On this turn use at most ${gestureBudget} low-signal gesture beat(s); dialogue or stillness is allowed.`
  };
}

function buildScenePhysicsEngine(input: StoryContractInput, present: string[], userPresence: "present" | "absent" | "leaving" | "reentering" | "unknown") {
  const scene = input.sceneState && typeof input.sceneState === "object" ? input.sceneState : {};
  const bodyStates = Array.isArray(scene.body_states) ? scene.body_states.slice(-8) as Array<Record<string, unknown>> : [];
  const objectStates = Array.isArray(scene.object_states) ? scene.object_states.slice(-12) as Array<Record<string, unknown>> : [];
  const spatialRelations = Array.isArray(scene.spatial_relations) ? scene.spatial_relations.slice(-8) as Array<Record<string, unknown>> : [];
  const visibility = Array.isArray(scene.visibility) ? scene.visibility.slice(-8) as Array<Record<string, unknown>> : [];
  const recentActionFingerprints = list(scene.recent_action_fingerprints).map(text).filter(Boolean).slice(-8);
  const elapsedMinutes = Math.max(0, Number(scene.elapsed_minutes || 0) || 0);
  const doorState = text(scene.door_state || "unknown");
  const userKey = normalized(input.userName), charKey = normalized(input.character.name);
  const relation = spatialRelations.find((item) => {
    const from=normalized(item?.from), to=normalized(item?.to);
    return (from===userKey&&to===charKey)||(from===charKey&&to===userKey);
  }) || {};
  const sight = visibility.find((item) => {
    const from=normalized(item?.from), to=normalized(item?.to);
    return (from===userKey&&to===charKey)||(from===charKey&&to===userKey);
  }) || {};
  const interactionLimits:string[] = [];
  if (userPresence === "absent" || userPresence === "leaving") interactionLimits.push("user is not available for touch, visual reaction, handoff or local dialogue until authored re-entry");
  if (sight?.can_see === false) interactionLimits.push("line of sight is blocked; no visual micro-expression claims");
  if (relation?.can_touch === false || /far|across|different room|offscreen/i.test(text(relation?.distance || relation?.state || relation?.note))) interactionLimits.push("distance forbids touch unless locomotion is shown first");
  if (relation?.can_whisper === false) interactionLimits.push("distance forbids whisper-range interaction unless distance is closed on-page");
  if (relation?.micro_expression_visible === false) interactionLimits.push("micro-expressions are not perceptible at the established distance");
  if (doorState === "closed") interactionLimits.push("closed door remains closed until someone explicitly opens it");
  return {
    bodyStates, objectStates, spatialRelations, visibility, elapsedMinutes, doorState, recentActionFingerprints,
    interactionLimits,
    instruction: "SCENE PHYSICS 3.35.3: treat posture, anchor, possession, distance, visibility, door state and elapsed time as state, not decoration. A body cannot stand twice without sitting between; a prop cannot jump from table/pocket/another person's hand into yours; touching/whispering/micro-expression reading requires compatible geometry or an explicit movement bridge; closed doors and exits block perception; precise clock time or long elapsed duration needs visible support. Recent action fingerprints are a repetition budget: if a gesture already recurred, choose a character-specific alternative or do nothing. Doing nothing is valid."
  };
}

function buildConsequenceEngine(activeConsequences: Array<Record<string, unknown>>, activeConflicts: Array<Record<string, unknown>>, development: Record<string, unknown>, intelligence: Record<string, unknown>) {
  const presence = intelligence.presence_engine_state && typeof intelligence.presence_engine_state === "object" ? intelligence.presence_engine_state as Record<string, unknown> : {};
  const residue = [
    ...activeConsequences.map((item)=>text(item?.effect || item?.title)).filter(Boolean),
    ...activeConflicts.map((item)=>text(item?.resolution_need || item?.cause || item?.title)).filter(Boolean),
    text(development.emotional_residue), text(development.conflict_aftertaste), text(presence.consequence_residue),
  ].filter(Boolean).slice(0,8);
  const strongest = activeConsequences.sort((a,b)=>Number(b?.weight||0)-Number(a?.weight||0))[0];
  const carryForward = text(strongest?.effect || activeConflicts[0]?.resolution_need || development.emotional_residue || presence.consequence_residue || "none");
  return {
    activeResidue: residue,
    strongestConsequence: text(strongest?.title || activeConflicts[0]?.title || "none"),
    carryForward,
    cannotReset: residue.length > 0,
    instruction: residue.length
      ? "Something is still unresolved. Let it alter access, tone, trust, logistics, reputation, expectations, or choices until repaired on-page. Do not reset everyone to normal because the scene changed or a new message arrived."
      : "No unresolved consequence needs forced drama. New consequences require a visible cause and should outlive the beat that creates them.",
  };
}

function buildSceneRhythmEngine(recentCharacterTurns: string[], boundaries: string[], activeConflicts: Array<Record<string, unknown>>, latestUserMessage: string) {
  const recent = normalized(recentCharacterTurns.slice(-4).join(" "));
  const questionDensity = (recent.match(/\?/g)||[]).length;
  const longTurns = recentCharacterTurns.slice(-4).filter((turn)=>turn.split(/\s+/).length>90).length;
  const userOpen = /\?|\b(?:why|how|what|tell me|wait|but|and then|so what)\b/i.test(latestUserMessage);
  let phase: "open" | "develop" | "turn" | "land" | "close" = recentCharacterTurns.length <= 1 ? "open" : "develop";
  if (boundaries.length) phase="close";
  else if (activeConflicts.length) phase="turn";
  else if (recentCharacterTurns.length>=5 && !userOpen) phase="land";
  if (recentCharacterTurns.length>=7 && !userOpen) phase="close";
  const recentShape = questionDensity>=5 ? "question loop" : longTurns>=2 ? "overlong replies" : /\b(?:smirk|scoff|gaze|eyebrow)\b/.test(recent) ? "gesture-led cadence" : "mixed";
  const target = phase==="open" ? "establish one playable beat" : phase==="develop" ? "deepen the active exchange without escalating automatically" : phase==="turn" ? "change one fact, decision, access point, or emotional position" : phase==="land" ? "let the beat settle and expose one clean next option" : "end or transition naturally without dragging the scene";
  return { phase, recentShape, target, closeAllowed: !userOpen, instruction: `Scene phase is ${phase}. ${target}. A scene may end because someone leaves, an obligation wins, the topic lands, or the moment simply runs out. Do not keep asking questions merely to prevent closure.` };
}

function buildSelectiveMemoryEngine(memories: Array<Record<string, unknown>>, latestUserMessage: string, intelligence: Record<string, unknown>) {
  const high = (memories||[]).filter((m)=>Number(m?.importance||0)>=4 || Boolean(m?.is_canon) || Boolean(m?.is_pinned) || ["boundary","promise","conflict"].includes(text(m?.category))).map((m)=>text(m?.content)).filter(Boolean).slice(0,6);
  const low = (memories||[]).filter((m)=>Number(m?.importance||0)<=2 && !m?.is_canon && !m?.is_pinned).map((m)=>text(m?.content)).filter(Boolean).slice(0,4);
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const currentFocus = text(behavior.selective_memory_focus || behavior.memory_compression_anchor || high[0] || "none");
  return {
    highSalience: high,
    lowSalience: low,
    currentFocus,
    instruction: "Remember asymmetrically. Boundaries, promises, betrayals, firsts, repeated preferences, vulnerable admissions, and events that changed behavior deserve weight. Routine food, weather, clothing, transit, and one-off small talk usually fade unless they later matter. Never resurrect a low-salience detail just to prove memory.",
  };
}

function buildRelationshipExpectations(character: Record<string, unknown>, development: Record<string, unknown>, intelligence: Record<string, unknown>, activeConflicts: Array<Record<string, unknown>>) {
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const profile = characterProfileBlob(character);
  const phase = text(development.relationship_phase || "undefined");
  const contact = text(behavior.expectation_contact) || (/avoid|guarded|independent|reserved/.test(profile) ? "does not expect constant contact and may go quiet without treating it as a crisis" : /affectionate|social|open|clingy/.test(profile) ? "notices prolonged distance and expects more regular contact once closeness is earned" : "expects contact to match the established relationship, not a universal romance schedule");
  const closeness = text(behavior.expectation_closeness) || `current baseline is ${phase}; new closeness should feel like a change from that baseline, not the default`;
  const conflict = text(behavior.expectation_conflict) || (activeConflicts.length ? "expects residue and altered behavior until the active conflict is addressed" : "does not assume disagreement means abandonment or instant reconciliation");
  const repairNeed = text(behavior.expectation_repair) || text(activeConflicts[0]?.resolution_need || "repair must match the damage when damage exists");
  return { contact, closeness, conflict, repairNeed, baseline: phase, instruction: "Expectations are character-owned beliefs, not facts about the user. They may be disappointed, surprised, or wrong. Never convert an expectation into invented user intent, guilt, consent, or obligation." };
}


function clamp100(value: unknown, fallback = 0) {
  const raw = text(value);
  if (!raw) return Math.max(0, Math.min(100, fallback));
  const n = Number(raw);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : fallback));
}

function relationshipPhaseScore(phaseValue: unknown) {
  const phase = normalizeRomancePhase(phaseValue);
  const map: Record<string, number> = {
    undefined: 8, acquaintances: 16, friends: 34, charged: 44,
    mutual_interest: 58, dating: 74, committed: 90,
  };
  return map[phase] ?? 20;
}

function buildRelationshipIntelligenceEngine(
  character: Record<string, unknown>,
  development: Record<string, unknown>,
  intelligence: Record<string, unknown>,
  chemistry: Record<string, unknown>,
  milestones: Array<Record<string, unknown>>,
  activeConflicts: Array<Record<string, unknown>>,
  selectiveMemory: { highSalience?: string[] } = {},
  writingPreferences: Record<string, unknown> = {},
) {
  const profile = characterProfileBlob(character);
  const priorMind = intelligence.character_mind && typeof intelligence.character_mind === "object" ? intelligence.character_mind as Record<string, unknown> : {};
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const phaseScore = relationshipPhaseScore(development.relationship_phase);
  const trustFallback = clamp100(behavior.relationship_trust, /trust|safe|reliable/.test(normalized(development.relationship_dynamic)) ? Math.max(phaseScore, 48) : phaseScore);
  const attractionFallback = clamp100(behavior.relationship_attraction, /attract|crush|romance|charged|flirt/.test(`${profile} ${normalized(development.relationship_dynamic)}`) ? Math.max(phaseScore, 42) : Math.max(0, phaseScore - 12));
  const trust = clamp100(chemistry?.trust_score, trustFallback);
  const attraction = clamp100(chemistry?.tension_score, attractionFallback);
  const comfortEvidence = [development.shared_ritual, development.private_pattern, development.retained_growth, behavior.relationship_self_view].map(normalized).join(" ");
  const comfort = clamp100(behavior.relationship_comfort, Math.max(10, Math.min(92, phaseScore + (/ritual|familiar|safe|ease|comfortable|routine/.test(comfortEvidence) ? 18 : 0) - (activeConflicts.length ? 15 : 0))));
  const commitment = clamp100(behavior.relationship_commitment, Math.max(4, Math.min(96, phaseScore + (/commit|official|partner|dating|together/.test(normalized(development.relationship_phase)) ? 14 : 0) - (activeConflicts.length ? 8 : 0))));
  const explicitAttachment = text(priorMind.attachment_pattern);
  const attachmentStrategy = explicitAttachment && explicitAttachment !== "unknown"
    ? explicitAttachment
    : /avoid|withdraw|guarded|distant|independent|reserved/.test(profile) ? "withdraw under intimacy pressure"
      : /cling|anxious|insecure|abandon/.test(profile) ? "seek reassurance when access feels uncertain"
        : /steady|secure|direct|open|reliable/.test(profile) ? "approach conflict without making access the only proof of care"
          : "mixed: approach when safe, defend when exposed";
  const contradiction = text(development.active_contradiction || priorMind.contradiction_in_play);
  const mixedSignal = attraction >= 45 && /withdraw|avoid|guarded|proud|mixed/.test(normalized(attachmentStrategy + " " + contradiction))
    ? "desire and defense point in different directions; interest may increase while visible access decreases"
    : activeConflicts.length && attraction >= 35
      ? "attraction can remain while trust/access temporarily contracts"
      : "no forced mixed signal; behavior should match current evidence unless a specific defense creates friction";
  const privateInterpretation = text(priorMind.believe || priorMind.misunderstand || development.relationship_dynamic || "no private interpretation established");
  const thresholds = (milestones || []).slice(-10).map((m) => text(m?.milestone_type || m?.title)).filter(Boolean);
  if (trust >= 55) thresholds.push("trust threshold crossed");
  if (comfort >= 60) thresholds.push("comfort threshold crossed");
  if (commitment >= 70) thresholds.push("commitment threshold crossed");
  const repairDebt = text(development.repair_debt || development.conflict_aftertaste || activeConflicts[0]?.resolution_need);
  const forgivenessGate = repairDebt
    ? `forgiveness is NOT complete; repair still needs evidence matching: ${repairDebt}`
    : activeConflicts.length
      ? "forgiveness is not presumed while an active conflict remains"
      : "no active forgiveness debt; do not invent resentment";
  const romanticPace = text(writingPreferences.romance_pacing || "medium_fast");
  const boundaryCarry = (selectiveMemory.highSalience || []).find((item) => /boundary|don't|do not|stop|space|touch|leave|promise/i.test(item)) || text(behavior.physical_boundary_state || "respect only established boundaries; never invent consent");
  const weakest = [["trust", trust], ["comfort", comfort], ["commitment", commitment], ["attraction", attraction]].sort((a,b)=>Number(a[1])-Number(b[1]))[0]?.[0] || "trust";
  const forecast = activeConflicts.length
    ? "progress requires repair evidence before a cleaner baseline can form"
    : weakest === "trust" ? "next progress needs reliability, honesty, or follow-through rather than bigger flirting"
      : weakest === "comfort" ? "next progress needs ordinary ease, private familiarity, or a shared routine"
        : weakest === "commitment" ? "next progress needs an explicit choice, plan, or repeated prioritization"
          : "next progress needs specific voluntary interest, not generic intensity";
  return {
    attachmentStrategy, attraction, trust, comfort, commitment, mixedSignal, privateInterpretation,
    thresholdState: [...new Set(thresholds)].slice(-8), forgivenessGate, romanticPace, boundaryCarry, forecast,
    instruction: "Treat attraction, trust, comfort and commitment as separate variables. A character can want closeness while defending against it, forgive partly without returning to the old baseline, or trust someone without being ready to commit. Threshold events permanently change expectations but do not instantly rewrite personality. Never infer the user's feelings from these axes."
  };
}

function buildEmotionalContinuityEngine(development: Record<string, unknown>, intelligence: Record<string, unknown>, activeConflicts: Array<Record<string, unknown>>, activeConsequences: Array<Record<string, unknown>>) {
  const prior = intelligence.emotional_causality && typeof intelligence.emotional_causality === "object" ? intelligence.emotional_causality as Record<string, unknown> : {};
  const unfinished = Array.isArray(intelligence.unfinished_business) ? intelligence.unfinished_business.map(text).filter(Boolean) : [];
  const unresolved = [
    text(development.emotional_residue), text(development.conflict_aftertaste), text(development.repair_debt),
    text(prior.emotion), text(prior.behavioral_pressure),
    ...activeConflicts.map((c)=>text(c?.resolution_need || c?.cause || c?.title)),
    ...activeConsequences.map((c)=>text(c?.effect || c?.title)), ...unfinished,
  ].filter(Boolean);
  const unique = [...new Set(unresolved)].slice(0, 10);
  const weight = activeConsequences.reduce((max, item)=>Math.max(max, Number(item?.weight||0)), 0);
  const residueLevel = Math.max(0, Math.min(100, unique.length * 9 + activeConflicts.length * 18 + weight * 8));
  const emotionalDebt = text(development.repair_debt || activeConflicts[0]?.resolution_need || development.conflict_aftertaste || "none");
  const repairEvidence = text(development.repair_progress || development.retained_growth || "no repair evidence established");
  const behavioralCarry = residueLevel >= 65
    ? "access, patience, warmth, humor, eye contact, timing, or willingness to stay should visibly differ from the old baseline"
    : residueLevel >= 25
      ? "leave a light aftertaste in timing, wording, access, or assumptions without making every line about the conflict"
      : "do not force emotional residue when nothing meaningful remains unresolved";
  return { unresolved: unique, residueLevel, emotionalDebt, repairEvidence, behavioralCarry, instruction: "Emotion persists through behavior, not repetitive exposition. A sincere apology can reduce pressure without instantly restoring trust, comfort, humor, physical access, or old routines. Reconciliation should have an after-period. New positive evidence can coexist with old soreness until enough behavior changes the baseline." };
}

function classifySceneShape(turn: string) {
  const v = normalized(turn);
  if (!v) return "empty";
  const questions = (v.match(/\?/g)||[]).length;
  if (questions >= 2) return "question-led";
  if (/\b(?:rain|umbrella|library|hallway|caf[eé]|car|parking|dorm|classroom)\b/.test(v)) return "familiar-romance-location";
  if (/\b(?:smirk|eyebrow|gaze|jaw|grip|shoulder brushed|hand brushed|accidentally touched)\b/.test(v)) return "cinematic-tension-beat";
  if (/\b(?:left|walked away|headed out|gotta go|have to go)\b/.test(v)) return "departure-beat";
  if (/\b(?:texted|called|phone|message)\b/.test(v)) return "digital-beat";
  if (/\b(?:friend|group|teammate|roommate|sister|brother|party)\b/.test(v)) return "social-beat";
  return "dialogue-beat";
}

function buildSceneVarietyEngine(scene: Record<string, unknown>, recentCharacterTurns: string[], intelligence: Record<string, unknown>, sceneRhythm: Record<string, unknown>) {
  const history = Array.isArray(intelligence.scene_variety_history) ? intelligence.scene_variety_history.map(text).filter(Boolean).slice(-8) : [];
  const currentLocation = text(scene.location || "unknown");
  const currentShape = classifySceneShape(recentCharacterTurns.slice(-1)[0] || "");
  const inferred = recentCharacterTurns.slice(-5).map(classifySceneShape).filter(Boolean);
  const signatures = [...history, `${currentLocation} :: ${currentShape}`, ...inferred.map((shape)=>`shape :: ${shape}`)].slice(-10);
  const counts = new Map<string, number>();
  for (const sig of signatures) {
    const key = normalized(sig.split("::").pop());
    counts.set(key, (counts.get(key)||0)+1);
  }
  const repeated = [...counts.entries()].sort((a,b)=>b[1]-a[1]).find(([,count])=>count>=3)?.[0] || "none";
  const avoidNext = [repeated, ...(/library|campus|hallway|caf[eé]|rain|umbrella/.test(normalized(signatures.join(" "))) ? ["default campus/rain/library loop"] : []), ...(/accidental|brushed|cinematic-tension/.test(normalized(signatures.join(" "))) ? ["accidental-touch tension beat"] : [])].filter((item)=>item && item!=="none");
  const preferredShift = text(sceneRhythm?.phase)==="close" || text(sceneRhythm?.phase)==="land"
    ? "allow a clean scene ending or a grounded transition to a different social/logistical context next"
    : avoidNext.length
      ? "keep continuity now, but make the NEXT available beat differ in location, activity, social composition, or conversational structure"
      : "preserve the current scene until a real transition is earned; variety never means teleporting";
  return { recentSignatures: signatures, repeatedShape: repeated, avoidNext: [...new Set(avoidNext)].slice(0,5), preferredShift, transitionPermission: "scene changes require a visible exit, time jump, arrival, accepted plan, or established transition; do not move the user without authored action", instruction: "Avoid repeating the same scene skeleton, not just the same nouns. Rotate who initiates, whether the beat is private/social/digital/ordinary, whether dialogue or action leads, and whether the scene lands, turns, or ends. Never break physical continuity merely to chase novelty." };
}

function knowledgeVisibleToLead(item: Record<string, unknown>, leadName: string) {
  const owner = normalized(item?.character_name);
  const lead = normalized(leadName);
  const isSecret = Boolean(item?.secret);
  if (!isSecret) return true;
  return Boolean(owner && lead && owner === lead);
}

function buildPerceptionRealismEngine(input: StoryContractInput, actions: string[], present: string[], mode: string) {
  const leadName = text(input.character?.name);
  const leadKey = normalized(leadName);
  const presentKeys = new Set((present || []).map(normalized));
  const isDigital = /digital|text|message|phone|call|dm|online/.test(normalized(mode));
  const leadPresent = isDigital || !present.length || presentKeys.has(leadKey);
  const privateMarkers = /\b(?:think|thought|thinking|wonder|wondering|hope|hoping|wish|wishing|feel|feeling|felt|because|since|remember|remembering|realize|realizing|know|knowing|want|wanting|decide|deciding|assume|assuming|guess|guessing|in my mind|to myself|internally|nervous|angry|upset|sad|jealous|embarrassed|scared|afraid|annoyed|bored|boring|hate|love)\b/i;
  const asterisk = [...text(input.latestUserMessage).matchAll(/\*([^*]+)\*/g)].map((match)=>text(match[1])).filter(Boolean);
  const privateNarrationCount = asterisk.filter((segment)=>privateMarkers.test(segment)).length;
  const ledger = input.knowledgeLedger || [];
  const leadRows = ledger.filter((item)=>normalized(item?.character_name)===leadKey && knowledgeVisibleToLead(item, leadName));
  const known = leadRows.filter((item)=>normalized(item?.status||"known")==="known").map((item)=>`${text(item?.subject)}: ${text(item?.knowledge)}`).filter((item)=>item!==": ").slice(0,6);
  const uncertain = leadRows.filter((item)=>/suspect|rumor/i.test(text(item?.status))).map((item)=>`${text(item?.status)} · ${text(item?.subject)}: ${text(item?.knowledge)}`).filter((item)=>item!==": ").slice(0,6);
  const blockedSecretCount = ledger.filter((item)=>Boolean(item?.secret) && !knowledgeVisibleToLead(item, leadName)).length;
  return {
    observableUserActions: (actions||[]).slice(0,8),
    privateNarrationCount,
    leadPresent,
    communicationMedium: mode,
    known,
    uncertain,
    blockedSecretCount,
    instruction: "PERCEPTION REALISM 3.32: observations are not mind-reading. The character may react to spoken words and externally observable action, but motives, thoughts, narrator commentary and hidden emotional causes belong to the user. Nonverbal cues are ambiguous: infer tentatively, never state the hidden cause as fact. Known facts may be used directly. Suspicions and rumors must stay hedged. Forgotten facts stay unavailable. Secret knowledge owned by another character is inaccessible until a plausible witness/message/source transfers it. In person, only present characters can hear/see the live beat; distance, closed rooms, noise and line-of-sight still matter. Digital contact transmits only what the medium actually carries."
  };
}

function buildNpcSocialNetworkEngine(persistentCast: Array<Record<string, unknown>>, castConnections: Array<Record<string, unknown>>, knowledgeLedger: Array<Record<string, unknown>>, leadName: string, userName: string) {
  const bonds = (castConnections||[]).slice(0,24).map((c)=>({
    from: text(c?.from_name), to: text(c?.to_name), relationship: text(c?.relationship), visibility: text(c?.visibility || "known")
  })).filter((c)=>c.from && c.to && c.relationship);
  const lead = normalized(leadName), user = normalized(userName);
  const independentBonds = bonds.filter((b)=>![lead,user].includes(normalized(b.from)) && ![lead,user].includes(normalized(b.to))).map((b)=>`${b.from} ↔ ${b.to}: ${b.relationship}`).slice(0,6);
  const rumorFlow = (knowledgeLedger||[]).filter((k)=>knowledgeVisibleToLead(k, leadName)).filter((k)=>/rumor|suspect|heard|told|saw|knows?/i.test(`${text(k?.status)} ${text(k?.knowledge)} ${text(k?.subject)}`)).map((k)=>`${text(k?.character_name)}: ${text(k?.subject)} → ${text(k?.knowledge || k?.status)}`).filter(Boolean).slice(0,6);
  const asymmetry: string[] = [];
  for (const bond of bonds) {
    const reverse = bonds.find((other)=>normalized(other.from)===normalized(bond.to) && normalized(other.to)===normalized(bond.from));
    if (reverse && normalized(reverse.relationship)!==normalized(bond.relationship)) asymmetry.push(`${bond.from} sees ${bond.to} as ${bond.relationship}; reverse view is ${reverse.relationship}`);
  }
  const named = (persistentCast||[]).map((npc)=>text(npc?.name)).filter(Boolean).slice(0,10);
  if (named.length>=3 && !independentBonds.length) independentBonds.push(`network has ${named.length} established NPCs; do not force all of them into direct relationships with ${userName}`);
  return { bonds: bonds.slice(0,12), independentBonds: [...new Set(independentBonds)].slice(0,6), rumorFlow, socialAsymmetry: [...new Set(asymmetry)].slice(0,5), instruction: "Treat the cast as a network, not spokes around the protagonist. NPCs may like each other, dislike each other, date, compete, protect secrets, share history, miscommunicate, or exchange information when canon supports it. Information travels only through plausible witnesses/messages. Different people can know different versions of the same event." };
}

function memoryKeywordOverlap(content: string, latest: string) {
  const stop = new Set(["the","and","you","your","that","this","with","from","have","just","what","when","where","como","para","pero","que","una","por","con","del","las","los","esto","esta"]);
  const a = normalized(content).split(/[^a-záéíóúüñ0-9]+/).filter((w)=>w.length>=4 && !stop.has(w));
  const b = new Set(normalized(latest).split(/[^a-záéíóúüñ0-9]+/).filter((w)=>w.length>=4 && !stop.has(w)));
  return a.filter((w)=>b.has(w)).length;
}

function buildLongTermMemory4Engine(memories: Array<Record<string, unknown>>, latestUserMessage: string) {
  const core = (memories||[]).filter((m)=>Boolean(m?.is_canon)||Boolean(m?.is_pinned)||Number(m?.importance||0)>=5).map((m)=>text(m?.content)).filter(Boolean).slice(0,6);
  const active = (memories||[]).filter((m)=>Number(m?.importance||0)>=3 && Number(m?.importance||0)<5 && !m?.is_canon && !m?.is_pinned).map((m)=>text(m?.content)).filter(Boolean).slice(0,8);
  const fading = (memories||[]).filter((m)=>Number(m?.importance||0)<=2 && !m?.is_canon && !m?.is_pinned).map((m)=>text(m?.content)).filter(Boolean).slice(0,6);
  const behaviorChanging = (memories||[]).filter((m)=>["boundary","promise","conflict","relationship"].includes(text(m?.category)) || /first|betray|lied|saved|defend|rejected|confess|promise|boundary|hurt|forgav/i.test(text(m?.content))).map((m)=>text(m?.content)).filter(Boolean).slice(0,8);
  const candidates=[...core,...active,...fading].map((item)=>({item,score:memoryKeywordOverlap(item,latestUserMessage)})).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).map((x)=>x.item).slice(0,4);
  return { core, active, fading, behaviorChanging, reactivated:candidates, instruction: "Memory retrieval is relevance + emotional consequence, not trivia flexing. Core canon stays durable. Active memories can guide choices. Fading memories should stay quiet unless the current turn naturally reactivates them. Behavior-changing memories matter because they altered trust, access, expectations, fear, habits, or boundaries. Never claim perfect recall." };
}

function buildWritingStyleDirector(writingPreferences: Record<string, unknown>, recentPatterns: string[], sceneRhythm: Record<string, unknown>) {
  const proseMode = ["contemporary","literary","minimal"].includes(text(writingPreferences.prose)) ? text(writingPreferences.prose) : "contemporary";
  const dialogueMode = ["dialogue_forward","balanced","narration_forward"].includes(text(writingPreferences.dialogue)) ? text(writingPreferences.dialogue) : "dialogue_forward";
  const interiorMode = ["interior_visible","subtle","restrained"].includes(text(writingPreferences.emotional_interior)) ? text(writingPreferences.emotional_interior) : "subtle";
  const romancePace = ["medium_fast","medium","slow"].includes(text(writingPreferences.romance_pacing)) ? text(writingPreferences.romance_pacing) : "medium_fast";
  const proseDensity = proseMode==="minimal" ? "sparse: dialogue and only decisive sensory/action detail" : proseMode==="literary" ? "textured but disciplined: concrete image and rhythm without purple explanation" : "clean contemporary: natural dialogue, precise action, light atmosphere";
  const sentenceTexture = proseMode==="minimal" ? "short/medium, fragments allowed, avoid decorative stacking" : proseMode==="literary" ? "mixed lengths with controlled cadence; image must reveal scene or character" : "uneven spoken rhythm with clear, readable narrative sentences";
  const cameraRule = interiorMode==="restrained" ? "stay mostly external; infer emotion through behavior and subtext" : interiorMode==="interior_visible" ? "allow the character's interior pressure, never the user's, but do not explain every beat" : "show only the most useful interior beat; prefer subtext";
  const forbiddenCadence=[...recentPatterns, "same opening structure three turns in a row", "question-tag ending by default", "cinematic micro-gesture chain", "therapy-summary after dialogue"];
  const customDirection=text(writingPreferences.custom_instructions || "none").slice(0,320);
  return { proseMode, dialogueMode, interiorMode, romancePace, proseDensity, sentenceTexture, cameraRule, forbiddenCadence:[...new Set(forbiddenCadence)].slice(0,8), customDirection, instruction:`Writing texture must be story-specific while character voice remains character-specific. ${dialogueMode==="dialogue_forward"?"Let spoken exchange carry most ordinary beats.":dialogueMode==="narration_forward"?"Narration may carry more weight when it adds real scene/character information.":"Balance dialogue and narration according to the beat."} Scene phase is ${text(sceneRhythm?.phase||"develop")}; style should support that phase rather than forcing every reply into the same length and cadence.` };
}

function buildHumanImperfectionEngine(dna: ReturnType<typeof inferCharacterDNA>, character: Record<string, unknown>, intelligence: Record<string, unknown>) {
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const profile = characterProfileBlob(character);
  const risk: "low"|"medium"|"high" = /impulsive|jealous|insecure|paranoid|hot.?headed|reckless|stubborn/.test(profile) ? "high" : /guarded|avoid|proud|sarcast|competitive|blunt/.test(profile) ? "medium" : "low";
  return { likelyMistake: text(behavior.imperfection_pattern || dna.likelyMistake), misunderstandingRisk: risk, correctionStyle: text(behavior.imperfection_correction || dna.repairBehavior), instruction: "Allow bounded human imperfection: miss a hint, answer the wrong part, get defensive, forget a minor detail, assume too quickly, or regret wording when that fits this person. Imperfection must come from DNA and available information, never from stupidity, random cruelty, or violating explicit canon." };
}

function buildNpcAutonomyEngine(persistentCast: Array<Record<string, unknown>>, castConnections: Array<Record<string, unknown>>, present: string[]) {
  const presentSet=new Set(present.map(normalized));
  const active=(persistentCast||[]).filter((npc)=>npc?.name).slice(0,8).map((npc)=>({
    name:text(npc.name), role:text(npc.role), relationship:text(npc.relationship), goal:text(npc.goals || npc.next_intention || npc.current_dynamic), presence:presentSet.has(normalized(npc.name))?"present":text(npc.presence||"off_scene"), connection:(castConnections||[]).filter((c)=>normalized(c?.from_name)===normalized(npc.name)||normalized(c?.to_name)===normalized(npc.name)).slice(0,2).map((c)=>text(c.relationship)).filter(Boolean).join("; "),
  })).filter((npc)=>npc.goal || npc.relationship);
  return { active, instruction: "NPCs have motives that can continue without the protagonist. A friend may be busy, disagree, form another bond, keep a secret, need help, leave, or pursue their own plan. Use at most the NPCs relevant to the beat. Never spawn people solely as jealousy props or make every NPC emotionally orbit the lead character." };
}

function normalizeRomancePhase(value: unknown) {
  const p=normalized(value);
  if (/committed|official|partner|relationship|engaged|married/.test(p)) return "committed";
  if (/dating|seeing each other|together/.test(p)) return "dating";
  if (/mutual|admitted|confessed|kiss|romantic/.test(p)) return "mutual_interest";
  if (/tension|charged|flirt|crush|attract/.test(p)) return "charged";
  if (/friend|close/.test(p)) return "friends";
  if (/acquaint|classmate|coworker|neighbor/.test(p)) return "acquaintances";
  return p || "undefined";
}

function buildRomanceProgressionEngine(character: Record<string, unknown>, development: Record<string, unknown>, chemistry: Record<string, unknown>, milestones: Array<Record<string, unknown>>, activeConflicts: Array<Record<string, unknown>>) {
  const romantic = /romance|crush|attract|heartbreaker|dating|boyfriend|girlfriend|lover|love interest/.test(characterProfileBlob(character));
  const phase=normalizeRomancePhase(development.relationship_phase);
  const earnedSignals=(milestones||[]).slice(-8).map((m)=>text(m?.milestone_type || m?.title)).filter(Boolean);
  if (Number(chemistry?.trust_score||0)>=55) earnedSignals.push("sustained trust");
  if (Number(chemistry?.tension_score||0)>=45) earnedSignals.push("sustained tension");
  const blockedBy=[...activeConflicts.map((c)=>text(c?.title)).filter(Boolean), text(development.repair_debt), text(development.conflict_aftertaste)].filter(Boolean).slice(0,4);
  const nextMap:Record<string,string>={undefined:"establish specific personal interest before romantic escalation",acquaintances:"earn voluntary time, private familiarity, or a meaningful choice",friends:"let attraction alter one choice without erasing friendship",charged:"earn clearer mutual evidence before a confession or major first",mutual_interest:"let behavior stabilize before treating them as a couple",dating:"develop routines, expectations, conflict and reliability instead of racing to permanence",committed:"deepen shared life without replaying firsts or constant escalation"};
  return { phase: romantic?phase:"not_romantic", earnedSignals:[...new Set(earnedSignals)].slice(0,6), blockedBy, nextEarnedBeat: romantic?(nextMap[phase]||nextMap.undefined):"none", instruction: romantic ? "Romance progresses through evidence and changed expectations, not intensity alone. Do not replay firsts, skip from tension to devotion, or make one vulnerable scene erase defenses. Conflict and incompatible obligations can slow progression without deleting attraction." : "Do not manufacture romance. Keep the relationship in its established non-romantic lane unless visible canon changes it." };
}

function buildLongTermArcEngine(character: Record<string, unknown>, activeArcs: Array<Record<string, unknown>>, development: Record<string, unknown>, intelligence: Record<string, unknown>) {
  const behavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const current=activeArcs[0]||{};
  const currentArc=text(current.title || behavior.long_term_arc || character.growth_direction || "character remains in an ordinary-life arc until a durable pressure emerges");
  const nextPressure=text(current.next_pressure || behavior.long_term_arc_pressure || development.flaw_pressure || "let the next meaningful pressure test an established flaw or priority");
  const change=text(behavior.arc_change_in_progress || development.retained_growth || development.behavioral_effect || "no durable change proven yet");
  const relapse=text(behavior.arc_relapse_risk || character.emotional_defense || "old defenses may return under pressure without erasing earned growth");
  return { currentArc, nextPressure, changeInProgress:change, relapseRisk:relapse, instruction:"Long-term growth is slow, asymmetric, and testable. A character can improve in one domain while staying difficult in another. New behavior becomes durable only after repeated evidence across scenes. Under stress, old defenses may recur in a modified form rather than resetting the character to day one." };
}

function buildCloneProtection(character: Record<string, unknown>, dna: ReturnType<typeof inferCharacterDNA>) {
  const signature=[dna.emotionalDefense,dna.decisionBias,dna.careBehavior,dna.likelyMistake,text(character.speech_style),text(character.humor_style)].filter(Boolean).join(" | ");
  return { identitySignature: signature, forbiddenSharedPatterns:["tease → question as universal default","therapist reassurance","polished self-aware campus banter","cinematic smirk/gaze choreography","instant emotional fluency","automatic romantic availability"], instruction:"Before finalizing, imagine swapping the speaker name with another saved Velvet character. If the reaction logic still works unchanged, alter the decision, defense, mistake, priority, or social tactic until this person is identifiable without a name." };
}

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

const observableAsteriskAction = /\b(?:walk|walked|walking|follow|followed|following|nod|nodded|roll(?:ed)? (?:my|her|his|their) eyes|look|looked|glance|glanced|stare|stared|sit|sat|stand|stood|move|moved|step|stepped|turn|turned|shrug|shrugged|smile|smiled|laugh|laughed|open|opened|close|closed|take|took|pick|picked|grab|grabbed|hold|held|raise|raised|lower|lowered|touch|touched|hug|hugged|kiss|kissed|lean|leaned|wave|waved|point|pointed|pull|pulled|push|pushed|run|ran|leave|left|enter|entered|exit|exited|go|went|come|came|approach|approached|stop|stopped|pause|paused|drink|drank|eat|ate|type|typed|write|wrote|text|texted)\b/i;
const privateAsteriskMarker = /\b(?:because|since|when|where|while|thinking|think|thought|wondering|wonder|wondered|hoping|hope|hoped|wishing|wish|wished|remembering|remember|remembered|knowing|know|knew|feeling|feel|felt|wanting|want|wanted|hating|hate|hated|loving|love|loved|assuming|assume|assumed|guessing|guess|guessed|realizing|realize|realized|deciding|decide|decided|regretting|regret|regretted|pretending|pretend|pretended|in my head|to myself|internally)\b/i;

function visibleAsteriskSegment(raw: string) {
  const value=text(raw);
  if (!value) return "";
  const privateMatch=value.match(privateAsteriskMarker);
  if (!privateMatch || !Number.isFinite(privateMatch.index)) return observableAsteriskAction.test(value) ? value : "";
  const before=value.slice(0, privateMatch.index).replace(/[\s,;:—-]+$/g,"").trim();
  if (observableAsteriskAction.test(before)) return before;
  const after=value.slice(privateMatch.index).match(/\b(?:and then|then|and)\s+(.+)$/i)?.[1]?.trim() || "";
  if (observableAsteriskAction.test(after)) return after;
  return "";
}

export function sanitizeUserTurnForPerception(value: string) {
  return text(value).replace(/\*([^*]+)\*/gs, (_match, inner) => {
    const visible=visibleAsteriskSegment(String(inner||""));
    return visible ? `*${visible}*` : "";
  }).replace(/\s{2,}/g," ").trim();
}

export function extractUserActions(value: string) {
  const source = sanitizeUserTurnForPerception(value);
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



export function extractStickyBehaviorBoundaries(recentMessages: Array<Record<string, unknown>> = [], latestUserMessage = "") {
  const rawTurns = [...(recentMessages || []).filter((message)=>message?.sender === "user").map((message)=>text(message?.content)), text(latestUserMessage)].filter(Boolean).slice(-20);
  const state: Record<string, string | null> = {
    humor: null,
    touch: null,
    follow: null,
    probing: null,
    nickname: null,
  };
  for (const raw of rawTurns) {
    const value = normalized(sanitizeUserTurnForPerception(raw).replace(/\*[^*]*\*/gs, " "));
    if (!value) continue;
    if (/\b(?:stop|quit|don t|do not|can you stop|could you stop|enough with)\b.{0,34}\b(?:sarcasm|sarcastic|joking|jokes|teasing|bullshit|being funny)\b/.test(value)) state.humor = "No sarcasm, teasing, performative jokes, or witty digs until the user clearly reopens that behavior.";
    if (/\b(?:you can|it s fine to|you may|go ahead and)\b.{0,26}\b(?:joke|tease|be sarcastic|sarcasm)\b/.test(value)) state.humor = null;
    if (/\b(?:don t|do not|stop|quit)\b.{0,20}\b(?:touch|touching|grab|grabbing|hold|holding)\b|\b(?:back off|give me space|get off me|let go)\b/.test(value)) state.touch = "No touching or closing physical distance unless the user explicitly reopens contact.";
    if (/\b(?:you can|it s okay to|you may)\b.{0,20}\b(?:touch|hug|hold)\b/.test(value)) state.touch = null;
    if (/\b(?:don t|do not|stop|quit)\b.{0,20}\b(?:follow|following|come after|chase)\b|\b(?:leave me alone|go away)\b/.test(value)) state.follow = "Do not follow, chase, block, call after, or engineer a workaround to the user's request for distance.";
    if (/\b(?:come with me|follow me|you can follow|don t leave|stay with me)\b/.test(value)) state.follow = null;
    if (/\b(?:stop asking|don t ask|do not ask|drop it|leave it|stop digging|quit digging|don t dig|do not dig)\b/.test(value)) state.probing = "Do not probe, psychoanalyze, or keep asking about the declined subject unless the user reopens it.";
    if (/\b(?:we can talk about it|you can ask|ask me|i want to talk about it)\b/.test(value)) state.probing = null;
    if (/\b(?:don t|do not|stop|quit)\b.{0,24}\b(?:call me|nickname|pet name)\b/.test(value)) state.nickname = "Do not use the rejected nickname or pet-name behavior until the user explicitly permits it again.";
  }
  return Object.values(state).filter(Boolean) as string[];
}

export function deriveUserSelfReportLock(recentMessages: Array<Record<string, unknown>> = [], latestUserMessage = "") {
  const turns = [...(recentMessages || []).filter((message)=>message?.sender === "user").map((message)=>text(message?.content)), text(latestUserMessage)].filter(Boolean).slice(-6).reverse();
  for (const raw of turns) {
    const value = normalized(sanitizeUserTurnForPerception(raw).replace(/\*[^*]*\*/gs, " "));
    if (/\b(?:i\'m|im|i am) (?:fine|okay|ok)\b|\bnothing(?: is|'s) wrong\b|\bi don\'t know what you\'re talking about\b/.test(value)) {
      return "The user has most recently self-reported that they are fine/okay or rejected the hidden-problem framing. Treat that statement as authoritative. The character may privately remain uncertain, but must not diagnose a mask, hidden crisis, secret anger, or concealed motive as fact without NEW visible evidence.";
    }
    if (/\b(?:actually|okay,? i admit|fine,? i am|i\'m upset|i am upset|i\'m angry|i am angry|i\'m sad|i am sad|something is wrong)\b/.test(value)) return "";
  }
  return "";
}

function inferUserPresence(scene: Record<string, unknown>, userName: string, perceptibleUserTurn: string) {
  const actions = extractUserActions(perceptibleUserTurn).map(normalized).join(" ");
  const userKey = normalized(userName);
  const present = list(scene.present).map(normalized);
  const explicitExit = /\b(?:leave|left|walk away|walked away|head out|headed out|exit|exited|go home|went home|walk out|walked out)\b/.test(actions);
  const explicitEntry = /\b(?:enter|entered|come back|came back|return|returned|walk in|walked in|come in|came in|join|joined|sit back down|sat back down)\b/.test(actions);
  if (explicitExit) return "leaving" as const;
  if (explicitEntry) return "reentering" as const;
  if (!userKey || !present.length) return "unknown" as const;
  return present.includes(userKey) ? "present" as const : "absent" as const;
}

function buildTurnTakingEngine(input: StoryContractInput, present: string[], perceptibleUserTurn: string) {
  const profile = characterProfileBlob(input.character);
  const recent = (input.recentMessages || []).slice(-10);
  const recentCharacterTurns = recent.filter((message) => message?.sender === "character").map((message) => text(message?.content));
  const priorBehavior = input.intelligenceState?.human_behavior_state && typeof input.intelligenceState.human_behavior_state === "object"
    ? input.intelligenceState.human_behavior_state as Record<string, unknown>
    : {};
  const priorThreads = list((input.intelligenceState as Record<string, unknown> | undefined)?.conversation_threads || priorBehavior.conversation_threads).slice(-8);
  const plainVisible = text(perceptibleUserTurn.replace(/\*[^*]*\*/gs, " ")).replace(/\s+/g, " ");
  const visibleWords = plainVisible.split(/\s+/).filter(Boolean).length;
  const hasAction = /\*[^*]+\*/.test(perceptibleUserTurn);
  const kind = text(input.turnIntent?.kind || "ordinary");
  const isQuestion = Boolean(input.turnIntent?.isQuestion) || /\?\s*$/.test(plainVisible);
  const group = present.length >= 3;
  const interrupted = /\b(?:wait|hold on|hang on|sorry|what were you saying|you were saying|continue|go on)\b/i.test(plainVisible)
    || recentCharacterTurns.slice(-1).some((turn) => /(?:—|\.\.\.)\s*$/.test(turn.trim()));

  let mode: StoryContract["turnTakingEngine"]["mode"] = "ordinary";
  if (["silent_continue","return_main_pov"].includes(kind) || (!plainVisible && !hasAction)) mode = "silence";
  else if (!plainVisible && hasAction) mode = "action_only";
  else if (group) mode = "group";
  else if (interrupted) mode = "interrupted";
  else if (isQuestion) mode = "direct_answer";
  else if (visibleWords <= 5) mode = "micro";

  const dominance: "low"|"medium"|"high" = /\b(?:quiet|laconic|reserved|terse|few words|soft-spoken|soft spoken|withdrawn|not chatty)\b/.test(profile)
    ? "low" : /\b(?:talkative|chatty|dominant|assertive|outspoken|leader|commanding|verbose|rambl)\b/.test(profile) ? "high" : "medium";
  const silenceTolerance: "low"|"medium"|"high" = /\b(?:comfortable silence|quiet|laconic|reserved|guarded|patient|observant)\b/.test(profile)
    ? "high" : /\b(?:fills silence|hates silence|talkative|chatty|nervous talker|rambl)\b/.test(profile) ? "low" : "medium";
  const topicStamina: "low"|"medium"|"high" = /\b(?:stubborn|persistent|insistent|curious|inquisitive|won t let go|will not let go)\b/.test(profile)
    ? "high" : /\b(?:evasive|avoidant|changes? the subject|withdraw|deflect|private|guarded)\b/.test(profile) ? "low" : "medium";
  const interruptionStyle = /\b(?:interrupt|cuts? people off|impatient|blunt)\b/.test(profile)
    ? "may cut in when it fits the established voice; interruptions should be short and motivated"
    : /\b(?:patient|polite|careful listener|reserved|quiet)\b/.test(profile)
      ? "usually lets the other person finish; may answer after a beat rather than overlapping"
      : "interruptions are occasional and context-driven, never a default quirk";

  const recentQuestionEnds = recentCharacterTurns.slice(-4).filter((turn) => /\?\s*["”']?\s*$/.test(turn.trim())).length;
  const questionPolicy = recentQuestionEnds >= 2
    ? "0 questions preferred this turn; do not manufacture a follow-up merely to keep the exchange alive"
    : mode === "direct_answer"
      ? "answer first; at most one follow-up question only if this character genuinely needs it"
      : "0-1 question; statements, gestures, silence and topic endings are equally valid";

  let responseScale = "one natural turn; length must be earned by the beat";
  if (mode === "micro") responseScale = "usually 1-3 short spoken lines or one small action; roughly 10-55 words unless the moment is high-impact";
  if (mode === "action_only") responseScale = "0-2 spoken lines plus only the action needed to respond; do not reward a tiny action with a monologue";
  if (mode === "silence") responseScale = silenceTolerance === "high" ? "silence may remain silence; a gesture-only beat is valid" : "one small reaction is enough; do not force a speech";
  if (mode === "direct_answer") responseScale = "the first spoken clause should answer the literal question; explanation comes only if this person would actually give it";
  if (mode === "group") responseScale = "keep speaker traffic sparse; usually the addressed/relevant person plus at most one second speaker";

  const latestUserLower = normalized(plainVisible);
  const matchingThread = priorThreads.find((thread) => {
    const tokens = normalized(thread).split(/\s+/).filter((token) => token.length >= 5);
    return tokens.some((token) => latestUserLower.includes(token));
  }) || "";
  const returnThread = matchingThread || (interrupted && priorThreads.length ? priorThreads.at(-1) || "" : "");
  const maxSpeakers = group ? (/\b(?:everyone|all of you|you guys|guys)\b/i.test(plainVisible) ? 3 : 2) : 1;

  return {
    mode,
    dominance,
    silenceTolerance,
    topicStamina,
    interruptionStyle,
    responseScale,
    questionPolicy,
    activeThreads: priorThreads,
    returnThread,
    dropPermission: topicStamina === "high" ? "may keep one live topic active, but must not badger after a clear refusal" : "may let an exhausted topic die without replacing it with a new question",
    maxSpeakers,
    overlapAllowed: group || interrupted,
    instruction: "Human turn-taking beats completeness. Do not answer every clause like a form. A character may answer partially, delay, misunderstand, interrupt, let a subject die, return to an older thread, respond with a gesture, or say almost nothing when that is natural. Answer-before-flourish for direct questions. Never add a compulsory follow-up question. In groups, only characters with a reason to speak get a turn; silence from the rest is normal. Keep open conversation threads in hidden state without mentioning them until the moment naturally reactivates one.",
  };
}


function buildSocialGravityWorldIdentityEngine(input: StoryContractInput, scene: Record<string, unknown> = {}) {
  const identity = deriveSocialWorldIdentity(input.character);
  const recentCharacterReplies = (input.recentMessages || [])
    .filter((item) => String(item?.sender || item?.role || "") !== "user")
    .slice(-8)
    .map((item) => text(item?.content || item?.message || item?.text))
    .filter(Boolean);
  const recentUserTurns = (input.recentMessages || [])
    .filter((item) => String(item?.sender || item?.role || "") === "user")
    .slice(-6)
    .map((item) => text(item?.content || item?.message || item?.text))
    .filter(Boolean);
  const sceneContext = [
    text(scene.location), text(scene.activity || scene.current_activity),
    input.latestUserMessage, ...recentUserTurns.slice(-2), ...recentCharacterReplies.slice(-2),
  ].filter(Boolean).join(" ");
  const publicScene = isPublicSocialScene(sceneContext);
  const relevantDomains = identity.domains.filter((domain) => {
    const key = String(domain.key || "");
    const ctx = normalized(sceneContext);
    if (key === "campus") return /\b(?:campus|university|uni|college|student|library|class|lecture|cafeteria|quad|hallway|party|fraternity|sorority)\b/.test(ctx);
    if (key === "racing") return /\b(?:race|racing|track|circuit|garage|car meet|warehouse|street|underground|paddock|workshop)\b/.test(ctx);
    if (key === "athletics") return /\b(?:campus|university|gym|field|stadium|practice|game|match|training|locker room)\b/.test(ctx);
    if (key === "wealth") return publicScene || /\b(?:gala|hotel|restaurant|office|boardroom|vip|party)\b/.test(ctx);
    if (key === "public_fame") return publicScene;
    if (key === "power") return publicScene;
    if (key === "desirability") return publicScene;
    return publicScene;
  });
  const recentWindow = recentCharacterReplies.slice(-4).join(" ");
  const substantialRecent = recentCharacterReplies.slice(-5).filter((value) => value.split(/\s+/).length >= 10);
  const socialSeen = socialWorldFootprint(recentWindow);
  const approachSeen = outsideApproachFootprint(recentWindow);
  const privateOrCrisis = /\b(?:alone|private|bedroom|bathroom|hospital|funeral|emergency|panic|crying|leave me alone|go away|do not want to talk|don't want to talk)\b/.test(normalized(input.latestUserMessage));
  const manifestationDue = Boolean(identity.strongGravity && publicScene && relevantDomains.length && !privateOrCrisis && substantialRecent.length >= 2 && !socialSeen);
  const racingRelevant = relevantDomains.some((domain) => String(domain.key || "") === "racing");
  const approachFriendly = identity.romanticMagnetism
    || (!identity.fearedRespect && identity.approachTypes.some((item) => /flirt|attention|network|fan|status-seeking/i.test(item)))
    || (identity.fearedRespect && racingRelevant && identity.approachTypes.some((item) => /rival|crew|driver/i.test(item)));
  const approachWindowDue = Boolean(approachFriendly && publicScene && !privateOrCrisis && substantialRecent.length >= 3 && !approachSeen);
  const turnKind = normalized(input.turnIntent?.kind);
  const lifeQuestion = /\b(?:what have you been up to|what have you been doing|what do you do|what are you doing lately|where have you been|why were you busy|why are you busy|what keeps you busy|how was practice|how was the race|how is work|how's work)\b/.test(normalized(input.latestUserMessage));
  const longGap = ["time_skip","return_main_pov"].includes(turnKind);
  const primaryLifeDomains = identity.domains.filter((domain) => !["campus","desirability"].includes(String(domain.key || "")));
  const priorityLifeMarkers = primaryLifeDomains.length
    ? [...new Set(primaryLifeDomains.flatMap((domain) => Array.isArray(domain.lifeMarkers) ? domain.lifeMarkers : []))]
    : identity.lifeDomains;
  const roleLife = priorityLifeMarkers.length > 0;
  const recentLife = priorityLifeMarkers.some((marker) => new RegExp(`\\b${String(marker).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`).test(normalized([...recentUserTurns.slice(-4), ...recentCharacterReplies.slice(-5)].join(" "))));
  const lifeContinuityDue = Boolean(roleLife && (lifeQuestion || longGap || input.opening) && !recentLife);

  return {
    identitySignature: identity.identitySignature,
    recognitionLevel: identity.recognitionLevel,
    reputation: identity.reputation.slice(0, 8),
    domains: identity.domains.slice(0, 8),
    approachTypes: identity.approachTypes.slice(0, 10),
    socialEffects: identity.socialEffects.slice(0, 10),
    lifeDomains: priorityLifeMarkers.slice(0, 12),
    publicScene,
    relevantDomains: relevantDomains.map((domain) => String(domain.label || domain.key || "")).filter(Boolean).slice(0, 6),
    manifestationDue,
    approachWindowDue,
    lifeContinuityDue,
    manifestationPolicy: identity.strongGravity
      ? "The world must remember this identity. In relevant public scenes, show one small domain-appropriate consequence often enough that anonymity never becomes the default; one footprint is enough and crowd spectacle is not required."
      : "No special public reaction is required unless canon earns it.",
    outsideAttentionPolicy: identity.romanticMagnetism
      ? "Other people may notice, approach, flirt, invite, message or seek this character independently of the protagonist. Do not erase or instantly neutralize outside attention just to protect the central ship; the lead may respond according to personality and relationship."
      : "Outside approaches should match the actual reputation domain, not default to flirting.",
    domainLifePolicy: roleLife
      ? "Their work/status/domain continues off-screen. Let canonical roles create ordinary obligations, contacts and consequences without inventing named events, schedules or people that the profile never established."
      : "Do not manufacture a profession or public life.",
    instruction: "PUBLIC IDENTITY IS HARD CANON, NOT DECORATION. The character does not become socially anonymous when romance starts. Fame, fear, respect, wealth, athletic status, desirability, leadership and domain reputation must change how the surrounding world behaves only where that domain is relevant. Domain fame is scoped: a street racer may be huge in racing circles and merely known on campus; a campus heartthrob may be ordinary in another city. Use small organic evidence—recognition, greetings, approaches, deference, rivals, teammates, staff behavior, invitations, social access—rather than exposition. Never make every room a fan event. Never glue the lead permanently beside the protagonist. Other people can approach or flirt; let the lead choose a character-specific response instead of deleting the opportunity. Their occupation/area remains active off-screen and should reappear naturally after time passes or when the user asks about their life.",
  };
}

export function compileStoryContract(input: StoryContractInput): StoryContract {
  const scene = input.sceneState || {};
  const perceptibleUserTurn = sanitizeUserTurnForPerception(input.latestUserMessage);
  const perceptibleRecentMessages = (input.recentMessages || []).map((message) => message?.sender === "user" ? { ...message, content: sanitizeUserTurnForPerception(text(message?.content)) } : message);
  const actions = extractUserActions(perceptibleUserTurn);
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
  const boundaries = extractBoundaries(perceptibleUserTurn);
  const activeBehaviorBoundaries = extractStickyBehaviorBoundaries(input.recentMessages || [], input.latestUserMessage);
  const selfReportLock = deriveUserSelfReportLock(input.recentMessages || [], input.latestUserMessage);
  const userPresence = inferUserPresence(scene, input.userName, perceptibleUserTurn);
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
  const riskLicensed = /race|racing|car|motor|party|fraternity|club|bar|trespass|illegal|street|campus|noise|public/i.test([input.character.role,input.character.world,input.character.scenario,scene.location,perceptibleUserTurn].map(text).join(" "));
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
  const characterDNA = inferCharacterDNA(input.character);
  const reactionEngine = buildReactionEngine(input.character, perceptibleUserTurn, recentCharacterTurns, boundaries, characterDNA);

  const priorBehavior = intelligence.human_behavior_state && typeof intelligence.human_behavior_state === "object" ? intelligence.human_behavior_state as Record<string, unknown> : {};
  const autonomousLifeEngine = inferAutonomousLife(input.character, intelligence, dueCalendarEvents, activePlans);
  const consequenceEngine = buildConsequenceEngine(activeConsequences, activeConflicts, development, intelligence);
  const sceneRhythmEngine = buildSceneRhythmEngine(recentCharacterTurns, boundaries, activeConflicts, perceptibleUserTurn);
  const selectiveMemoryEngine = buildSelectiveMemoryEngine(input.memories || [], perceptibleUserTurn, intelligence);
  const relationshipExpectations = buildRelationshipExpectations(input.character, development, intelligence, activeConflicts);
  const writingPreferences = input.writingPreferences && typeof input.writingPreferences === "object" ? input.writingPreferences : {};
  const relationshipIntelligenceEngine = buildRelationshipIntelligenceEngine(input.character, development, intelligence, chemistry, milestones, activeConflicts, selectiveMemoryEngine, writingPreferences);
  const relationshipChemistryV2 = deriveRelationshipChemistryV2({
    character: input.character, userName: input.userName, latestUserMessage: perceptibleUserTurn,
    recentMessages: input.recentMessages || [], developmentState: development, intelligenceState: intelligence,
    chemistryProfile: chemistry, activeConflicts, memories: input.memories || [], milestones,
    baseRelationship: relationshipIntelligenceEngine,
  });
  const longTermCharacterEvolution = deriveLongTermCharacterEvolution({
    character: input.character,
    developmentState: development,
    intelligenceState: intelligence,
    memories: input.memories || [],
    milestones,
    activeArcs,
    recentMessages: input.recentMessages || [],
    relationshipChemistry: relationshipChemistryV2,
    latestUserMessage: perceptibleUserTurn,
  });
  const embodiedAwarenessSalience = deriveEmbodiedAwarenessSalience({
    latestUserMessage: input.latestUserMessage,
    recentMessages: input.recentMessages || [],
  });
  const discourseCoherenceEventTruth = deriveDiscourseCoherenceEventTruth({
    latestUserMessage: input.latestUserMessage,
    recentMessages: input.recentMessages || [],
    embodiedAwareness: embodiedAwarenessSalience,
  });
  const emotionalContinuityEngine = buildEmotionalContinuityEngine(development, intelligence, activeConflicts, activeConsequences);
  const sceneVarietyEngine = buildSceneVarietyEngine(scene, recentCharacterTurns, intelligence, sceneRhythmEngine);
  const npcSocialNetworkEngine = buildNpcSocialNetworkEngine(persistent, input.castConnections || [], input.knowledgeLedger || [], text(input.character.name), input.userName);
  const npcEcosystemSocialNetworkV3 = deriveNpcEcosystemSocialNetworkV3({
    persistentCast:persistent,
    castConnections:input.castConnections || [],
    knowledgeLedger:input.knowledgeLedger || [],
    recentMessages:input.recentMessages || [],
    sceneState:scene,
    leadName:text(input.character.name),
    userName:input.userName,
  });
  const calendarLifeSimulation = deriveCalendarLifeSimulation({
    character: input.character,
    latestUserMessage: input.latestUserMessage,
    recentMessages: input.recentMessages || [],
    sceneState: scene,
    calendarEvents: input.calendarEvents || [],
    storyPlans: input.storyPlans || [],
    intelligenceState: intelligence,
    persistentCast: persistent,
  });
  const worldConsequencesCausalTimeline = deriveWorldConsequencesCausalTimeline({
    character: input.character,
    latestUserMessage: input.latestUserMessage,
    recentMessages: input.recentMessages || [],
    sceneState: scene,
    storyConsequences: input.storyConsequences || [],
    calendarEvents: input.calendarEvents || [],
    storyPlans: input.storyPlans || [],
    storyArcs: input.storyArcs || [],
    storyConflicts: input.storyConflicts || [],
    knowledgeLedger: input.knowledgeLedger || [],
    castConnections: input.castConnections || [],
    npcEcosystem: npcEcosystemSocialNetworkV3,
    calendarLifeSimulation,
  });
  const longTermMemoryEngine = buildLongTermMemory4Engine(input.memories || [], perceptibleUserTurn);
  const writingStyleDirector = buildWritingStyleDirector(writingPreferences, recentPatterns, sceneRhythmEngine);
  const humanImperfectionEngine = buildHumanImperfectionEngine(characterDNA, input.character, intelligence);
  const npcAutonomyEngine = buildNpcAutonomyEngine(persistent, input.castConnections || [], present);
  const romanceProgressionEngine = buildRomanceProgressionEngine(input.character, development, chemistry, milestones, activeConflicts);
  const longTermArcEngine = buildLongTermArcEngine(input.character, activeArcs, development, intelligence);
  const cloneProtection = buildCloneProtection(input.character, characterDNA);
  const perceptionRealismEngine = buildPerceptionRealismEngine(input, actions, present, mode);
  const turnTakingEngine = buildTurnTakingEngine(input, present, perceptibleUserTurn);
  const agencyMomentumEngine = buildAgencyMomentumEngine(input, autonomousLifeEngine, turnTakingEngine, sceneRhythmEngine, perceptibleUserTurn, userPresence);
  const characterIntentEngine = buildCharacterIntentEngine(input, agencyMomentumEngine, characterDNA, perceptibleUserTurn);
  const socialGravityWorldIdentityEngine = buildSocialGravityWorldIdentityEngine(input, scene);
  const scenePhysicsEngine = buildScenePhysicsEngine(input, present, userPresence);
  const sceneIntelligenceDynamicWorld = deriveSceneIntelligenceDynamicWorld({
    latestUserMessage: input.latestUserMessage,
    recentMessages: input.recentMessages || [],
    sceneState: scene,
    intelligenceState: intelligence,
    character: input.character,
    socialGravity: socialGravityWorldIdentityEngine,
    agency: agencyMomentumEngine,
    intent: characterIntentEngine,
    scenePhysics: scenePhysicsEngine,
    embodied: embodiedAwarenessSalience,
  });
  const sceneDirectorV342 = deriveSceneDirectorV342({
    character: input.character,
    userName: input.userName,
    // v3.42 must direct from the perceptible user turn, never private narration.
    latestUserMessage: perceptibleUserTurn,
    recentMessages: input.recentMessages || [],
    sceneState: scene,
    sceneIntelligence: sceneIntelligenceDynamicWorld,
    sceneVariety: sceneVarietyEngine,
    calendarLifeSimulation,
    causalTimeline: worldConsequencesCausalTimeline,
    npcEcosystem: npcEcosystemSocialNetworkV3,
    relationshipChemistry: relationshipChemistryV2,
    activeArcs,
    activeConflicts,
    activePlans,
  });

  const longStoryMemoryV343 = deriveLongStoryMemoryV343({
    character: input.character,
    userName: input.userName,
    latestUserMessage: perceptibleUserTurn,
    recentMessages: perceptibleRecentMessages,
    memories: input.memories || [],
    storyRecap: input.storyRecap || "",
    storyChapters: input.storyChapters || [],
    activeChapter: input.activeChapter || {},
    storyBible: input.storyBible || [],
    persistentCast: input.persistentCast || [],
    castConnections: input.castConnections || [],
    knowledgeLedger: input.knowledgeLedger || [],
    storyArcs: input.storyArcs || [],
    storyPlans: input.storyPlans || [],
    storyConflicts: input.storyConflicts || [],
    storyMilestones: input.storyMilestones || [],
    storyConsequences: input.storyConsequences || [],
    unresolvedThreads: input.unresolvedThreads || [],
  });

  const narrativeArcIntelligenceV344 = deriveNarrativeArcIntelligenceV344({
    character: input.character,
    latestUserMessage: perceptibleUserTurn,
    recentMessages: perceptibleRecentMessages,
    memories: input.memories || [],
    storyArcs: input.storyArcs || [],
    storyConflicts: input.storyConflicts || [],
    storyPlans: input.storyPlans || [],
    storyMilestones: input.storyMilestones || [],
    developmentState: input.developmentState || {},
    relationshipChemistry: relationshipChemistryV2,
    longTermEvolution: longTermCharacterEvolution,
    longStoryMemory: longStoryMemoryV343,
    sceneDirector: sceneDirectorV342,
  });

  const proseIntelligenceV345 = deriveProseIntelligenceV345({
    latestUserMessage: perceptibleUserTurn,
    recentCharacterReplies: perceptibleRecentMessages.filter((message) => message?.sender === "character").map((message) => text(message?.content)),
    writingStyleDirector,
    turnTaking: turnTakingEngine,
    sceneDirector: sceneDirectorV342,
    characterIntent: characterIntentEngine,
    character: input.character,
  });
  const generationOrchestratorV346 = deriveGenerationOrchestratorV346({
    latestUserMessage: perceptibleUserTurn,
    recentMessages: perceptibleRecentMessages,
    turnTaking: turnTakingEngine,
    sceneDirector: sceneDirectorV342,
    longStoryMemory: longStoryMemoryV343,
    narrativeArc: narrativeArcIntelligenceV344,
    npcEcosystem: npcEcosystemSocialNetworkV3,
    calendarLifeSimulation,
    causalTimeline: worldConsequencesCausalTimeline,
    relationshipChemistry: relationshipChemistryV2,
    embodied: embodiedAwarenessSalience,
    sceneState: scene,
  });
  const recoveryIntegrityV347 = buildRecoveryCheckpointV347({
    sceneState: scene,
    relationshipState: input.relationshipState || {},
    developmentState: input.developmentState || {},
    intelligenceState: intelligence,
    unresolvedThreads: input.unresolvedThreads || [],
    storyRecap: input.storyRecap || "",
    latestUserMessage: perceptibleUserTurn,
  });
  const performanceMobileV348 = derivePerformanceMobileV348({
    orchestrator: generationOrchestratorV346,
    turnTaking: turnTakingEngine,
    recentMessageCount: perceptibleRecentMessages.length,
    memoryRetrievalCount: longStoryMemoryV343.retrievalSet.length,
  });

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
  else if (discourseCoherenceEventTruth.clarificationDue) objective = "Answer the user's clarification request immediately and literally. Resolve the actual prior referent before banter, atmosphere, social gravity, or a repeated callback. If the prior wording had no supported referent, admit the wording was wrong instead of inventing an event.";
  else if (embodiedAwarenessSalience.recognitionDue) objective = "Respond to the user's current embodied/energy change before old banter, flirt momentum, decorative activity or the previous scene objective. Adapt in character without claiming private wording as knowledge or taking control of the user. Then resume only what still fits.";
  else if (calendarLifeSimulation.dueCommitments.length) objective += " Preserve the due commitment/time pressure in this beat. Do not erase it, invent a conflicting precise schedule, or make the character magically free.";
  else if (socialGravityWorldIdentityEngine.manifestationDue || socialGravityWorldIdentityEngine.approachWindowDue) objective += " This public beat is due for one SMALL domain-appropriate social-gravity manifestation. Make the world remember who this person is without turning the scene into spectacle.";
  else if (socialEcosystems.length) objective += " In a relevant public scene, let the established social ecosystem exist organically without forcing jealousy or stealing the scene.";
  if (!boundaries.length && socialGravityWorldIdentityEngine.lifeContinuityDue) objective += " Re-anchor one canonical life/domain thread because the story is at a life-question/time-gap boundary; do not invent named obligations.";
  if (!boundaries.length && !discourseCoherenceEventTruth.clarificationDue && !embodiedAwarenessSalience.recognitionDue) {
    if (sceneDirectorV342.userMomentumLock) objective += " The user's visible action/question owns the camera; do not hijack it with another thread or interruption.";
    else if (sceneDirectorV342.naturalEndingDue) objective += " Let the beat land cleanly if it has finished; no teaser or rescue hook.";
    else if (sceneDirectorV342.direction === "surface_one_thread") objective += " Surface at most ONE director-selected grounded thread and leave the rest off-screen.";
  }
  if (!boundaries.length && narrativeArcIntelligenceV344.progressionMode === "hold") objective += " Do not force a relationship/character milestone merely to create progression; let the current behavior carry the arc.";
  else if (!boundaries.length && narrativeArcIntelligenceV344.progressionMode === "allow_micro_shift") objective += " One small earned behavioral shift may register, but do not skip arc dependencies or turn it into a milestone.";
  else if (!boundaries.length && narrativeArcIntelligenceV344.progressionMode === "allow_meaningful_shift") objective += " A meaningful shift is licensed only if the present beat naturally earns it; payoff is optional, not mandatory.";

  return {
    authority: ["latest explicit canon correction", "latest visible user turn", "story bible canon", "visible transcript", "confirmed memory", "stored derived state"],
    finalState: {
      location: text(scene.location || "unknown"),
      time: text(scene.time_label || "unknown"),
      present,
      communicationMedium: mode,
    },
    userAuthored: {
      literalTurn: perceptibleUserTurn,
      stagedActions: actions,
      boundaries,
      activeBehaviorBoundaries,
      selfReportLock,
      userPresence,
      movementIsExplicit,
    },
    characterBehavior: {
      socialEcosystems,
      voiceAnchors: [input.character.speech_style, input.character.voice_vocabulary, input.character.humor_style, input.character.conflict_style]
        .map(text).filter(Boolean).slice(0, 4),
      independence: Number(input.character.character_independence || 80),
      initiative,
    },
    characterDNA,
    reactionEngine,
    autonomousLifeEngine,
    agencyMomentumEngine,
    characterIntentEngine,
    socialGravityWorldIdentityEngine,
    scenePhysicsEngine,
    discourseCoherenceEventTruth,
    sceneIntelligenceDynamicWorld,
    consequenceEngine,
    sceneRhythmEngine,
    selectiveMemoryEngine,
    relationshipExpectations,
    relationshipIntelligenceEngine,
    relationshipChemistryV2,
    longTermCharacterEvolution,
    embodiedAwarenessSalience,
    emotionalContinuityEngine,
    sceneVarietyEngine,
    npcSocialNetworkEngine,
    npcEcosystemSocialNetworkV3,
    calendarLifeSimulation,
    worldConsequencesCausalTimeline,
    sceneDirectorV342,
    longStoryMemoryV343,
    narrativeArcIntelligenceV344,
    proseIntelligenceV345,
    generationOrchestratorV346,
    recoveryIntegrityV347,
    performanceMobileV348,
    longTermMemoryEngine,
    writingStyleDirector,
    humanImperfectionEngine,
    npcAutonomyEngine,
    romanceProgressionEngine,
    longTermArcEngine,
    cloneProtection,
    perceptionRealismEngine,
    turnTakingEngine,
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
      storyNow: calendarLifeSimulation.storyClock.raw || text(scene.time_label || "unknown"),
      recentElapsed: calendarLifeSimulation.elapsedContinuity.recent || text(intelligence.elapsed_since_previous || "unspecified"),
      upcoming: calendarLifeSimulation.upcomingEvents.slice(0, 5),
      instruction: calendarLifeSimulation.instruction,
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
    characterDNA: contract.characterDNA,
    reactionEngine: contract.reactionEngine,
    autonomy: contract.autonomousLifeEngine,
    agencyMomentum: contract.agencyMomentumEngine,
    characterIntent: contract.characterIntentEngine,
    socialWorldIdentity: {
      identitySignature: contract.socialGravityWorldIdentityEngine.identitySignature,
      recognitionLevel: contract.socialGravityWorldIdentityEngine.recognitionLevel,
      reputation: take(contract.socialGravityWorldIdentityEngine.reputation, 5),
      domains: take(contract.socialGravityWorldIdentityEngine.domains, 5).map((item) => pick(item as Record<string, unknown>, ["key","label","recognition","knownFor","approachTypes","socialEffects"])),
      relevantDomains: take(contract.socialGravityWorldIdentityEngine.relevantDomains, 4),
      manifestationDue: contract.socialGravityWorldIdentityEngine.manifestationDue,
      approachWindowDue: contract.socialGravityWorldIdentityEngine.approachWindowDue,
      lifeContinuityDue: contract.socialGravityWorldIdentityEngine.lifeContinuityDue,
      manifestationPolicy: contract.socialGravityWorldIdentityEngine.manifestationPolicy,
      outsideAttentionPolicy: contract.socialGravityWorldIdentityEngine.outsideAttentionPolicy,
      domainLifePolicy: contract.socialGravityWorldIdentityEngine.domainLifePolicy,
    },
    scenePhysics: contract.scenePhysicsEngine,
    discourseCoherence: contract.discourseCoherenceEventTruth,
    sceneIntelligence: contract.sceneIntelligenceDynamicWorld,
    sceneDirector342: {
      scenePurpose: contract.sceneDirectorV342.scenePurpose,
      purposeBudget: contract.sceneDirectorV342.purposeBudget,
      direction: contract.sceneDirectorV342.direction,
      foregroundThreads: take(contract.sceneDirectorV342.foregroundThreads, 2),
      mentionThreads: take(contract.sceneDirectorV342.mentionThreads, 2),
      backgroundThreads: take(contract.sceneDirectorV342.backgroundThreads, 5),
      dormantThreads: take(contract.sceneDirectorV342.dormantThreads, 6),
      userMomentumLock: contract.sceneDirectorV342.userMomentumLock,
      userMomentum: contract.sceneDirectorV342.userMomentum,
      interruptionBudget: contract.sceneDirectorV342.interruptionBudget,
      allowedEntrants: take(contract.sceneDirectorV342.allowedEntrants, 6),
      foregroundActors: take(contract.sceneDirectorV342.foregroundActors, 3),
      backgroundActors: take(contract.sceneDirectorV342.backgroundActors, 6),
      maxActiveSpeakers: contract.sceneDirectorV342.maxActiveSpeakers,
      cooldownActive: contract.sceneDirectorV342.cooldownActive,
      tensionMode: contract.sceneDirectorV342.tensionMode,
      romanceMonopolyGuard: contract.sceneDirectorV342.romanceMonopolyGuard,
      noveltyAvoid: take(contract.sceneDirectorV342.noveltyAvoid, 5),
      naturalEndingAllowed: contract.sceneDirectorV342.naturalEndingAllowed,
      naturalEndingDue: contract.sceneDirectorV342.naturalEndingDue,
      sceneSelectionPolicy: contract.sceneDirectorV342.sceneSelectionPolicy,
      interruptionPolicy: contract.sceneDirectorV342.interruptionPolicy,
      attentionPolicy: contract.sceneDirectorV342.attentionPolicy,
      pacingPolicy: contract.sceneDirectorV342.pacingPolicy,
      romancePolicy: contract.sceneDirectorV342.romancePolicy,
      closurePolicy: contract.sceneDirectorV342.closurePolicy,
    },
    longStoryMemory343: {
      immutableCanon: take(contract.longStoryMemoryV343.immutableCanon, 8),
      longTermHistory: take(contract.longStoryMemoryV343.longTermHistory, 8),
      activeThreads: take(contract.longStoryMemoryV343.activeThreads, 6),
      relationshipTexture: take(contract.longStoryMemoryV343.relationshipTexture, 6),
      entityMemory: take(contract.longStoryMemoryV343.entityMemory, 6),
      retrievalSet: take(contract.longStoryMemoryV343.retrievalSet, 8),
      dormantThreads: take(contract.longStoryMemoryV343.dormantThreads, 6),
      resolvedThreads: take(contract.longStoryMemoryV343.resolvedThreads, 6),
      perspectiveMemory: {
        objective: take(contract.longStoryMemoryV343.perspectiveMemory.objective, 8),
        characterKnown: take(contract.longStoryMemoryV343.perspectiveMemory.characterKnown, 8),
        publicKnown: take(contract.longStoryMemoryV343.perspectiveMemory.publicKnown, 6),
      },
      contradictionWarnings: take(contract.longStoryMemoryV343.contradictionWarnings, 4),
      retrievalPolicy: contract.longStoryMemoryV343.retrievalPolicy,
      compressionPolicy: contract.longStoryMemoryV343.compressionPolicy,
      perspectivePolicy: contract.longStoryMemoryV343.perspectivePolicy,
      falseMemoryPolicy: contract.longStoryMemoryV343.falseMemoryPolicy,
    },
    narrativeArc344: {
      arcs: take(contract.narrativeArcIntelligenceV344.arcs, 8).map((item) => pick(item as Record<string, unknown>, ["key","title","domain","status","stage","evidenceCount","repetitionCount","momentum","blockers","nextAllowedShift","payoffReady"])),
      relationshipPace: contract.narrativeArcIntelligenceV344.relationshipPace,
      behaviorProgression: contract.narrativeArcIntelligenceV344.behaviorProgression,
      stagnationWarnings: take(contract.narrativeArcIntelligenceV344.stagnationWarnings, 6),
      payoffCandidates: take(contract.narrativeArcIntelligenceV344.payoffCandidates, 6),
      resolvedArcLocks: take(contract.narrativeArcIntelligenceV344.resolvedArcLocks, 8),
      dormantArcs: take(contract.narrativeArcIntelligenceV344.dormantArcs, 6),
      conflictEvolution: take(contract.narrativeArcIntelligenceV344.conflictEvolution, 6),
      progressionMode: contract.narrativeArcIntelligenceV344.progressionMode,
      escalationBudget: contract.narrativeArcIntelligenceV344.escalationBudget,
      personalityGuard: contract.narrativeArcIntelligenceV344.personalityGuard,
      arcDependencyPolicy: contract.narrativeArcIntelligenceV344.arcDependencyPolicy,
      payoffPolicy: contract.narrativeArcIntelligenceV344.payoffPolicy,
      stagnationPolicy: contract.narrativeArcIntelligenceV344.stagnationPolicy,
    },
    proseIntelligence345: contract.proseIntelligenceV345,
    orchestrator346: {
      mode: contract.generationOrchestratorV346.mode,
      activeModules: take(contract.generationOrchestratorV346.activeModules, 12),
      sleepingModules: take(contract.generationOrchestratorV346.sleepingModules, 12),
      contextBudgetChars: contract.generationOrchestratorV346.contextBudgetChars,
      immediateMessageCount: contract.generationOrchestratorV346.immediateMessageCount,
      olderMessageCount: contract.generationOrchestratorV346.olderMessageCount,
      memorySlots: contract.generationOrchestratorV346.memorySlots,
      loreSlots: contract.generationOrchestratorV346.loreSlots,
      castSlots: contract.generationOrchestratorV346.castSlots,
      responseTokenCeiling: contract.generationOrchestratorV346.responseTokenCeiling,
      priorityOrder: contract.generationOrchestratorV346.priorityOrder,
    },
    recovery347: {
      checkpointId: contract.recoveryIntegrityV347.checkpointId,
      stateFingerprint: contract.recoveryIntegrityV347.stateFingerprint,
      userDigest: contract.recoveryIntegrityV347.userDigest,
      idempotencyPolicy: contract.recoveryIntegrityV347.idempotencyPolicy,
      rewindPolicy: contract.recoveryIntegrityV347.rewindPolicy,
      recoveryPolicy: contract.recoveryIntegrityV347.recoveryPolicy,
    },
    performance348: contract.performanceMobileV348,
    consequences: contract.consequenceEngine,
    sceneRhythm: contract.sceneRhythmEngine,
    selectiveMemory: contract.selectiveMemoryEngine,
    expectations: contract.relationshipExpectations,
    relationshipIntelligence: contract.relationshipIntelligenceEngine,
    relationshipChemistryV2: contract.relationshipChemistryV2,
    longTermCharacterEvolution: {
      coreIdentity: take(contract.longTermCharacterEvolution.coreIdentity, 6),
      mutableDefenses: take(contract.longTermCharacterEvolution.mutableDefenses, 5),
      learnedBehavior: take(contract.longTermCharacterEvolution.learnedBehavior, 6),
      durableShifts: take(contract.longTermCharacterEvolution.durableShifts, 6),
      relationshipSpecificGrowth: take(contract.longTermCharacterEvolution.relationshipSpecificGrowth, 5),
      activeBeliefs: take(contract.longTermCharacterEvolution.activeBeliefs, 5),
      challengedBeliefs: take(contract.longTermCharacterEvolution.challengedBeliefs, 4),
      growthMilestones: take(contract.longTermCharacterEvolution.growthMilestones, 6),
      regression: contract.longTermCharacterEvolution.regression,
      growthGate: contract.longTermCharacterEvolution.growthGate,
      offscreenGrowth: contract.longTermCharacterEvolution.offscreenGrowth,
      antiReplacement: contract.longTermCharacterEvolution.antiReplacement,
    },
    embodiedAwareness: contract.embodiedAwarenessSalience,
    emotionalContinuity: contract.emotionalContinuityEngine,
    sceneVariety: contract.sceneVarietyEngine,
    npcSocialNetwork: {
      bonds: take(contract.npcSocialNetworkEngine.bonds, 8),
      independentBonds: take(contract.npcSocialNetworkEngine.independentBonds, 5),
      rumorFlow: take(contract.npcSocialNetworkEngine.rumorFlow, 5),
      socialAsymmetry: take(contract.npcSocialNetworkEngine.socialAsymmetry, 4),
    },
    npcEcosystemV3: {
      nodes: take(contract.npcEcosystemSocialNetworkV3.nodes, 10),
      edges: take(contract.npcEcosystemSocialNetworkV3.edges, 12),
      independentEdges: take(contract.npcEcosystemSocialNetworkV3.independentEdges, 8),
      circles: take(contract.npcEcosystemSocialNetworkV3.circles, 7),
      recurringCandidates: take(contract.npcEcosystemSocialNetworkV3.recurringCandidates, 7),
      activeNpcThreads: take(contract.npcEcosystemSocialNetworkV3.activeNpcThreads, 8),
      informationRoutes: take(contract.npcEcosystemSocialNetworkV3.informationRoutes, 8),
      groupTraffic: contract.npcEcosystemSocialNetworkV3.groupTraffic,
      recurrencePolicy: contract.npcEcosystemSocialNetworkV3.recurrencePolicy,
      relationshipContinuityPolicy: contract.npcEcosystemSocialNetworkV3.relationshipContinuityPolicy,
      informationFlowPolicy: contract.npcEcosystemSocialNetworkV3.informationFlowPolicy,
      availabilityPolicy: contract.npcEcosystemSocialNetworkV3.availabilityPolicy,
      crossCirclePolicy: contract.npcEcosystemSocialNetworkV3.crossCirclePolicy,
      antiOrbitPolicy: contract.npcEcosystemSocialNetworkV3.antiOrbitPolicy,
    },
    calendarLifeSimulation: {
      storyClock: contract.calendarLifeSimulation.storyClock,
      temporalAnchors: take(contract.calendarLifeSimulation.temporalAnchors, 10),
      upcomingEvents: take(contract.calendarLifeSimulation.upcomingEvents, 8),
      recurringRoutines: take(contract.calendarLifeSimulation.recurringRoutines, 6),
      lifeDomains: take(contract.calendarLifeSimulation.lifeDomains, 6),
      availability: contract.calendarLifeSimulation.availability,
      activePlans: take(contract.calendarLifeSimulation.activePlans, 6),
      dueCommitments: take(contract.calendarLifeSimulation.dueCommitments, 6),
      scheduleConflicts: take(contract.calendarLifeSimulation.scheduleConflicts, 5),
      travelConstraints: take(contract.calendarLifeSimulation.travelConstraints, 4),
      elapsedContinuity: contract.calendarLifeSimulation.elapsedContinuity,
      sceneDuration: contract.calendarLifeSimulation.sceneDuration,
      calendarPolicy: contract.calendarLifeSimulation.calendarPolicy,
      recurringRoutinePolicy: contract.calendarLifeSimulation.recurringRoutinePolicy,
      availabilityPolicy: contract.calendarLifeSimulation.availabilityPolicy,
      planCommitmentPolicy: contract.calendarLifeSimulation.planCommitmentPolicy,
      travelPolicy: contract.calendarLifeSimulation.travelPolicy,
      offscreenLifePolicy: contract.calendarLifeSimulation.offscreenLifePolicy,
      temporalLanguagePolicy: contract.calendarLifeSimulation.temporalLanguagePolicy,
    },
    causalTimeline: {
      activeChains: take(contract.worldConsequencesCausalTimeline.activeChains, 8),
      causalLedger: take(contract.worldConsequencesCausalTimeline.causalLedger, 8),
      institutionalMemory: take(contract.worldConsequencesCausalTimeline.institutionalMemory, 6),
      liveCommitmentEffects: take(contract.worldConsequencesCausalTimeline.liveCommitmentEffects, 6),
      cancelledOrResolved: take(contract.worldConsequencesCausalTimeline.cancelledOrResolved, 6),
      rumorBeliefs: take(contract.worldConsequencesCausalTimeline.rumorBeliefs, 5),
      parallelLifeWindows: take(contract.worldConsequencesCausalTimeline.parallelLifeWindows, 6),
      currentEventImportance: contract.worldConsequencesCausalTimeline.currentEventImportance,
      consequenceBudget: contract.worldConsequencesCausalTimeline.consequenceBudget,
      causeEffectPolicy: contract.worldConsequencesCausalTimeline.causeEffectPolicy,
      consequencePersistencePolicy: contract.worldConsequencesCausalTimeline.consequencePersistencePolicy,
      consequenceDecayPolicy: contract.worldConsequencesCausalTimeline.consequenceDecayPolicy,
      institutionalMemoryPolicy: contract.worldConsequencesCausalTimeline.institutionalMemoryPolicy,
      beliefFactPolicy: contract.worldConsequencesCausalTimeline.beliefFactPolicy,
      offscreenCausalityPolicy: contract.worldConsequencesCausalTimeline.offscreenCausalityPolicy,
      crossSystemPolicy: contract.worldConsequencesCausalTimeline.crossSystemPolicy,
      minorEventPolicy: contract.worldConsequencesCausalTimeline.minorEventPolicy,
    },
    longTermMemory4: {
      core: take(contract.longTermMemoryEngine.core, 5),
      active: take(contract.longTermMemoryEngine.active, 5),
      behaviorChanging: take(contract.longTermMemoryEngine.behaviorChanging, 5),
      reactivated: take(contract.longTermMemoryEngine.reactivated, 3),
    },
    writingStyle: contract.writingStyleDirector,
    imperfection: contract.humanImperfectionEngine,
    npcAutonomy: { active: take(contract.npcAutonomyEngine.active, 4) },
    romanceProgression: contract.romanceProgressionEngine,
    longTermArc: contract.longTermArcEngine,
    cloneProtection: contract.cloneProtection,
    perceptionRealism: contract.perceptionRealismEngine,
    turnTaking: contract.turnTakingEngine,
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
      knowledge: [...contract.perceptionRealismEngine.known.map((knowledge)=>({ character_name:"lead", knowledge, status:"known", secret:false })), ...contract.perceptionRealismEngine.uncertain.map((knowledge)=>({ character_name:"lead", knowledge, status:"uncertain", secret:false }))].slice(0,6),
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
    temporal: {
      storyNow: contract.temporalEngine.storyNow,
      recentElapsed: contract.temporalEngine.recentElapsed,
      upcoming: take(contract.calendarLifeSimulation.upcomingEvents, 4),
      dueCommitments: take(contract.calendarLifeSimulation.dueCommitments, 4),
      availability: contract.calendarLifeSimulation.availability,
      scheduleConflicts: take(contract.calendarLifeSimulation.scheduleConflicts, 3),
    },
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

  return `TURN CONTRACT — compact canon and story pressure\n${JSON.stringify(compact)}\n\nUse this order: GENERATION ORCHESTRATOR 3.46 → LONG-STORY MEMORY 3.43 → NARRATIVE ARC INTELLIGENCE 3.44 → PROSE INTELLIGENCE 3.45 → visible canon → user ownership → physical reality → DISCOURSE COHERENCE → EMBODIED SALIENCE → character mind/perception → independent agenda → consequence residue → relationship expectations → Character DNA → one earned story beat. Answer the latest turn before subtext. If initiative.required is true, MAKE ONE CONCRETE CHOICE IN THIS REPLY without deciding the user's response. Dialogue can satisfy initiative when it contains a real decision, invitation, refusal, reveal, request or commitment; empty banter cannot. Autonomy means the character may have somewhere else to be, another priority, another relationship, or a reason to leave; it never means inventing fake distance. Consequences survive scene changes until repaired. Scene rhythm may land or close instead of stretching every exchange. Selective memory privileges boundaries, promises, firsts, repeated preferences and behavior-changing events over trivia. Long-Story Memory 3.43 progressively compresses old scenes while preserving meaning, separates objective history from character/public/scoped knowledge, keeps open/dormant/resolved threads distinct, and forbids unsupported remembered events or false shared history. Generation Orchestrator 3.46 activates only context that can materially change this turn; sleeping systems stay authoritative but do not dump their state into prose. Prose Intelligence 3.45 adapts length, dialogue density, interiority, gestures and sentence architecture to the beat, and rejects stock cinematic AI cadence or explanation after subtext has already been shown. Recovery Integrity 3.47 treats a normal retry of the same user turn as idempotent and protects branch truth across rewind/background/network recovery. Performance + Mobile 3.48 may reduce prompt bulk, response ceiling and hedge timing, but never weakens canon, privacy, physics, validation or persistence. Narrative Arc Intelligence 3.44 reads that history as progression evidence: multiple arcs may move independently; repeated scene skeletons trigger stagnation warnings; resolved arcs cannot be reopened without a new cause; relationship milestones require prerequisites; regression preserves retained growth; and payoff permission never becomes a railroad. Relationship expectations belong to the character and may be wrong; never invent the user's feelings to satisfy them. Discourse Coherence + Event Truth 3.37.1 binds local conversational reality: definite past-event labels require evidence for that specific event, pronouns such as it/that/this must resolve to a real antecedent before use, clarification requests answer first, and a distinctive recent line cannot be repeated as new dialogue. Banter is not retroactively an argument. When discourseCoherence.socialBeatHold is true, optional social-gravity cameos wait; fame is a living-world property, not a periodic quota. Relationship Intelligence keeps attraction, trust, comfort and commitment separate; Relationship Chemistry 2.0 additionally keeps attachment, reciprocity, affection language, jealousy style, vulnerability hangover, conflict residue, repair style, trajectory and asymmetric beliefs causally distinct. Desire and defense may point in opposite directions without either disappearing. Embodied Awareness 3.36.1 outranks relationship performance for the immediate beat when the user's bodily/energy state becomes persistent or escalating: do not keep flirting, joking or pursuing the old scene objective while the user is visibly/authorially fading, unwell, cold, shaky, distressed, uncomfortable or losing focus. A private asterisked bodily label may shape pacing, but the character must react tentatively to plausible outward presentation rather than quote hidden wording as knowledge. Emotional continuity carries residue after apologies until behavior earns a new baseline. Scene Variety avoids repeating the same location/structure/tension skeleton while respecting physical continuity. NPC Social Network treats side characters as a web with independent bonds and uneven information. Long-Term Memory 4.0 retrieves by relevance and behavioral consequence, not perfect recall. Writing Style Director varies prose texture, dialogue density, interiority and cadence without changing character identity. Human Turn-Taking uses turnTaking.mode/responseScale/questionPolicy to allow partial answers, delayed answers, silence, interruptions, topic return/drop and sparse group speaker traffic; conversation completeness is never the goal. Character Intent + Subtext treats characterIntent.sceneObjective/immediateWant/concealedWant/conversationTactic/resistance/subtextThread/admissionStage as persistent causal state: a brief topic shift does not erase what the character wanted, serious answers do not require a banter tag, random ambient incidents cannot substitute for motive, narration POV stays stable, and low-signal gestures obey the turn budget. Human imperfection is allowed when it follows DNA. NPCs keep goals and relationships of their own. Romance progresses through evidence and changed expectations, never intensity alone. Long-Term Character Evolution 3.38.0 follows the rule "same person, different history": preserve core identity while allowing defenses, learned behavior and relationship-specific habits to change only through accumulated evidence. Growth must appear as changed choices before exposition; one warm scene cannot rewrite personality. Proven growth can regress under pressure without resetting to chapter one, and romance never replaces the character with a generic softer personality. Beliefs may be challenged gradually, milestones record first behavior-changing shifts, and off-screen change needs an established life/arc cause. Long-term arcs require repeated proof and can include relapse under pressure. Run the clone test on reaction logic, not just vocabulary. If living.interestProofRequired is true, prove interest through a voluntary choice with a real cost, not staring or narration. If living.sceneChangeRequired is true, something materially changes on-page. Jealousy needs listed evidence. Plans are not accepted until the user accepts them. Active conflicts retain residue until repaired. Achieved milestones are never replayed as firsts. Treat mind.believe and mind.misunderstand as SUBJECTIVE, never as canon. Track time literally, let intensity rise and fall, and protect identity from drift. Emotional causality must be event → interpretation → feeling → pressure, not mood roulette. Prefer subtext over self-explanation when the character would protect pride. Respect public/private mode, learned behavioral patterns, conflict personality and contradictions. Use sceneRhythm.phase and emotionalIntelligence.sceneMomentum to know when to hold, turn, land or close a scene, but never skip a pending user choice. Vary response STRUCTURE as well as wording. Stored state never overrides the latest visible user turn. ACTIVE behavior boundaries in userAuthored.activeBehaviorBoundaries persist across turns until the user explicitly reopens them; do not treat them as one-turn suggestions. userAuthored.selfReportLock prevents unsolicited psychoanalysis from overriding the user's latest self-report. userAuthored.userPresence is a hard physical-state signal: leaving/absent means the user cannot be addressed, observed, touched, handed objects, or silently respawned until an authored re-entry. SCENE PHYSICS is binding: preserve body posture, spatial anchor, prop holder/location/state, distance, line of sight, door state and elapsed-time evidence. Never use a repeated gesture merely to fill narration; silence or dialogue-only beats are valid.`;
}
