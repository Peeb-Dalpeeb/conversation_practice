import 'dotenv/config';

import { scenario } from '../scenario.js';
import { createApiServer } from './app.js';
import {
  createAttemptCompleter,
  type AssessAttempt,
  type CreateFeedback,
} from './attempt-completion.js';
import { createAttemptStore } from './attempt-store.js';
import { readServerEnvironment } from './environment.js';
import { createRawEventLogStore } from './raw-event-log.js';
import { createOpenAiRealtimeClientSecretMinter } from './realtime.js';

const environment = readServerEnvironment();
// Ticket 05 keeps these two model boundaries deterministic while proving the
// completion seam. Tickets 06 and 07 replace these exact injected stubs.
const stubAssessAttempt: AssessAttempt = (_transcript, rubric) =>
  Promise.resolve({
    criteria: rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: '',
    })),
  });
const stubCreateFeedback: CreateFeedback = () =>
  Promise.resolve('Feedback generation is not configured yet.');
const server = createApiServer(
  scenario,
  createOpenAiRealtimeClientSecretMinter({
    apiKey: environment.openAiApiKey,
  }),
  createAttemptCompleter({
    scenario,
    assessAttempt: stubAssessAttempt,
    createFeedback: stubCreateFeedback,
    storeAttempt: createAttemptStore(),
    storeRawEventLog: createRawEventLogStore(),
  })
);

server.listen(environment.port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${environment.port}`);
});
