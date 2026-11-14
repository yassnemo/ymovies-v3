const MAX_BODY_BYTES = 1024 * 1024;
const MAX_JSON_DEPTH = 16;
const MAX_JSON_VALUES = 25_000;
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

export class RequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

export async function readJson(
  request: Request
): Promise<Record<string, unknown>> {
  const type = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  if (
    type !== 'application/json' &&
    !(type?.startsWith('application/') && type.endsWith('+json'))
  ) {
    throw new RequestError(415, 'Use application/json for this request.');
  }
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Request data exceeds the 1 MB limit.');
  }
  if (!request.body) throw new RequestError(400, 'Request data is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError(413, 'Request data exceeds the 1 MB limit.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'Request data is not valid UTF-8 JSON.');
  } finally {
    reader.releaseLock();
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RequestError(400, 'Request data is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RequestError(400, 'Request data must be an object.');
  }
  const pending: { value: unknown; depth: number }[] = [
    { value: data, depth: 0 }
  ];
  let values = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++values > MAX_JSON_VALUES || depth > MAX_JSON_DEPTH) {
      throw new RequestError(400, 'Request data is too complex.');
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (unsafeKeys.has(key))
          throw new RequestError(400, 'Request contains an unsupported key.');
        pending.push({ value: child, depth: depth + 1 });
      }
    }
  }
  return data as Record<string, unknown>;
}
