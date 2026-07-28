import { createServer } from "node:http";

export function createApiServer() {
  return createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
}
