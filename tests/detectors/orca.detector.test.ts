import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/detect/utils.js', () => ({
  which: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
}));

import { which } from '../../src/detect/utils.js';
import * as fs from 'node:fs/promises';

const mockWhich = vi.mocked(which);
const mockFsAccess = vi.mocked(fs.access);
const mockFsReaddir = vi.mocked(fs.readdir);

import orcaDetector from '../../src/detectors/orca.detector.js';

describe('orca detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when orca not found', async () => {
    mockWhich.mockResolvedValue(null);
    expect(await orcaDetector.detect()).toBeNull();
  });

  it('returns agent when orca found (not configured)', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockRejectedValue(new Error('not found'));

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.binary).toBe('/usr/bin/orca');
    expect(result?.isConfigured).toBe(false);
    expect(result?.configSource).toBeUndefined();
    expect(result?.isACPAgent).toBe(true);
  });

  it('returns agent when orca found and configured with config files', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFsReaddir.mockResolvedValue(['agents.json', 'config.yaml', 'cache.db'] as any);

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.isConfigured).toBe(true);
    expect(result?.configSource).toBe('config-dir');
    expect(result?.metadata?.managedAgents).toEqual(['agents.json', 'config.yaml']);
  });

  it('handles readdir failure gracefully', async () => {
    mockWhich.mockResolvedValue('/usr/bin/orca');
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReaddir.mockRejectedValue(new Error('permission denied'));

    const result = await orcaDetector.detect();
    expect(result?.name).toBe('orca');
    expect(result?.isConfigured).toBe(true);
    expect(result?.metadata?.managedAgents).toEqual([]);
  });
});
