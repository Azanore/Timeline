import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRef } from 'react';

export const TimelineContext = createContext(null);

const APP_KEY = 'timeline_app';
const INDEX_KEY = 'timeline_index'; // legacy

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TimelineProvider({ children }) {
  const { get, set, remove, makeDebouncedSet } = useLocalStorage();
  const debouncedSetRef = useRef(null);

  const readApp = useCallback(() => {
    return get(APP_KEY) || null;
  }, [get]);

  const writeApp = useCallback((updater) => {
    const current = readApp() || { version: 1, activeTimelineId: 'default', timelines: [{ id: 'default', name: 'Default', version: 1 }], data: {} };
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    set(APP_KEY, next);
    return next;
  }, [readApp, set]);

  // One-time migration from legacy scattered keys to single APP_KEY
  useEffect(() => {
    const app = readApp();
    if (app) return; // already using consolidated key
    const idx = get(INDEX_KEY);
    if (Array.isArray(idx) && idx.length > 0) {
      const activeId = idx[0]?.id || 'default';
      const data = {};
      idx.forEach(t => {
        const key = `timeline_${t.id}`;
        const tl = get(key);
        if (tl) data[t.id] = { id: t.id, name: t.name, createdAt: tl.createdAt || Date.now(), updatedAt: tl.updatedAt || Date.now(), version: tl.version || 1, events: tl.events || [], viewport: tl.viewport || { scale: 1, pan: 0 } };
      });
      const consolidated = { version: 1, activeTimelineId: activeId, timelines: idx, data };
      set(APP_KEY, consolidated);
      // Clean up legacy keys to reduce clutter
      try {
        remove(INDEX_KEY);
        idx.forEach(t => {
          remove(`timeline_${t.id}`);
          remove(`timeline_backup_${t.id}`);
        });
      } catch {}
    } else {
      // Initialize a fresh app object
      const consolidated = { version: 1, activeTimelineId: 'default', timelines: [{ id: 'default', name: 'Default', version: 1 }], data: { default: { id: 'default', name: 'Default', createdAt: Date.now(), updatedAt: Date.now(), version: 1, events: [], viewport: { scale: 1, pan: 0 } } } };
      set(APP_KEY, consolidated);
    }
  }, [get, set, remove, readApp]);

  const initialApp = readApp() || { version: 1, activeTimelineId: 'default', timelines: [{ id: 'default', name: 'Default', version: 1 }], data: { default: { id: 'default', name: 'Default', createdAt: Date.now(), updatedAt: Date.now(), version: 1, events: [], viewport: { scale: 1, pan: 0 } } } };

  const [timelines, setTimelines] = useState(() => initialApp.timelines || [{ id: 'default', name: 'Default', version: 1 }]);
  const [activeTimelineId, setActiveTimelineId] = useState(() => initialApp.activeTimelineId || 'default');

  // Persist index and active id into APP_KEY on change
  useEffect(() => {
    writeApp(app => ({ ...app, timelines, activeTimelineId }));
  }, [timelines, activeTimelineId, writeApp]);

  // Ensure an entry exists in APP_KEY for the active timeline
  useEffect(() => {
    if (!activeTimelineId) return;
    writeApp(app => {
      const exists = app.data?.[activeTimelineId];
      if (exists) return app;
      const name = timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled';
      return { ...app, data: { ...(app.data || {}), [activeTimelineId]: { id: activeTimelineId, name, createdAt: Date.now(), updatedAt: Date.now(), version: 1, events: [], viewport: { scale: 1, pan: 0 } } } };
    });
  }, [activeTimelineId, writeApp, timelines]);

  const setActiveTimeline = useCallback((id) => {
    setActiveTimelineId(id);
  }, []);

  const createTimeline = useCallback((name = 'New Timeline') => {
    const id = makeId();
    const entry = { id, name, version: 1 };
    setTimelines(prev => [entry, ...prev]);
    writeApp(app => ({
      ...app,
      timelines: [entry, ...(app.timelines || [])],
      data: { ...(app.data || {}), [id]: { id, name, createdAt: Date.now(), updatedAt: Date.now(), version: 1, events: [], viewport: { scale: 1, pan: 0 } } },
    }));
    setActiveTimelineId(id);
    return id;
  }, [writeApp]);

  const deleteTimeline = useCallback((id) => {
    setTimelines(prev => prev.filter(t => t.id !== id));
    writeApp(app => {
      const nextTimelines = (app.timelines || []).filter(t => t.id !== id);
      const { [id]: _, ...rest } = app.data || {};
      const nextActive = activeTimelineId === id ? (nextTimelines[0]?.id || 'default') : app.activeTimelineId;
      return { ...app, timelines: nextTimelines, data: rest, activeTimelineId: nextActive };
    });
    if (activeTimelineId === id) {
      const next = timelines.find(t => t.id !== id)?.id || 'default';
      setActiveTimelineId(next);
    }
  }, [activeTimelineId, timelines, writeApp]);

    // Events state for active timeline
  const [events, setEvents] = useState(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    return tl?.events || [];
  });

    // Load events when active timeline changes
  useEffect(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    setEvents(tl?.events || []);
  }, [activeTimelineId, readApp]);

    // Viewport state for active timeline
  const [viewport, setViewport] = useState(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    return tl?.viewport || { scale: 1, pan: 0 };
  });

  // Load viewport when active timeline changes
  useEffect(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    setViewport(tl?.viewport || { scale: 1, pan: 0 });
  }, [activeTimelineId, readApp]);

  // Persist timeline data (events + viewport) into APP_KEY with debounce (300ms)
  useEffect(() => {
    if (!activeTimelineId) return;
    if (!debouncedSetRef.current) {
      debouncedSetRef.current = makeDebouncedSet(APP_KEY, 300);
    }
    const app = readApp() || { version: 1, activeTimelineId, timelines, data: {} };
    const existing = app.data?.[activeTimelineId] || { id: activeTimelineId, name: timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled', createdAt: Date.now(), version: 1, events: [], viewport: { scale: 1, pan: 0 } };
    const updatedEntry = { ...existing, updatedAt: Date.now(), events: events || [], viewport: viewport || { scale: 1, pan: 0 } };
    const next = { ...app, activeTimelineId, timelines, data: { ...(app.data || {}), [activeTimelineId]: updatedEntry } };
    debouncedSetRef.current(next);
  }, [events, viewport, activeTimelineId, timelines, readApp, makeDebouncedSet]);

  // Event CRUD
  const addEvent = useCallback((input) => {
    const id = makeId();
    setEvents(prev => [...prev, { ...input, id }]);
    return id;
  }, []);

  const updateEvent = useCallback((id, input) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...input } : e)));
  }, []);

  const removeEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const setScale = useCallback((s) => setViewport(v => ({ ...v, scale: s })), []);
  const setPan = useCallback((p) => setViewport(v => ({ ...v, pan: p })), []);

  const value = useMemo(() => ({
    activeTimelineId,
    setActiveTimeline,
    timelines,
    createTimeline,
    deleteTimeline,
    events,
    viewport,
    setScale,
    setPan,
    addEvent,
    updateEvent,
    removeEvent,
  }), [activeTimelineId, setActiveTimeline, timelines, createTimeline, deleteTimeline, viewport, setScale, setPan, addEvent, updateEvent, removeEvent, events]);

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}
