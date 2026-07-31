// tests/timeout.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout, TimeoutError } from '../src/timeout.js';

describe('timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the value when promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
  });

  it('rejects with TimeoutError when promise never settles', async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const pending = withTimeout(never, 50);

    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it('propagates rejection from the wrapped promise', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 100),
    ).rejects.toThrow('boom');
  });

  it('clears the timer when the promise wins the race', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const result = await withTimeout(Promise.resolve('fast'), 10_000);
    expect(result).toBe('fast');
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
    vi.useRealTimers();
  });
});
