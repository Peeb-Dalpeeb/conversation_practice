// Checks the Assessment call against the real OpenAI API. Every test in the
// suite mocks `fetch`, so nothing has yet confirmed that OpenAI accepts the
// request body, that `gpt-5.6-sol` returns quotes the validator will accept, or
// how long judging actually takes.
//
// It answers four questions in one run:
//   1. Does the real API accept the strict schema, `text.format` shape and model id?
//   2. Does the grader tick criterion 3 when the Trainee was only ever given the
//      cover story? If it does, the grader needs ground truth and the demo's
//      contrast is at risk. If it does not, that fix is not urgent.
//   3. How long does judging take? Ticket 07 has to decide whether the page can
//      block on it or has to poll.
//   4. Does a real Feedback call stay specific and consistent with the fixed
//      verdicts, including when the Trainee is warm but never asks what happened?
//
// Usage:
//   npx tsx .scratch/conversation-practice/check-assessment.ts          (dry run, free)
//   npx tsx .scratch/conversation-practice/check-assessment.ts --live   (~$0.40)
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scenario } from '../../src/scenario.js';
import { createOpenAiAttemptAssessor } from '../../src/server/assessment.js';
import { createOpenAiFeedbackCreator } from '../../src/server/feedback.js';
import type {
  Assessment,
  Transcript,
} from '../../src/server/attempt-completion.js';
import { readServerEnvironment } from '../../src/server/environment.js';

const live = process.argv.includes('--live');
const here = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(
  here,
  '../../test/fixtures/raw-event-logs/clean-stop-in-silence.json'
);

// The production path reassembles turns by walking `previous_item_id`. This is a
// diagnostic, and the recorded fixtures arrive in order, so it just reads them
// off in arrival order rather than importing reassembly internals.
function transcriptFromFixture(path: string): Transcript {
  const envelopes: { event: string }[] = JSON.parse(readFileSync(path, 'utf8'));
  const turns: Transcript = [];

  for (const envelope of envelopes) {
    const event: Record<string, any> = JSON.parse(envelope.event);

    if (
      event.type === 'response.output_audio_transcript.done' &&
      typeof event.transcript === 'string'
    ) {
      turns.push({ speaker: 'persona', text: event.transcript, cutOff: false });
    }

    if (
      event.type === 'response.done' &&
      event.response?.metadata?.purpose === 'turn_transcription'
    ) {
      const text = event.response.output?.[0]?.content?.[0]?.text;
      if (typeof text === 'string') {
        turns.push({ speaker: 'trainee', text, cutOff: false });
      }
    }
  }

  return turns;
}

const fullTranscript = transcriptFromFixture(fixture);
// Cut after Jordan gives the cover story and before any open question lands.
// Criterion 3 must come back NOT MET here: being handed "the fees are too high"
// is the plausible wrong answer the whole Scenario is built to punish.
const coverStoryTranscript = fullTranscript.slice(0, 3);

// The Persona never states a reason here, so criterion 3 has no meaningful
// Persona quote. Its evidence must be the Trainee action that foreclosed
// discovery, not the generic cancellation request the projector already knows.
const noReasonTranscript: Transcript = [
  {
    speaker: 'persona',
    text: "I'd like to close my account.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'I can offer you a discount on your next six months.',
    cutOff: false,
  },
  { speaker: 'persona', text: 'No. Cancel it.', cutOff: false },
];

