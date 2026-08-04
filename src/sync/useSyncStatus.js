import { useEffect, useMemo, useState } from 'react';
import { createSyncStatusStore } from './syncStatus.js';

export function useSyncStatus(storage = globalThis.localStorage) {
  const store = useMemo(() => createSyncStatusStore(storage), [storage]);
  const [status, setStatus] = useState(store.get);
  useEffect(() => {
    const update = () => setStatus(store.get());
    globalThis.addEventListener?.('plant-sync-status-change', update);
    return () => globalThis.removeEventListener?.('plant-sync-status-change', update);
  }, [store]);
  return status;
}
