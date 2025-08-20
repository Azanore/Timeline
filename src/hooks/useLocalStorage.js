// Minimal localStorage hook (placeholder). Full version in Phase 1.
import { useCallback } from 'react';

export function useLocalStorage() {
  // Safe JSON parse that never throws
  const safeParse = useCallback((raw) => {
    try {
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  // Safe JSON stringify that never throws; falls back to String() if needed
  const safeStringify = useCallback((val) => {
    try {
      return JSON.stringify(val);
    } catch {
      try {
        return String(val);
      } catch {
        return '';
      }
    }
  }, []);

  const get = useCallback((key) => {
    try {
      const raw = localStorage.getItem(key);
      return safeParse(raw);
    } catch {
      return null;
    }
  }, []);

  const set = useCallback((key, val) => {
    try {
      localStorage.setItem(key, safeStringify(val));
      return true;
    } catch {
      return false;
    }
  }, [safeStringify]);

  const remove = useCallback((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  }, []);

  // Debounced setter factory (caller can reuse the returned fn)
  const makeDebouncedSet = useCallback((key, delay = 300) => {
    let t;
    return (val) => {
      clearTimeout(t);
      t = setTimeout(() => {
        set(key, val);
      }, delay);
    };
  }, [set]);

  // Basic migration helper: given current version and map of migrators
  // migrators: { [fromVersion]: (data) => ({ data, version }) }
  const migrate = useCallback((key, currentVersion, migrators = {}) => {
    const existing = get(key);
    if (!existing || typeof existing !== 'object') return existing;
    let data = existing;
    let v = Number(existing.version) || 1;
    // Apply sequential migrations until we reach currentVersion
    while (v < currentVersion) {
      const fn = migrators[v];
      if (typeof fn !== 'function') break;
      const res = fn(data);
      if (res && typeof res === 'object') {
        data = res.data ?? data;
        v = Number(res.version) || v + 1;
      } else {
        break;
      }
    }
    // Persist migrated data if version changed
    if (v !== (existing.version || 1)) {
      set(key, { ...data, version: v });
    }
    return data;
  }, [get, set]);

  return { get, set, remove, safeParse, safeStringify, makeDebouncedSet, migrate };
}