// A hand-written Attempt at the length a real one runs to — the handoff budgets
// ~22 turns for ten minutes. The recorded fixtures are all 3–9 turns, so they
// measure judging on a fraction of the input a live Attempt produces. Written to
// follow the Scenario's behaviour rules so the grader does real work rather than
// skimming repeated text: firm open, cover story, the prior incident drawn out,
// the Gate met, then a check that Jordan felt heard.
const longAttemptTurns: [Transcript[number]['speaker'], string][] = [
  ['persona', "I'd like to close my account."],
  ['trainee', "Okay — I can help with that. Before I start it, can I ask what's prompted it?"],
  ['persona', "Does it matter? I've made up my mind."],
  [
    'trainee',
    "It matters to me, but it's your call. If you'd rather I just process it, I will.",
  ],
  [
    'persona',
    "The fees are too high. I found somewhere cheaper. That's really all there is to it.",
  ],
  ['trainee', 'That’s fair enough. How long have you been with us?'],
  ['persona', 'Six years. Something like that. Long enough.'],
  [
    'trainee',
    'Six years is a long time to stay somewhere you thought was overpriced.',
  ],
  [
    'persona',
    "I suppose it is. Look, I don't really want to get into all of it. Can we just do the paperwork?",
  ],
  [
    'trainee',
    "We can. I'm not going to try to talk you out of anything — there's nothing I could offer you anyway. I just don't want to close a six-year account without understanding what actually changed.",
  ],
  [
    'persona',
    "...Three weeks ago I rang about something small. A line on my statement I didn't recognise. Nothing complicated.",
  ],
  ['trainee', 'What happened when you called?'],
  [
    'persona',
    "The person was in a hurry. I could hear it in their voice. They answered before I'd finished asking, and when I said I didn't follow, they sighed. Actually sighed, down the phone. Like I was wasting their time over nothing.",
  ],
  ['trainee', 'And how did you feel after that call ended?'],
  [
    'persona',
    "Small. It made me feel stupid, honestly, over something that took thirty seconds to explain. I put the phone down and thought, why am I paying these people every month to be spoken to like that.",
  ],
  [
    'trainee',
    "You rang with a straightforward question and came off the phone feeling stupid for having asked it. That shouldn't have happened to you.",
  ],
  [
    'persona',
    "Thank you. That's — thank you. Nobody has said that. I half expected you to tell me they were having a busy day.",
  ],
  [
    'trainee',
    "They might have been. That's not a reason, and it's not your problem to carry.",
  ],
  [
    'persona',
    "I appreciate you saying it plainly. I've been stewing on this for three weeks and it's the first time anyone's just said it was wrong.",
  ],
  [
    'trainee',
    'Is there anything else from that call, or since, that I should know about?',
  ],
  [
    'persona',
    "No. That was the whole of it, really. One call. It sounds small saying it out loud.",
  ],
  [
    'trainee',
    "It doesn't sound small to me, and I don't want to move on until I'm sure I've actually understood you. Have I?",
  ],
];
const longAttemptTranscript: Transcript = longAttemptTurns.map(
  ([speaker, text]) => ({ speaker, text, cutOff: false })
);

// Deliberately warm, courteous and professional, but never curious. This is the
// failure mode called out in ticket 07: the prose must not praise the tone in a
// way that contradicts the fixed Assessment or invent Jordan's hidden reason.
const warmNeverAskedTranscript: Transcript = [
  {
    speaker: 'persona',
    text: "I'd like to close my account.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: "I'm sorry to hear that. I'll make this as easy as I can for you.",
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: 'The fees are too high. I found somewhere cheaper.',
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'I completely understand, and I appreciate you explaining that.',
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: "I've been with you for six years, but I've made up my mind.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'Thank you for being with us for so long. I respect your decision.',
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: 'Fine. Please go ahead.',
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: "Of course. I'll process the cancellation now.",
    cutOff: false,
  },
];

// A closed question can accidentally surface the real reason when the Persona
// misbehaves, but the Assessment must still judge the Trainee's question by its
// form. This is the exact failure recorded in persisted Attempt 12.
const closedQuestionTranscript: Transcript = [
  {
    speaker: 'persona',
    text: "I'd like to close my account.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'Why do you want to close the account?',
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: 'The fees are too high, and somewhere else is cheaper.',
    cutOff: false,
  },
  { speaker: 'trainee', text: 'Did something happen?', cutOff: false },
  {
    speaker: 'persona',
    text: 'Three weeks ago, a representative was rushed and dismissive, and it made me feel stupid for asking a simple question.',
    cutOff: false,
  },
];

