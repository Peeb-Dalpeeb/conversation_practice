// Checks one captured Realtime event log against ticket 04's criteria.
// Usage: node check-log.mjs <path-to-log.json>
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node check-log.mjs <path-to-log.json>');
  process.exit(2);
}

const raw = readFileSync(path, 'utf8');
const envelopes = JSON.parse(raw);
const parsed = [];
let unparseable = 0;
let binary = 0;

for (const envelope of envelopes) {
  if ('binary' in envelope) {
    binary += 1;
    continue;
  }
  try {
    parsed.push({
      direction: envelope.direction,
      event: JSON.parse(envelope.event),
    });
  } catch {
    unparseable += 1;
  }
}

const results = [];
const record = (ok, label, detail) => results.push({ ok, label, detail });

const isAudio = (part) =>
  part?.type === 'input_audio' || part?.type === 'output_audio';
const itemDone = parsed.filter((p) => p.event.type === 'conversation.item.done');
const spoken = itemDone.filter(({ event }) =>
  (event.item?.content ?? []).some(isAudio)
);
const phantoms = itemDone.filter(
  ({ event }) => !(event.item?.content ?? []).some(isAudio)
);
const traineeTurns = spoken.filter(({ event }) => event.item?.role === 'user');
const personaTurns = spoken.filter(
  ({ event }) => event.item?.role === 'assistant'
);
const transcriptionCreates = parsed.filter(
  (p) =>
    p.direction === 'client' &&
    p.event.type === 'response.create' &&
    p.event.response?.metadata?.purpose === 'turn_transcription'
);
const transcribedSources = new Set(
  transcriptionCreates.map((p) => p.event.response.metadata.source_item_id)
);
const responsesCreated = parsed.filter(
  (p) => p.event.type === 'response.created'
).length;

console.log(`\nLog: ${path}`);
console.log(
  `  ${envelopes.length} envelopes · ${responsesCreated} responses billed · ` +
    `${spoken.length} spoken turns · ${phantoms.length} non-spoken items · ` +
    `${binary} binary · ${unparseable} unparseable`
);

// 1 — the runaway loop
const phantomIds = new Set(phantoms.map(({ event }) => event.item?.id));
const loopedOn = [...transcribedSources].filter((id) => phantomIds.has(id));
record(
  loopedOn.length === 0,
  'No transcription of a non-spoken item',
  loopedOn.length === 0
    ? 'no phantom items transcribed'
    : `${loopedOn.length} non-spoken items were transcribed — the loop is back`
);

// 2 — Trainee turns get exactly one request each; Persona turns get none
const personaIds = new Set(personaTurns.map(({ event }) => event.item.id));
const personaTranscribed = [...transcribedSources].filter((id) =>
  personaIds.has(id)
);
record(
  transcriptionCreates.length === traineeTurns.length &&
    personaTranscribed.length === 0,
  'One request per Trainee turn, none for Persona',
  `${transcriptionCreates.length} requests / ${traineeTurns.length} Trainee turns · ` +
    `${personaTurns.length} Persona turns use their own audio transcript`
);

