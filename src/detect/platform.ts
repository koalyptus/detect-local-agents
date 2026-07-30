// src/detect/platform.ts
/**
 * Get the current OS platform.
 * Exported as a function so it can be mocked in tests.
 */
export function getPlatform(): string {
  return process.platform;
}
