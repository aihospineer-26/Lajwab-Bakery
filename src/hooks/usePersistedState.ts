import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * Frontend-phase persistence. When the backend lands, the call sites keep their
 * shape and only the storage layer underneath changes.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then(raw => {
        if (cancelled || raw == null) return;
        try {
          setValue(JSON.parse(raw) as T);
        } catch {
          AsyncStorage.removeItem(key);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Waiting on hydration keeps the initial value from overwriting stored data
  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value, isHydrated]);

  return [value, setValue, isHydrated] as const;
}