// 3 — every spoken turn has text, from whichever source owns it
const outOfBand = new Map();
for (const { event } of parsed) {
  if (
    event.type === 'response.done' &&
    event.response?.metadata?.purpose === 'turn_transcription'
  ) {
    const text = (event.response.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((part) => part?.type === 'output_text')
      .map((part) => part.text)
      .join(' ')
      .trim();
    outOfBand.set(event.response.metadata.source_item_id, {
      status: event.response.status,
      text,
    });
  }
}
const audioTranscript = new Map();
let currentOutputItem;
for (const { event } of parsed) {
  if (event.type === 'response.output_item.added' && event.item?.id) {
    currentOutputItem = event.item.id;
  }
  if (event.type === 'response.output_audio_transcript.done') {
    audioTranscript.set(event.item_id ?? currentOutputItem, event.transcript);
  }
}
const textFor = (item) => {
  if (item.role === 'user') {
    const got = outOfBand.get(item.id);
    return got?.status === 'completed' ? got.text : '';
  }
  return (audioTranscript.get(item.id) ?? '').trim();
};
const missing = spoken.filter(({ event }) => !textFor(event.item));
record(
  missing.length === 0,
  'Every spoken turn has text',
  missing.length === 0
    ? `${traineeTurns.length} Trainee + ${personaTurns.length} Persona turns all covered`
    : `${missing.length} without text: ` +
        missing
          .map(({ event }) => `${event.item.role}/${event.item.id}`)
          .join(', ')
);

// 4 — no in-session ASR
const asrHits = raw.split('input_audio_transcription').length - 1;
record(asrHits === 0, 'No in-session ASR', `${asrHits} occurrences`);

// 5 — the conversation chain, which is what reassembly actually walks.
// `input_audio_buffer.committed` is checked too, but it only exists for Trainee
// turns and so can never order a Persona one — checking it alone would pass a
// log ticket 05 could not use.
const committed = parsed.filter(
  (p) => p.event.type === 'input_audio_buffer.committed'
);
const committedComplete = committed.every(
  ({ event }) =>
    typeof event.item_id === 'string' && 'previous_item_id' in event
);
const added = parsed.filter((p) => p.event.type === 'conversation.item.added');
const chain = added.map(({ event }) => ({
  id: event.item?.id,
  prev: event.previous_item_id ?? null,
  role: event.item?.role,
}));
const chainIds = new Set(chain.map((link) => link.id));
const heads = chain.filter((link) => link.prev === null);
const danglers = chain.filter(
  (link) => link.prev !== null && !chainIds.has(link.prev)
);
// Walk it the way reassembly will, and see whether every turn is reachable.
const byPrev = new Map(chain.map((link) => [link.prev, link]));
const walked = [];
for (let link = heads[0]; link; link = byPrev.get(link.id)) {
  walked.push(link);
  if (walked.length > chain.length) break;
}
const chainOk =
  chain.length > 0 &&
  heads.length === 1 &&
  danglers.length === 0 &&
  walked.length === chain.length &&
  chain.every((link) => typeof link.id === 'string');
record(
  chainOk,
  'conversation chain walks end to end',
  chainOk
    ? `${chain.length} turns, one head, every turn reachable`
    : `${chain.length} turns · ${heads.length} heads · ${danglers.length} dangling · ` +
      `${walked.length} reachable`
);
// The chain must cover every spoken turn, or reassembly silently drops one.
const uncovered = spoken.filter(({ event }) => !chainIds.has(event.item?.id));
record(
  uncovered.length === 0 && committedComplete,
  'chain covers every spoken turn',
  uncovered.length === 0
    ? `${spoken.length} spoken turns all on the chain · ${committed.length} committed events intact`
    : `${uncovered.length} spoken turns are not on the chain: ` +
      uncovered.map(({ event }) => event.item.id).join(', ')
);

// 6 — truncation is recorded, and points at a turn we know about
const truncated = new Map();
for (const { event } of parsed) {
  if (event.type === 'conversation.item.truncated') {
    truncated.set(event.item_id, event.audio_end_ms);
  }
}
const orphanCuts = [...truncated.keys()].filter((id) => !chainIds.has(id));
record(
  orphanCuts.length === 0,
  'every truncation names a known turn',
  truncated.size === 0
    ? 'no truncated turns in this log'
    : `${truncated.size} truncated turn(s), all resolvable`
);

console.log('');
for (const { ok, label, detail } of results) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} ${detail}`);
}

// --- fixture classification (informational) ---
// A truncation after the stop was caused by the stop's own
// `output_audio_buffer.clear`; one before it is the Trainee talking over the
// Persona. They look identical otherwise.
const stopIndex = parsed.findIndex(
  (p) =>
    p.direction === 'client' && p.event.type === 'output_audio_buffer.clear'
);
let stopCuts = 0;
let bargeIns = 0;
parsed.forEach((p, index) => {
  if (p.event.type !== 'conversation.item.truncated') return;
  if (stopIndex >= 0 && index > stopIndex) stopCuts += 1;
  else bargeIns += 1;
});
// Spoken turns crossing in transit has never been observed and is not expected
// — the data channel is ordered, and a turn cannot start before the previous
// one commits. Reported only to notice if that ever stops being true.
const arrivalIndex = new Map();
spoken.forEach(({ event }, index) => arrivalIndex.set(event.item.id, index));
const outOfOrder = chain.filter((link) => {
  const self = arrivalIndex.get(link.id);
  const previous = arrivalIndex.get(link.prev);
  return self !== undefined && previous !== undefined && previous > self;
}).length;

console.log('\n  fixture value:');
console.log(
  `    stopped mid-sentence:  ${stopCuts > 0 ? `YES (${stopCuts} cut by the stop)` : 'no'}`
);
console.log(
  `    Trainee interrupted:   ${bargeIns > 0 ? `YES (${bargeIns} barge-in${bargeIns === 1 ? '' : 's'})` : 'no'}`
);
console.log(
  `    out-of-order turns:    ${outOfOrder > 0 ? `YES (${outOfOrder}) — unexpected, see ticket 05` : 'no (expected)'}`
);

console.log('\n  transcript, walking the conversation chain:');
for (const link of walked.length === chain.length ? walked : chain) {
  const item = { id: link.id, role: link.role };
  const text = textFor(item);
  const who = link.role === 'user' ? 'Trainee' : 'Jordan ';
  const cutAt = truncated.get(link.id);
  // Never print a truncated turn as if all of it were heard. There is no
  // alignment between the text and audio_end_ms, so the cut point within the
  // line is unknown — it is marked, not guessed at.
  const suffix =
    cutAt === undefined
      ? ''
      : `  << CUT OFF at ${cutAt}ms — text beyond this point was generated but never heard`;
  console.log(
    `    ${who}  ${text ? JSON.stringify(text) : '(no text)'}${suffix}`
  );
}

process.exit(results.every((r) => r.ok) ? 0 : 1);
