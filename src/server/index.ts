import "dotenv/config";

import { createApiServer } from "./app.js";
import { readServerEnvironment } from "./environment.js";

const environment = readServerEnvironment();
const server = createApiServer();

server.listen(environment.port, "127.0.0.1", () => {
  console.log(`Local API listening on http://127.0.0.1:${environment.port}`);
});
