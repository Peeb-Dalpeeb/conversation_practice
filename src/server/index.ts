import 'dotenv/config';

import { scenario } from '../scenario.js';
import { createApiServer } from './app.js';
import { createAttemptCompleter } from './attempt-completion.js';
import { createOpenAiAttemptAssessor } from './assessment.js';
import {
  createAttemptStore,
  createLatestAttemptReader,
} from './attempt-store.js';
import { readServerEnvironment } from './environment.js';
import { createOpenAiFeedbackCreator } from './feedback.js';
import { createRawEventLogStore } from './raw-event-log.js';
import { createOpenAiRealtimeClientSecretMinter } from './realtime.js';

const environment = readServerEnvironment();
const server = createApiServer({
  currentScenario: scenario,
  mintRealtimeClientSecret: createOpenAiRealtimeClientSecretMinter({
    apiKey: environment.openAiApiKey,
  }),
  completeAttempt: createAttemptCompleter({
    scenario,
    assessAttempt: createOpenAiAttemptAssessor({
      apiKey: environment.openAiApiKey,
    }),
    createFeedback: createOpenAiFeedbackCreator({
      apiKey: environment.openAiApiKey,
    }),
    storeAttempt: createAttemptStore(),
    storeRawEventLog: createRawEventLogStore(),
  }),
  readLatestAttempt: createLatestAttemptReader(),
});

server.listen(environment.port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${environment.port}`);
});
