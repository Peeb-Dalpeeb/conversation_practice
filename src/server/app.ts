import { createServer } from 'node:http';

import { toPublicScenario, type Scenario } from '../scenario.js';
import type { MintRealtimeClientSecret } from './realtime.js';

const unavailableRealtimeClientSecret: MintRealtimeClientSecret = () =>
  Promise.reject(
    new Error('Realtime client secret minting is not configured.')
  );

export function createApiServer(
  currentScenario: Scenario,
  mintRealtimeClientSecret: MintRealtimeClientSecret = unavailableRealtimeClientSecret
) {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
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
