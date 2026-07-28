import { createServer } from 'node:http';

import { toPublicScenario, type Scenario } from '../scenario.js';

export function createApiServer(currentScenario: Scenario) {
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

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
}
