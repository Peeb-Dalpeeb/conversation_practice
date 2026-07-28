export type ServerEnvironment = {
  openAiApiKey: string;
  port: number;
};

export function readServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): ServerEnvironment {
  const openAiApiKey = environment.OPENAI_API_KEY?.trim();

  if (!openAiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is required. Copy .env.example to .env and add your key.'
    );
  }

  const portText = environment.SERVER_PORT ?? '3001';
  const port = Number(portText);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('SERVER_PORT must be an integer between 1 and 65535.');
  }

  return { openAiApiKey, port };
}
