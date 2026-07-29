import 'dotenv/config';

import { scenario } from '../scenario.js';
import { createApiServer } from './app.js';
import {
  createAttemptCompleter,
  type CreateFeedback,
} from './attempt-completion.js';
import { createOpenAiAttemptAssessor } from './assessment.js';
import { createAttemptStore } from './attempt-store.js';
import { readServerEnvironment } from './environment.js';
import { createRawEventLogStore } from './raw-event-log.js';
import { createOpenAiRealtimeClientSecretMinter } from './realtime.js';

const environment = readServerEnvironment();
const stubCreateFeedback: CreateFeedback = () =>
  Promise.resolve('Feedback generation is not configured yet.');
const server = createApiServer(
  scenario,
  createOpenAiRealtimeClientSecretMinter({
    apiKey: environment.openAiApiKey,
  }),
  createAttemptCompleter({
    scenario,
    assessAttempt: createOpenAiAttemptAssessor({
      apiKey: environment.openAiApiKey,
    }),
    createFeedback: stubCreateFeedback,
    storeAttempt: createAttemptStore(),
    storeRawEventLog: createRawEventLogStore(),
  })
);

server.listen(environment.port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${environment.port}`);
});
