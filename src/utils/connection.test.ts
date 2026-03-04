import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConnectionQuality } from './connection';

function mockConnection(props: { effectiveType?: string; saveData?: boolean } | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: props
      ? { ...props, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      : undefined,
    configurable: true,
  });
}

afterEach(() => {
  // Reset to undefined
  Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
});

describe('getConnectionQuality', () => {
  it('returns "unknown" when API is unavailable', () => {
    mockConnection(undefined);
    expect(getConnectionQuality()).toBe('unknown');
  });

  it('returns "slow" when saveData is true', () => {
    mockConnection({ saveData: true, effectiveType: '4g' });
    expect(getConnectionQuality()).toBe('slow');
  });

  it('returns "fast" for 4g', () => {
    mockConnection({ effectiveType: '4g' });
    expect(getConnectionQuality()).toBe('fast');
  });

  it('returns "slow" for 3g', () => {
    mockConnection({ effectiveType: '3g' });
    expect(getConnectionQuality()).toBe('slow');
  });

  it('returns "slow" for 2g', () => {
    mockConnection({ effectiveType: '2g' });
    expect(getConnectionQuality()).toBe('slow');
  });

  it('returns "slow" for slow-2g', () => {
    mockConnection({ effectiveType: 'slow-2g' });
    expect(getConnectionQuality()).toBe('slow');
  });

  it('returns "unknown" for unrecognised effectiveType', () => {
    mockConnection({ effectiveType: '5g' });
    expect(getConnectionQuality()).toBe('unknown');
  });
});
