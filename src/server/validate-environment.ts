import 'dotenv/config';

import { readServerEnvironment } from './environment.js';

// Runs as `predev`, before anything binds a port. A missing key is a setup
// mistake, not a crash, so report it as one line rather than a stack trace.
try {
  readServerEnvironment();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
