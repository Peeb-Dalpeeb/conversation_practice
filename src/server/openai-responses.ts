const responsesUrl = 'https://api.openai.com/v1/responses';

export type OpenAiResponsesFetch = typeof globalThis.fetch;

type RequestCompletedTextOptions = {
  apiKey: string;
  fetch: OpenAiResponsesFetch;
  request: Record<string, unknown>;
  errors: {
    requestFailed: (status: number) => string;
    malformedJson: string;
    incomplete: string;
    missingText: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function outputText(response: Record<string, unknown>): string | undefined {
  if (!Array.isArray(response.output)) {
    return undefined;
  }

  for (const output of response.output) {
    if (
      !isRecord(output) ||
      output.type !== 'message' ||
      !Array.isArray(output.content)
    ) {
      continue;
    }

    for (const content of output.content) {
      if (
        isRecord(content) &&
        content.type === 'output_text' &&
        typeof content.text === 'string'
      ) {
        return content.text;
      }
    }
  }

  return undefined;
}

export async function requestCompletedText({
  apiKey,
  fetch: fetchFromOpenAi,
  request,
  errors,
}: RequestCompletedTextOptions): Promise<string> {
  const response = await fetchFromOpenAi(responsesUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(errors.requestFailed(response.status));
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new TypeError(errors.malformedJson);
  }

  if (!isRecord(body) || body.status !== 'completed') {
    throw new TypeError(errors.incomplete);
  }

  const text = outputText(body);

  if (text === undefined) {
    throw new TypeError(errors.missingText);
  }

  return text;
}
