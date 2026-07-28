import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Resolved rather than shelled through npm, so the suite also passes when it is
// run directly (an IDE runner, `npx vitest`) instead of through `npm test`.
const tsxCliPath = createRequire(import.meta.url).resolve('tsx/cli');

type CommandResult = {
  exitCode: number;
  output: string;
  timedOut: boolean;
};

function runEnvironmentCheckWithoutApiKey(): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    execFile(
      process.execPath,
      [tsxCliPath, resolve('src/server/validate-environment.ts')],
      {
        env: {
          ...process.env,
          OPENAI_API_KEY: ' ',
        },
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        resolveResult({
          exitCode:
            error && typeof error.code === 'number'
              ? error.code
              : error
                ? -1
                : 0,
          output: `${stdout}${stderr}`,
          timedOut: error?.killed ?? false,
        });
      }
    );
  });
}

describe('the local development command', () => {
  it('fails before starting services when the API key is missing', async () => {
    const result = await runEnvironmentCheckWithoutApiKey();

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(
      'OPENAI_API_KEY is required. Copy .env.example to .env and add your key.'
    );
    expect(result.output).not.toContain('Local API listening');
  });

  it('reports the missing key as a message rather than a stack trace', async () => {
    const result = await runEnvironmentCheckWithoutApiKey();

    expect(result.output).not.toContain('at readServerEnvironment');
    expect(result.output.trim().split('\n')).toHaveLength(1);
  });

  it('runs that check before the dev command starts anything', async () => {
    const manifest = JSON.parse(
      await readFile(resolve('package.json'), 'utf8')
    ) as { scripts: Record<string, string> };

    // `predev` is what makes the check run first; without this wiring the two
    // tests above would pass while `npm run dev` still came up half-started.
    expect(manifest.scripts.predev).toContain('validate-environment');
    expect(manifest.scripts.dev).toContain('concurrently');
  });
});
