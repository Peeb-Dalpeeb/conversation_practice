import { rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import {
  createServer as createViteServer,
  type ViteDevServer,
} from "vite";

import { createApiServer } from "../src/server/app.js";

const servers: ReturnType<typeof createApiServer>[] = [];
const viteServers: ViteDevServer[] = [];
const proxyMode = `proxy-test-${process.pid}`;
const proxyEnvironmentPath = resolve(`.env.${proxyMode}`);
const inheritedServerPort = process.env.SERVER_PORT;

async function startApiServer(): Promise<number> {
  const server = createApiServer();
  servers.push(server);

  await new Promise<void>((resolveListening) => {
    server.listen(0, "127.0.0.1", resolveListening);
  });

  return (server.address() as AddressInfo).port;
}

afterEach(async () => {
  await Promise.all(viteServers.splice(0).map((server) => server.close()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
      }),
    ),
  );
  await rm(proxyEnvironmentPath, { force: true });

  if (inheritedServerPort === undefined) {
    delete process.env.SERVER_PORT;
  } else {
    process.env.SERVER_PORT = inheritedServerPort;
  }
});

describe("the server HTTP interface", () => {
  it("reports that the local API is available", async () => {
    const port = await startApiServer();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("is reachable through the page development server", async () => {
    const apiPort = await startApiServer();
    await writeFile(proxyEnvironmentPath, `SERVER_PORT=${apiPort}\n`);
    delete process.env.SERVER_PORT;

    const pageServer = await createViteServer({
      configFile: resolve("vite.config.ts"),
      logLevel: "silent",
      mode: proxyMode,
      server: {
        host: "127.0.0.1",
        port: 0,
      },
    });
    viteServers.push(pageServer);
    await pageServer.listen();

    const pageAddress = pageServer.httpServer?.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${pageAddress.port}/api/health`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