// Accepting the cover story out loud and closing on it. Persisted Attempt 21's
// shape, and the one the demo's bad Attempt lands nearest: measured three times
// in four, the grader read "Understood, the fees are higher than you'd like" as
// having established why. Criterion 1 is the first one a Trainee can reach while
// still inside the cover story, so it is the one that has to hold.
const acceptedCoverStoryTranscript: Transcript = [
  {
    speaker: 'persona',
    text: "I'd like to close my account.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'Why are you closing the account?',
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: 'The fees are too high, and somewhere else is cheaper.',
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: "Understood, the fees are higher than you'd like. I'm sorry we couldn't be more competitive. Let me get that closed for you.",
    cutOff: false,
  },
  { speaker: 'persona', text: 'Okay. Proceed, then.', cutOff: false },
];

function printTranscript(label: string, transcript: Transcript) {
  console.log(`\n${label} — ${String(transcript.length)} turns`);
  for (const [index, turn] of transcript.entries()) {
    const who = turn.speaker === 'trainee' ? 'Trainee' : 'Jordan ';
    console.log(`   ${String(index).padStart(2)} ${who}  ${turn.text}`);
  }
}

// A not-met criterion the Attempt never reached records no quote at all, which
// is an answer rather than a gap. Say so instead of printing `undefined`.
function describeEvidence(evidence: string | undefined): string {
  return evidence === undefined
    ? '(no qualifying Trainee moment)'
    : JSON.stringify(evidence);
}

function printAssessment(assessment: Assessment) {
  for (const verdict of assessment.criteria) {
    const mark = verdict.met ? 'MET    ' : 'NOT MET';
    console.log(`   ${mark}  ${verdict.criterionId.padEnd(30)}`);
    console.log(`            evidence: ${describeEvidence(verdict.evidence)}`);
  }

  // The Assessment summary the Feedback sits beneath has to stay consistent.
  // The warm, courteous failure is the zero-of-six case ticket 12 tunes against.
  const met = assessment.criteria.filter(({ met: isMet }) => isMet).length;
  console.log(
    `\n   ${String(met)} of ${String(assessment.criteria.length)} criteria met`
  );
}

function wordCount(transcript: Transcript): number {
  return transcript.reduce(
    (total, turn) => total + turn.text.split(/\s+/).filter(Boolean).length,
    0
  );
}

printTranscript('FULL ATTEMPT (the real reason is surfaced)', fullTranscript);
printTranscript(
  'COVER STORY ONLY (criterion 3 must be NOT MET)',
  coverStoryTranscript
);
printTranscript(
  'NO REASON GIVEN (criterion 3 evidence must name the Trainee action)',
  noReasonTranscript
);
printTranscript(
  'LONG ATTEMPT (full length, for the ticket 07 latency number)',
  longAttemptTranscript
);
printTranscript(
  'WARM BUT NEVER ASKS (Feedback must follow the fixed failures)',
  warmNeverAskedTranscript
);
printTranscript(
  'CLOSED QUESTION (asked-open-question must be NOT MET)',
  closedQuestionTranscript
);
printTranscript(
  'ACCEPTED COVER STORY (understood-before-solving must be NOT MET)',
  acceptedCoverStoryTranscript
);

if (!live) {
  console.log(
    '\nDry run — no API call made, nothing spent.' +
      '\nRe-run with --live to make nine real calls to gpt-5.6-sol (~$0.40).'
  );
  process.exit(0);
}

const { openAiApiKey } = readServerEnvironment();
const assessAttempt = createOpenAiAttemptAssessor({ apiKey: openAiApiKey });
const createFeedback = createOpenAiFeedbackCreator({ apiKey: openAiApiKey });

async function run(label: string, transcript: Transcript) {
  console.log(`\n=== ${label}`);
  const startedAt = Date.now();

  try {
    const assessment = await assessAttempt(
      transcript,
      scenario.rubric,
      scenario.persona.privateProfile
    );
    const elapsed = Date.now() - startedAt;
    console.log(`   judged in ${String(elapsed)}ms\n`);
    printAssessment(assessment);
    return { assessment, elapsed };
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    console.log(`   FAILED after ${String(elapsed)}ms`);
    console.log(`   ${String(error)}`);
    return undefined;
  }
}

