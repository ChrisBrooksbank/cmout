/** Type augmentation for the Network Information API (not yet in lib.dom). */
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: string;
  readonly saveData?: boolean;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
  }
}

type ConnectionQuality = 'fast' | 'slow' | 'unknown';

/** Detect whether the current connection is fast, slow, or unknown. */
export function getConnectionQuality(): ConnectionQuality {
  const conn = navigator.connection;
  if (!conn) return 'unknown';
  if (conn.saveData) return 'slow';
  switch (conn.effectiveType) {
    case '4g':
      return 'fast';
    case '3g':
    case '2g':
    case 'slow-2g':
      return 'slow';
    default:
      return 'unknown';
  }
}

/**
 * Subscribe to connection quality changes. Returns an unsubscribe function.
 * No-ops if the API is unavailable.
 */
export function onConnectionChange(cb: () => void): () => void {
  const conn = navigator.connection;
  if (!conn) return () => {};
  conn.addEventListener('change', cb);
  return () => conn.removeEventListener('change', cb);
}
