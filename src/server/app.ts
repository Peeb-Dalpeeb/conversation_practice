import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import { toPublicScenario, type Scenario } from '../scenario.js';
import {
  AttemptCompletionError,
  reconstructTranscriptSnapshot,
  type CompleteAttempt,
} from './attempt-completion.js';
import { createAttemptComparison } from '../attempt-comparison.js';
import type {
  ReadComparisonAttempts,
  ReadLatestAttempt,
} from './attempt-store.js';
import type { MintRealtimeClientSecret } from './realtime.js';

const unavailableRealtimeClientSecret: MintRealtimeClientSecret = () =>
  Promise.reject(
    new Error('Realtime client secret minting is not configured.')
  );
const unavailableAttemptCompleter: CompleteAttempt = () =>
  Promise.reject(new Error('Attempt completion is not configured.'));
const unavailableLatestAttemptReader: ReadLatestAttempt = () =>
  Promise.resolve(undefined);
const unavailableComparisonAttemptReader: ReadComparisonAttempts = () =>
  Promise.resolve([]);
const defaultRawEventLogByteLimit = 8 * 1024 * 1024;

type ApiServerOptions = {
  currentScenario: Scenario;
  mintRealtimeClientSecret?: MintRealtimeClientSecret;
  completeAttempt?: CompleteAttempt;
  rawEventLogByteLimit?: number;
  readComparisonAttempts?: ReadComparisonAttempts;
  readLatestAttempt?: ReadLatestAttempt;
};

async function readRequestBody(
  request: AsyncIterable<Uint8Array>,
  byteLimit: number
): Promise<string> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    byteLength += chunk.byteLength;

    if (byteLength > byteLimit) {
      throw new RangeError('Request body is too large.');
    }

    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function readRawEventLogRequest(
  request: IncomingMessage,
  response: ServerResponse,
  byteLimit: number
): Promise<string | undefined> {
  if (
    !request.headers['content-type']
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    // Drain rather than ignore: an unread body resets the connection, and the
    // page would report a network fault instead of the refusal.
    request.resume();
    response.writeHead(415, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'JSON body required.' }));
    return undefined;
  }

  try {
    return await readRequestBody(request, byteLimit);
  } catch (error) {
    const bodyTooLarge = error instanceof RangeError;

    request.resume();
    response.writeHead(bodyTooLarge ? 413 : 400, {
      'Content-Type': 'application/json',
    });
    response.end(
      JSON.stringify({
        error: bodyTooLarge
          ? 'Raw event log is too large.'
          : 'Request body unavailable.',
      })
    );
    return undefined;
  }
}

function sendAttemptComparisonReadFailure(response: ServerResponse) {
  response.writeHead(500, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  response.end(
    JSON.stringify({ error: 'Attempt comparison could not be read.' })
  );
}

export function createApiServer({
  currentScenario,
  mintRealtimeClientSecret = unavailableRealtimeClientSecret,
  completeAttempt = unavailableAttemptCompleter,
  rawEventLogByteLimit = defaultRawEventLogByteLimit,
  readComparisonAttempts = unavailableComparisonAttemptReader,
  readLatestAttempt = unavailableLatestAttemptReader,
}: ApiServerOptions) {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (request.method === 'GET' && request.url === '/api/attempts/latest') {
      void readLatestAttempt(currentScenario.id).then(
        (attempt) => {
          response.writeHead(attempt ? 200 : 404, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          });
          response.end(
            JSON.stringify(
              attempt ?? { error: 'No completed Attempt is available.' }
            )
          );
        },
        () => {
          response.writeHead(500, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          });
          response.end(JSON.stringify({ error: 'Attempt could not be read.' }));
        }
      );
      return;
    }

    if (
      request.method === 'GET' &&
      request.url === '/api/attempts/comparison'
    ) {
      void readComparisonAttempts(currentScenario.id).then(
        (attempts) => {
          try {
            const comparison = createAttemptComparison(
              currentScenario.rubric,
              attempts
            );
            response.writeHead(200, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json',
            });
            response.end(JSON.stringify(comparison));
          } catch {
            sendAttemptComparisonReadFailure(response);
          }
        },
        () => {
          sendAttemptComparisonReadFailure(response);
        }
      );
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/attempts/transcript'
    ) {
      void readRawEventLogRequest(request, response, rawEventLogByteLimit).then(
        (rawEventLog) => {
          if (rawEventLog === undefined) {
            return;
          }

          try {
            const transcript = reconstructTranscriptSnapshot(rawEventLog);

            response.writeHead(200, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json',
            });
            response.end(JSON.stringify(transcript));
          } catch (error) {
            console.error(
              'Debug Transcript could not be reconstructed.',
              error
            );
            response.writeHead(422, {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json',
            });
            response.end(
              JSON.stringify({
                error: 'Transcript could not be reconstructed.',
              })
            );
          }
        }
      );
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/attempts/raw-event-log'
    ) {
      void readRawEventLogRequest(request, response, rawEventLogByteLimit).then(
        (rawEventLog) => {
          if (rawEventLog === undefined) {
            return;
          }

          void completeAttempt(rawEventLog).then(
            (attempt) => {
              response.writeHead(200, {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
              });
              response.end(JSON.stringify(attempt));
            },
            (error: unknown) => {
              // The page deliberately shows nothing during an Attempt, so this
              // log is the only place a failed judging run is visible while
              // tuning.
              console.error('Attempt could not be completed.', error);
              const status =
                error instanceof AttemptCompletionError
                  ? error.kind === 'data'
                    ? 422
                    : 502
                  : 500;
              const code =
                error instanceof AttemptCompletionError
                  ? error.kind === 'data'
                    ? 'attempt_data_incomplete'
                    : 'attempt_judging_failed'
                  : 'attempt_processing_failed';

              response.writeHead(status, {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
              });
              response.end(
                JSON.stringify({
                  code,
                  error:
                    error instanceof AttemptCompletionError &&
                    error.kind === 'data'
                      ? 'Attempt event data is incomplete.'
                      : 'Attempt judging could not be completed.',
                })
              );
            }
          );
        }
      );
      return;
    }

    if (request.method === 'GET' && request.url === '/api/scenario') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(toPublicScenario(currentScenario)));
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/realtime/client-secret'
    ) {
      void mintRealtimeClientSecret(currentScenario).then(
        (clientSecret) => {
          response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          });
          response.end(JSON.stringify(clientSecret));
        },
        () => {
          response.writeHead(502, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          });
          response.end(
            JSON.stringify({ error: 'Realtime credential unavailable.' })
          );
        }
      );
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
}
