import { createServer } from 'node:http';

import { toPublicScenario, type Scenario } from '../scenario.js';
import type { CompleteAttempt } from './attempt-completion.js';
import type { MintRealtimeClientSecret } from './realtime.js';

const unavailableRealtimeClientSecret: MintRealtimeClientSecret = () =>
  Promise.reject(
    new Error('Realtime client secret minting is not configured.')
  );
const unavailableAttemptCompleter: CompleteAttempt = () =>
  Promise.reject(new Error('Attempt completion is not configured.'));
const defaultRawEventLogByteLimit = 8 * 1024 * 1024;

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

export function createApiServer(
  currentScenario: Scenario,
  mintRealtimeClientSecret: MintRealtimeClientSecret = unavailableRealtimeClientSecret,
  completeAttempt: CompleteAttempt = unavailableAttemptCompleter,
  rawEventLogByteLimit = defaultRawEventLogByteLimit
) {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/attempts/raw-event-log'
    ) {
      if (
        !request.headers['content-type']
          ?.toLowerCase()
          .startsWith('application/json')
      ) {
        // Drain rather than ignore: an unread body resets the connection, and
        // the page would report a network fault instead of the refusal.
        request.resume();
        response.writeHead(415, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'JSON body required.' }));
        return;
      }

      void readRequestBody(request, rawEventLogByteLimit).then(
        (rawEventLog) =>
          completeAttempt(rawEventLog).then(
            () => {
              response.writeHead(204);
              response.end();
            },
            (error: unknown) => {
              // The page deliberately shows nothing during an Attempt, so this
              // log is the only place a failed judging run is visible while
              // tuning.
              console.error('Attempt could not be completed.', error);
              response.writeHead(500, {
                'Content-Type': 'application/json',
              });
              response.end(
                JSON.stringify({ error: 'Attempt could not be completed.' })
              );
            }
          ),
        (error: unknown) => {
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
