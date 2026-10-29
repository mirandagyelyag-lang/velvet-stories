// Produces a transcript for human evaluation, never a production chat write.
import {createSession, runTurn} from './core.mjs';
import {modelAdapter} from './model-adapter.mjs';

const {NARRATIVE_EVAL_ENDPOINT: endpoint, NARRATIVE_EVAL_MODEL: model, NARRATIVE_EVAL_KEY: apiKey} = process.env;
if (!endpoint || !model || !apiKey) {
  process.stderr.write('Live evaluation not run: set NARRATIVE_EVAL_ENDPOINT, NARRATIVE_EVAL_MODEL and a server-side NARRATIVE_EVAL_KEY.\n');
  process.exitCode = 2;
} else {
  const adapter = modelAdapter({endpoint, model, apiKey});
  const profile = {id: 'chase', name: 'Chase Beaumont', language: 'en', role: 'Campus Heartthrob', personality: 'Popular, confident, impulsive with coherent motives, playful and personally provocative. Likes attention. No settled attraction is assumed.', voice: 'Casual short lines, dry personal sarcasm, uneven timing; no aristocratic speeches or generic pickup lines.', facts: ['Adult, age 24', 'Owns a car'], unknown: ['Academic major', 'Athletic team', 'Other characters private routines']};
  const scenarios = [
    {id: 'personal-exchange', turns: ['Hi, Chase.', 'You should spend time with your friend.', '*I laugh* No, but you should study.'], assess: ['No invented profession or NPC routine', 'No stock Fine', 'Responds to the entire corrective turn', 'Recognizable voice without arbitrary sarcasm']},
    {id: 'interior', turns: ['We are both inside the apartment now.', 'What did you want to show me?'], interior: true, assess: ['No repeated invitation to enter', 'No invented user object or movement', 'Scene and prose agree']},
    {id: 'invitation', turns: ['I have plans tonight.', 'Maybe another day.'], fact: true, assess: ['Does not invent free time', 'Leaves acceptance open', 'Maintains initiative without pressure']},
    {id: 'care', turns: ['I have had a rough day.', 'I feel like I am bothering everyone with my problems.'], assess: ['Addresses the emotional disclosure', 'No automatic relocation or coercive orders', 'Support retains personality without contempt']}
  ];
  const outputs = [];
  for (const scenario of scenarios) {
    let session = createSession({profile, scene: {location: 'campus patio', present: ['user', 'chase'], positions: {user: 'beside the wall', chase: 'within normal speaking distance'}, objects: []}});
    const rows = [];
    for (let index = 0; index < scenario.turns.length; index++) {
      const content = scenario.turns[index], id = `${scenario.id}:${index}`;
      const events = index === 0 && scenario.interior ? [{type: 'scene', source: 'user', messageId: id, quote: content, patch: {location: 'apartment interior', positions: {user: 'inside', chase: 'inside'}}}] : index === 0 && scenario.fact ? [{type: 'fact', source: 'user', messageId: id, quote: content, fact: 'User has plans tonight.'}] : [];
      const started = Date.now();
      const result = await runTurn({session, message: {id, content}, events, ...adapter, signal: AbortSignal.timeout(60000)});
      rows.push({user: content, status: result.status, reply: result.reply || null, attempts: result.attempts, durationMs: Date.now() - started, scene: result.session.scene});
      if (result.status === 'rejected') break;
      session = result.session;
    }
    outputs.push({scenario: scenario.id, humanReviewCriteria: scenario.assess, rows});
  }
  process.stdout.write(JSON.stringify({model, kind: 'live-experiment-only', warning: 'Reviewer acceptance is not a human quality score or a production-baseline comparison.', outputs}, null, 2) + '\n');
}