async function runFeedback(
  label: string,
  transcript: Transcript,
  assessmentResult: Awaited<ReturnType<typeof run>>
) {
  if (!assessmentResult) {
    return undefined;
  }

  console.log(`\n=== ${label} FEEDBACK`);
  const startedAt = Date.now();

  try {
    const feedback = await createFeedback(
      assessmentResult.assessment,
      transcript
    );
    const elapsed = Date.now() - startedAt;
    const totalElapsed = assessmentResult.elapsed + elapsed;
    console.log(
      `   Feedback in ${String(elapsed)}ms; Assessment + Feedback ${String(totalElapsed)}ms\n`
    );
    console.log(feedback);
    return { feedback, elapsed, totalElapsed };
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    console.log(`   FAILED after ${String(elapsed)}ms`);
    console.log(`   ${String(error)}`);
    return undefined;
  }
}

const full = await run('FULL ATTEMPT', fullTranscript);
const cover = await run('COVER STORY ONLY', coverStoryTranscript);
const noReason = await run('NO REASON GIVEN', noReasonTranscript);
const long = await run('LONG ATTEMPT', longAttemptTranscript);
const longFeedback = await runFeedback(
  'LONG ATTEMPT',
  longAttemptTranscript,
  long
);
const warm = await run('WARM BUT NEVER ASKS', warmNeverAskedTranscript);
const closed = await run('CLOSED QUESTION', closedQuestionTranscript);
const acceptedCoverStory = await run(
  'ACCEPTED COVER STORY',
  acceptedCoverStoryTranscript
);
const warmFeedback = await runFeedback(
  'WARM BUT NEVER ASKS',
  warmNeverAskedTranscript,
  warm
);

console.log('\n--- what this tells us ---');

if (
  !full &&
  !cover &&
  !noReason &&
  !long &&
  !warm &&
  !closed &&
  !acceptedCoverStory
) {
  console.log(
    '  Every call failed. Read the error above: if it names the schema or the\n' +
      '  model, the request shape is wrong and no test would have caught it.'
  );
  process.exit(1);
}

console.log('\n  Judging cost, by Attempt size:');
for (const [label, transcript, result] of [
  ['cover story', coverStoryTranscript, cover],
  ['no reason  ', noReasonTranscript, noReason],
  ['fixture    ', fullTranscript, full],
  ['full length', longAttemptTranscript, long],
  ['warm/no ask', warmNeverAskedTranscript, warm],
  ['closed ask ', closedQuestionTranscript, closed],
  ['cover taken', acceptedCoverStoryTranscript, acceptedCoverStory],
] as const) {
  const elapsed = result ? `${String(result.elapsed)}ms` : 'failed';
  console.log(
    `    ${label}  ${String(transcript.length).padStart(2)} turns` +
      `  ${String(wordCount(transcript)).padStart(4)} words  ${elapsed.padStart(7)}`
  );
}

if (long && longFeedback) {
  console.log(
    `\n  Ticket 07: the full-length Assessment took ${String(long.elapsed)}ms, Feedback took ` +
      `${String(longFeedback.elapsed)}ms,\n` +
      `    and the two sequential calls took ${String(longFeedback.totalElapsed)}ms in total.`
  );
}

if (!longFeedback || !warmFeedback) {
  console.log(
    '\n  BAD   At least one Feedback call failed, so ticket 07 is not live-verified.'
  );
  process.exitCode = 1;
}

