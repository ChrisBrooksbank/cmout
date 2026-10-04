import { useCallback, useEffect, useRef, useState } from 'react';

import type { Embeddings } from '../search/semantic-search';
import { initModel } from '../search/semantic-search';
import { getConnectionQuality, onConnectionChange } from '../utils/connection';

export type SmartSearchPhase = 'idle' | 'loading' | 'ready' | 'prompt' | 'disabled' | 'error';

const STORAGE_KEY = 'cmout-smart-search-pref';

function getStoredPref(): 'enabled' | 'disabled' | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'enabled' || v === 'disabled') return v;
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

function setStoredPref(pref: 'enabled' | 'disabled') {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

interface UseSmartSearchReturn {
  phase: SmartSearchPhase;
  embeddings: Embeddings | null;
  modelReady: boolean;
  /** Call when the user's query goes from empty to non-empty. */
  onQueryStart: () => void;
  acceptSmartSearch: () => void;
  declineSmartSearch: () => void;
}

export default function useSmartSearch(): UseSmartSearchReturn {
  // Start as 'disabled' if the user previously turned smart search off, so the
  // settings toggle reflects the stored preference before any query is typed
  const [phase, setPhase] = useState<SmartSearchPhase>(() =>
    getStoredPref() === 'disabled' ? 'disabled' : 'idle'
  );
  const [embeddings, setEmbeddings] = useState<Embeddings | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const loadStarted = useRef(false);

  // Listen for connection upgrades while in 'prompt' phase
  useEffect(() => {
    if (phase !== 'prompt') return;
    return onConnectionChange(() => {
      if (getConnectionQuality() === 'fast') {
        loadSmartSearch();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const loadSmartSearch = useCallback(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setPhase('loading');

    Promise.all([
      fetch('/embeddings.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load embeddings (${res.status})`);
        return res.json() as Promise<Embeddings>;
      }),
      initModel(),
    ])
      .then(([embeddingsData]) => {
        setEmbeddings(embeddingsData);
        setModelReady(true);
        // The user may have switched smart search off while it was loading
        if (getStoredPref() === 'disabled') {
          setPhase('disabled');
        } else {
          setPhase('ready');
          setStoredPref('enabled');
        }
      })
      .catch(() => {
        setPhase('error');
        loadStarted.current = false;
      });
  }, []);

  const onQueryStart = useCallback(() => {
    if (phase !== 'idle' && phase !== 'error') return;

    const stored = getStoredPref();
    if (stored === 'disabled') {
      setPhase('disabled');
      return;
    }

    const quality = getConnectionQuality();
    if (stored === 'enabled' || quality === 'fast' || quality === 'unknown') {
      loadSmartSearch();
    } else {
      // slow/metered — ask the user
      setPhase('prompt');
    }
  }, [phase, loadSmartSearch]);

  const acceptSmartSearch = useCallback(() => {
    setStoredPref('enabled');
    if (modelReady) {
      setPhase('ready');
    } else if (loadStarted.current) {
      setPhase('loading');
    } else {
      loadSmartSearch();
    }
  }, [modelReady, loadSmartSearch]);

  const declineSmartSearch = useCallback(() => {
    setStoredPref('disabled');
    setPhase('disabled');
  }, []);

  return { phase, embeddings, modelReady, onQueryStart, acceptSmartSearch, declineSmartSearch };
}
