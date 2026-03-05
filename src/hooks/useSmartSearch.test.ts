import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useSmartSearch from './useSmartSearch';

// Mock semantic-search module
vi.mock('../search/semantic-search', () => ({
  initModel: vi.fn().mockResolvedValue(undefined),
}));

// Mock connection module
vi.mock('../utils/connection', () => ({
  getConnectionQuality: vi.fn().mockReturnValue('fast'),
  onConnectionChange: vi.fn().mockReturnValue(() => {}),
}));

import { getConnectionQuality, onConnectionChange } from '../utils/connection';
import { initModel } from '../search/semantic-search';

const mockGetConnectionQuality = getConnectionQuality as ReturnType<typeof vi.fn>;
const mockOnConnectionChange = onConnectionChange as ReturnType<typeof vi.fn>;
const mockInitModel = initModel as ReturnType<typeof vi.fn>;

const EMBEDDINGS = { eventIds: ['e1'], vectors: [[0.1, 0.2]] };

function mockFetchSuccess() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(EMBEDDINGS),
    })
  );
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

describe('useSmartSearch', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetConnectionQuality.mockReturnValue('fast');
    mockOnConnectionChange.mockReturnValue(() => {});
    mockInitModel.mockResolvedValue(undefined);
    mockFetchSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle phase', () => {
    const { result } = renderHook(() => useSmartSearch());
    expect(result.current.phase).toBe('idle');
    expect(result.current.embeddings).toBeNull();
    expect(result.current.modelReady).toBe(false);
  });

  it('auto-loads on fast connection when query starts', async () => {
    mockGetConnectionQuality.mockReturnValue('fast');
    const { result } = renderHook(() => useSmartSearch());

    await act(async () => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('ready');
    expect(result.current.embeddings).toEqual(EMBEDDINGS);
    expect(result.current.modelReady).toBe(true);
  });

  it('auto-loads on unknown connection (Firefox/Safari)', async () => {
    mockGetConnectionQuality.mockReturnValue('unknown');
    const { result } = renderHook(() => useSmartSearch());

    await act(async () => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('ready');
  });

  it('shows prompt on slow connection', async () => {
    mockGetConnectionQuality.mockReturnValue('slow');
    const { result } = renderHook(() => useSmartSearch());

    act(() => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('prompt');
  });

  it('loads after accepting prompt', async () => {
    mockGetConnectionQuality.mockReturnValue('slow');
    const { result } = renderHook(() => useSmartSearch());

    act(() => {
      result.current.onQueryStart();
    });
    expect(result.current.phase).toBe('prompt');

    await act(async () => {
      result.current.acceptSmartSearch();
    });

    expect(result.current.phase).toBe('ready');
    expect(result.current.modelReady).toBe(true);
  });

  it('goes to disabled after declining prompt', () => {
    mockGetConnectionQuality.mockReturnValue('slow');
    const { result } = renderHook(() => useSmartSearch());

    act(() => {
      result.current.onQueryStart();
    });

    act(() => {
      result.current.declineSmartSearch();
    });

    expect(result.current.phase).toBe('disabled');
    expect(localStorage.getItem('cmout-smart-search-pref')).toBe('disabled');
  });

  it('recalls disabled preference from localStorage', () => {
    localStorage.setItem('cmout-smart-search-pref', 'disabled');
    const { result } = renderHook(() => useSmartSearch());

    act(() => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('disabled');
  });

  it('recalls enabled preference and skips prompt on slow connection', async () => {
    localStorage.setItem('cmout-smart-search-pref', 'enabled');
    mockGetConnectionQuality.mockReturnValue('slow');
    const { result } = renderHook(() => useSmartSearch());

    await act(async () => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('ready');
  });

  it('goes to error phase on fetch failure', async () => {
    mockFetchFailure();
    const { result } = renderHook(() => useSmartSearch());

    await act(async () => {
      result.current.onQueryStart();
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.modelReady).toBe(false);
  });

  it('listens for connection changes while in prompt phase', () => {
    mockGetConnectionQuality.mockReturnValue('slow');
    const { result } = renderHook(() => useSmartSearch());

    act(() => {
      result.current.onQueryStart();
    });

    expect(mockOnConnectionChange).toHaveBeenCalled();
  });

  it('does not call onQueryStart again after leaving idle', async () => {
    const { result } = renderHook(() => useSmartSearch());

    await act(async () => {
      result.current.onQueryStart();
    });
    expect(result.current.phase).toBe('ready');

    // Calling again should be a no-op
    await act(async () => {
      result.current.onQueryStart();
    });
    expect(result.current.phase).toBe('ready');
  });
});
