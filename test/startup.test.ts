import { execFile } from "node:child_process";

import { describe, expect, it } from "vitest";

type CommandResult = {
  exitCode: number;
  output: string;
  timedOut: boolean;
};

function runDevHelpWithoutApiKey(): Promise<CommandResult> {
  const npmCliPath = process.env.npm_execpath;

  if (!npmCliPath) {
    throw new Error("npm_execpath is required to exercise the npm dev command.");
  }

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [npmCliPath, "run", "dev", "--", "--help"],
      {
        env: {
          ...process.env,
          OPENAI_API_KEY: " ",
        },
        timeout: 10_000,
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode:
            error && typeof error.code === "number"
              ? error.code
              : error
                ? -1
                : 0,
          output: `${stdout}${stderr}`,
          timedOut: error?.killed ?? false,
        });
      },
    );
  });
}

describe("the local development command", () => {
  it("fails before starting services when the API key is missing", async () => {
    const result = await runDevHelpWithoutApiKey();

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(
      "OPENAI_API_KEY is required. Copy .env.example to .env and add your key.",
    );
    expect(result.output).not.toContain("Local API listening");
    expect(result.output).not.toContain("Local:   http://localhost:");
  });
});
