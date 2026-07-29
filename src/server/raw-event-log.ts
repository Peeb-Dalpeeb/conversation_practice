import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type StoreRawEventLog = (rawEventLog: string) => Promise<void>;

export function createRawEventLogStore(
  directory = resolve('data', 'raw-event-logs')
): StoreRawEventLog {
  return async (rawEventLog) => {
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, `${Date.now()}-${randomUUID()}.json`),
      rawEventLog,
      { encoding: 'utf8', flag: 'wx' }
    );
  };
}
