import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type StoreRawEventLog = (
  rawEventLog: string,
  rawEventLogId: string
) => Promise<void>;

export function createRawEventLogStore(
  directory = resolve('data', 'raw-event-logs')
): StoreRawEventLog {
  return async (rawEventLog, rawEventLogId) => {
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${rawEventLogId}.json`;
    await writeFile(resolve(directory, filename), rawEventLog, {
      encoding: 'utf8',
      flag: 'wx',
    });
  };
}
