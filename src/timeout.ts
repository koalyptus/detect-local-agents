// src/timeout.ts
/**
 * Wrap a promise with a timeout.
 * Rejects with a TimeoutError if the promise doesn't settle within `ms`.
 * The underlying operation continues but its result is discarded.
 */
export class TimeoutError extends Error {
  constructor(ms: number, label?: string) {
    const suffix = label ? ` (${label})` : '';
    super(`Operation timed out after ${ms}ms${suffix}`);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const race = Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new TimeoutError(ms, label));
      }, ms);
    }),
  ]);

  try {
    return await race;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
