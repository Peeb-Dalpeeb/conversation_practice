// Checks the Assessment call against the real OpenAI API. Every test in the
// suite mocks `fetch`, so nothing has yet confirmed that OpenAI accepts the
// request body, that `gpt-5.6-sol` returns quotes the validator will accept, or
// how long judging actually takes.
//
// It answers three questions in one run:
//   1. Does the real API accept the strict schema, `text.format` shape and model id?
//   2. Does the grader tick criterion 3 when the Trainee was only ever given the
//      cover story? If it does, the grader needs ground truth and the demo's
//      contrast is at risk. If it does not, that fix is not urgent.
//   3. How long does judging take? Ticket 07 has to decide whether the page can
//      block on it or has to poll.
//
// Usage:
//   npx tsx .scratch/conversation-practice/check-assessment.ts          (dry run, free)
//   npx tsx .scratch/conversation-practice/check-assessment.ts --live   (~$0.08)
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scenario } from '../../src/scenario.js';
import { createOpenAiAttemptAssessor } from '../../src/server/assessment.js';
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

function printTranscript(label: string, transcript: Transcript) {
  console.log(`\n${label} — ${String(transcript.length)} turns`);
  for (const [index, turn] of transcript.entries()) {
    const who = turn.speaker === 'trainee' ? 'Trainee' : 'Jordan ';
    console.log(`   ${String(index).padStart(2)} ${who}  ${turn.text}`);
  }
}

function printAssessment(assessment: Assessment) {
  for (const verdict of assessment.criteria) {
    const mark = verdict.met ? 'MET    ' : 'NOT MET';
    console.log(`   ${mark}  ${verdict.criterionId.padEnd(30)}`);
    console.log(`            evidence: ${JSON.stringify(verdict.evidence)}`);
  }
}

function criterionThree(assessment: Assessment): boolean | undefined {
  return assessment.criteria.find(
    ({ criterionId }) => criterionId === 'surfaced-real-reason'
  )?.met;
}

printTranscript('FULL ATTEMPT (the real reason is surfaced)', fullTranscript);
printTranscript(
  'COVER STORY ONLY (criterion 3 must be NOT MET)',
  coverStoryTranscript
);

if (!live) {
  console.log(
    '\nDry run — no API call made, nothing spent.' +
      '\nRe-run with --live to make two real calls to gpt-5.6-sol (~$0.08).'
  );
  process.exit(0);
}

const { openAiApiKey } = readServerEnvironment();
const assessAttempt = createOpenAiAttemptAssessor({ apiKey: openAiApiKey });

async function run(label: string, transcript: Transcript) {
  console.log(`\n=== ${label}`);
  const startedAt = Date.now();

  try {
    const assessment = await assessAttempt(transcript, scenario.rubric);
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

const full = await run('FULL ATTEMPT', fullTranscript);
const cover = await run('COVER STORY ONLY', coverStoryTranscript);

console.log('\n--- what this tells us ---');

if (!full && !cover) {
  console.log(
    '  Both calls failed. Read the error above: if it names the schema or the\n' +
      '  model, the request shape is wrong and no test would have caught it.'
  );
  process.exit(1);
}

const slowest = Math.max(full?.elapsed ?? 0, cover?.elapsed ?? 0);
console.log(
  `  Ticket 07 latency: slowest Assessment was ${String(slowest)}ms. Feedback is a\n` +
    '  second sequential call, so budget roughly double before deciding whether\n' +
    '  the page can block on judging.'
);

if (cover) {
  const met = criterionThree(cover.assessment);
  console.log(
    met
      ? '  Criterion 3 came back MET on a cover-story-only Attempt. The grader is\n' +
          '    giving away the criterion the demo turns on — it needs ground truth.\n' +
          '    Pass the Persona private profile to the Assessment call (ticket 12).'
      : '  Criterion 3 came back NOT MET on a cover-story-only Attempt. The grader\n' +
          '    already distinguishes the cover story from the real reason. Ground\n' +
          '    truth is not urgent — re-check across a few more Attempts in ticket 12.'
  );
}

if (full && criterionThree(full.assessment) === false) {
  console.log(
    '  Criterion 3 came back NOT MET on the full Attempt, where the prior incident\n' +
      '    IS surfaced. That is a false negative and is worse than the false\n' +
      '    positive above — attempt two would not flip on the projector.'
  );
}
