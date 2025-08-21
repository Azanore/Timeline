import { useContext, useMemo } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';
import { debounce } from '../utils';

/**
 * Centralized debounced setters for zoom/pan using context.
 */
export function useZoomPan() {
  const ctx = useContext(TimelineContext);
  const setPan = ctx?.setPan ?? (() => {});
  const setScale = ctx?.setScale ?? (() => {});

  const debouncedSetPan = useMemo(() => debounce((v) => setPan(v), 300), [setPan]);
  const debouncedSetScale = useMemo(() => debounce((v) => setScale(v), 300), [setScale]);

  return { debouncedSetPan, debouncedSetScale };
}
