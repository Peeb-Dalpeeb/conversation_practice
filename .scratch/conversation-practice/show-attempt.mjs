// Reads one persisted Attempt back during ticket 10 tuning.
// Usage: node .scratch/conversation-practice/show-attempt.mjs [number|latest|--list]
//
// The Attempt number is not shown anywhere on screen, and the raw event log is
// the other half of the instrument, so both are printed here: the number to
// write into the ticket, and the raw-log path for when the Transcript alone
// does not explain what happened.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const scenarioId = 'customer-whos-had-enough';
const attemptDirectory = resolve('data', 'attempts', scenarioId);
const rawLogDirectory = resolve('data', 'raw-event-logs');

if (!existsSync(attemptDirectory)) {
  console.error(`No Attempts yet: ${attemptDirectory} does not exist.`);
  process.exit(2);
}

const numbers = readdirSync(attemptDirectory)
  .map((filename) => /^(\d+)\.json$/.exec(filename))
  .filter(Boolean)
  .map((match) => Number(match[1]))
  .sort((a, b) => a - b);

if (numbers.length === 0) {
  console.error('No Attempts have been recorded for this Scenario yet.');
  process.exit(2);
}

const argument = process.argv[2] ?? 'latest';

if (argument === '--list') {
  for (const number of numbers) {
    const attempt = JSON.parse(
      readFileSync(resolve(attemptDirectory, `${String(number).padStart(4, '0')}.json`), 'utf8')
    );
    const met = attempt.assessment.criteria.filter((c) => c.met).length;
    const opener = attempt.transcript.find((turn) => turn.speaker === 'trainee');
    console.log(
      `  ${String(number).padStart(4, '0')}  ${met}/6 met  ` +
        `${attempt.transcript.length} turns  ` +
        `${opener ? JSON.stringify(opener.text.slice(0, 60)) : '(no Trainee turn)'}`
    );
  }
  console.log(`\n  next completed Attempt will be ${numbers.at(-1) + 1}`);
  process.exit(0);
}

const number = argument === 'latest' ? numbers.at(-1) : Number(argument);

if (!numbers.includes(number)) {
  console.error(`Attempt ${argument} does not exist. Recorded: ${numbers.join(', ')}`);
  process.exit(2);
}

const attempt = JSON.parse(
  readFileSync(resolve(attemptDirectory, `${String(number).padStart(4, '0')}.json`), 'utf8')
);

console.log(`\nAttempt ${attempt.number} — ${scenarioId}`);

// Attempts written before the correlation ID existed have no rawEventLogId, and
// there is no other field to match them on. Say so rather than guessing by date.
if (attempt.rawEventLogId) {
  const match = existsSync(rawLogDirectory)
    ? readdirSync(rawLogDirectory).find((filename) =>
        filename.endsWith(`-${attempt.rawEventLogId}.json`)
      )
    : undefined;
  console.log(
    `  raw event log: ${match ? resolve(rawLogDirectory, match) : `(missing, id ${attempt.rawEventLogId})`}`
  );
} else {
  console.log('  raw event log: (this Attempt predates the correlation ID)');
}

console.log('\n  Transcript:');
attempt.transcript.forEach((turn, index) => {
  const who = turn.speaker === 'persona' ? 'Jordan ' : 'Trainee';
  const cut = turn.cutOff ? `  << CUT OFF at ${turn.audioEndMs}ms` : '';
  console.log(`    ${String(index).padStart(2)}  ${who}  ${JSON.stringify(turn.text)}${cut}`);
});

console.log('\n  Assessment:');
for (const criterion of attempt.assessment.criteria) {
  console.log(
    `    ${criterion.met ? 'MET    ' : 'not met'}  ${criterion.criterionId.padEnd(30)} ${JSON.stringify(criterion.evidence.slice(0, 70))}`
  );
}

console.log(
  `\n  Feedback: ${attempt.feedback.status === 'completed' ? `${attempt.feedback.prose.length} chars` : `FAILED — ${attempt.feedback.error}`}\n`
);
