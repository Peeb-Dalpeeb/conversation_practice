import 'dotenv/config';

import { scenario } from '../scenario.js';
import { createApiServer } from './app.js';
import { readServerEnvironment } from './environment.js';

const environment = readServerEnvironment();
const server = createApiServer(scenario);

server.listen(environment.port, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${environment.port}`);
});
