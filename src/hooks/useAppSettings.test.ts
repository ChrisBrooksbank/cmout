import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import useAppSettings from './useAppSettings';

describe('useAppSettings', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to defaults for unknown stored values', () => {
    localStorage.setItem(
      'cmout-app-settings',
      JSON.stringify({ theme: 'neon', fontSize: 'toString' })
    );
    const { result } = renderHook(() => useAppSettings());
    expect(result.current.settings).toEqual({ theme: 'system', fontSize: 'medium' });
    expect(document.documentElement.style.fontSize).toBe('15px');
  });

  it('restores valid stored values', () => {
    localStorage.setItem(
      'cmout-app-settings',
      JSON.stringify({ theme: 'dark', fontSize: 'large' })
    );
    const { result } = renderHook(() => useAppSettings());
    expect(result.current.settings).toEqual({ theme: 'dark', fontSize: 'large' });
  });
});