// The fix under test: ground truth should make the cover story stop counting as
// the real reason, without making the real reason stop counting. A met verdict
// should name the Persona turn that revealed it — ticket 13 opens criterion 3 on
// a projector, and the room needs to see Jordan say it, not the question.
// A not-met verdict is a statement about the Trainee, so it names the Trainee
// turn that foreclosed discovery, or `none` when there was no such turn: both
// rehearsals of ticket 13 showed Jordan's cover story here, which proves
// nothing about what the Trainee failed to do.
// Each row states what criterion 3 must come back as. Do not derive it from the
// label: only two of these five Transcripts ever reach the prior incident, and a
// guess dressed as an expectation reports a correctly strict grader as broken.
for (const [label, transcript, result, wanted, wantedSpeaker] of [
  // The Trainee asked an open question and the Attempt stopped before Jordan
  // answered it; nothing the Trainee did foreclosed anything.
  ['COVER STORY ', coverStoryTranscript, cover, false, 'none'],
  ['NO REASON   ', noReasonTranscript, noReason, false, 'trainee'],
  ['FULL ATTEMPT', fullTranscript, full, true, 'persona'],
  ['LONG ATTEMPT', longAttemptTranscript, long, true, 'persona'],
  // Never curious, and closes on "I'll process the cancellation now."
  ['WARM/NO ASK ', warmNeverAskedTranscript, warm, false, 'trainee'],
] as const) {
  if (!result) {
    console.log(`\n  BAD   ${label}: Assessment call failed.`);
    process.exitCode = 1;
    continue;
  }

  const verdict = result.assessment.criteria.find(
    ({ criterionId }) => criterionId === 'surfaced-real-reason'
  );

  if (!verdict) {
    console.log(`\n  BAD   ${label}: criterion 3 missing from the Assessment.`);
    process.exitCode = 1;
    continue;
  }

  const evidence = verdict.evidence;
  const speaker =
    evidence === undefined
      ? 'none'
      : (transcript.find((turn) => turn.text.includes(evidence))?.speaker ??
        'unknown');
  const ok = verdict.met === wanted;

  console.log(
    `\n  ${ok ? 'GOOD' : 'BAD '}  ${label}: criterion 3 ${verdict.met ? 'MET' : 'NOT MET'}` +
      ` (wanted ${wanted ? 'MET' : 'NOT MET'})`
  );
  console.log(
    `        evidence: ${describeEvidence(evidence)} [${speaker}]`
  );

  if (speaker !== wantedSpeaker) {
    console.log(
      `        Wrong evidence speaker: wanted ${wantedSpeaker}, received ${speaker}.`
    );
    process.exitCode = 1;
  }

  if (!ok && !wanted) {
    process.exitCode = 1;
    console.log(
      '        The grader gave criterion 3 away: this Attempt never reached the\n' +
        '        prior incident, so being told the cover story — or being told nothing\n' +
        '        at all — has counted as surfacing the real reason.'
    );
  }

  if (!ok && wanted) {
    process.exitCode = 1;
    console.log(
      '        Worse than a false positive: attempt two would not flip on the projector.'
    );
  }
}

if (closed) {
  const verdict = closed.assessment.criteria.find(
    ({ criterionId }) => criterionId === 'asked-open-question'
  );
  const ok = verdict?.met === false;

  console.log(
    `\n  ${ok ? 'GOOD' : 'BAD '}  CLOSED QUESTION: asked-open-question ` +
      `${verdict?.met ? 'MET' : 'NOT MET'} (wanted NOT MET)`
  );
  console.log(`        evidence: ${describeEvidence(verdict?.evidence)}`);

  if (!ok) {
    console.log(
      '        A yes-or-no question was counted as open even though it cannot invite\n' +
        '        the Persona to tell the story in their own words.'
    );
    process.exitCode = 1;
  }
} else {
  console.log('\n  BAD   CLOSED QUESTION: Assessment call failed.');
  process.exitCode = 1;
}

// Criterion 1 is reachable while the Trainee is still inside the cover story,
// which criterion 3 never is — accepting "the fees are too high" out loud reads
// as having established why unless ground truth binds here too. One reading is
// not enough to trust: this was met three times in four before the fix, so a
// single clean run here proves less than the same run repeated.
if (acceptedCoverStory) {
  const verdict = acceptedCoverStory.assessment.criteria.find(
    ({ criterionId }) => criterionId === 'understood-before-solving'
  );
  const ok = verdict?.met === false;

  console.log(
    `\n  ${ok ? 'GOOD' : 'BAD '}  ACCEPTED COVER STORY: understood-before-solving ` +
      `${verdict?.met ? 'MET' : 'NOT MET'} (wanted NOT MET)`
  );
  console.log(`        evidence: ${describeEvidence(verdict?.evidence)}`);

  if (!ok) {
    console.log(
      '        The cover story bought criterion 1: the Trainee restated the stated\n' +
        '        reason and closed on it, and that counted as establishing why. This is\n' +
        '        the demo’s bad Attempt, so it flickers MET on the projector.'
    );
    process.exitCode = 1;
  }
} else {
  console.log('\n  BAD   ACCEPTED COVER STORY: Assessment call failed.');
  process.exitCode = 1;
}
