import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeEvent, comparePartialDate } from '../utils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRef } from 'react';
import CONFIG from '../config/index.js';

export const TimelineContext = createContext(null);

const APP_KEY = CONFIG.storage.appKey;

function makeId() {
  return Math.random().toString(36).slice(2, 2 + (CONFIG.app.idLength || 8));
}

export function TimelineProvider({ children }) {
  const { get, set, makeDebouncedSet } = useLocalStorage();
  const debouncedSetRef = useRef(null);

  const readApp = useCallback(() => {
    return get(APP_KEY) || null;
  }, [get]);

  const writeApp = useCallback((updater) => {
    const current = readApp() || { version: CONFIG.app.initialVersion, activeTimelineId: 'default', timelines: [{ id: 'default', name: CONFIG.app.defaultTimelineName, version: CONFIG.app.initialVersion }], data: {} };
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    set(APP_KEY, next);
    return next;
  }, [readApp, set]);

  // Ensure an app object exists under APP_KEY for fresh installs
  useEffect(() => {
    const app = readApp();
    if (app) return;
    const consolidated = { version: CONFIG.app.initialVersion, activeTimelineId: 'default', timelines: [{ id: 'default', name: CONFIG.app.defaultTimelineName, version: CONFIG.app.initialVersion }], data: { default: { id: 'default', name: CONFIG.app.defaultTimelineName, createdAt: Date.now(), updatedAt: Date.now(), version: CONFIG.app.initialVersion, events: [], viewport: { scale: CONFIG.zoom.reset, pan: 0 } } } };
    set(APP_KEY, consolidated);
  }, [get, set, readApp]);

  const initialApp = readApp() || { version: CONFIG.app.initialVersion, activeTimelineId: 'default', timelines: [{ id: 'default', name: CONFIG.app.defaultTimelineName, version: CONFIG.app.initialVersion }], data: { default: { id: 'default', name: CONFIG.app.defaultTimelineName, createdAt: Date.now(), updatedAt: Date.now(), version: CONFIG.app.initialVersion, events: [], viewport: { scale: CONFIG.zoom.reset, pan: 0 } } } };

  const [timelines, setTimelines] = useState(() => initialApp.timelines || [{ id: 'default', name: CONFIG.app.defaultTimelineName, version: CONFIG.app.initialVersion }]);
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
      return { ...app, data: { ...(app.data || {}), [activeTimelineId]: { id: activeTimelineId, name, createdAt: Date.now(), updatedAt: Date.now(), version: CONFIG.app.initialVersion, events: [], viewport: { scale: CONFIG.zoom.reset, pan: 0 } } } };
    });
  }, [activeTimelineId, writeApp, timelines]);

  const setActiveTimeline = useCallback((id) => {
    setActiveTimelineId(id);
  }, []);

  const createTimeline = useCallback((name = CONFIG.app.newTimelineName) => {
    const id = makeId();
    const entry = { id, name, version: CONFIG.app.initialVersion };
    setTimelines(prev => [entry, ...prev]);
    writeApp(app => ({
      ...app,
      timelines: [entry, ...(app.timelines || [])],
      data: { ...(app.data || {}), [id]: { id, name, createdAt: Date.now(), updatedAt: Date.now(), version: CONFIG.app.initialVersion, events: [], viewport: { scale: CONFIG.zoom.reset, pan: 0 } } },
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
    const raw = tl?.events || [];
    return raw.map(normalizeEvent);
  });

    // Load events when active timeline changes
  useEffect(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    const raw = tl?.events || [];
    setEvents(raw.map(normalizeEvent));
  }, [activeTimelineId, readApp]);

    // Viewport state for active timeline
  const [viewport, setViewport] = useState(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    return tl?.viewport || { scale: CONFIG.zoom.reset, pan: 0 };
  });

  // Filters and UI tab state (per-timeline), persisted
  const defaultFilters = useMemo(() => ({
    // types: null => all types selected; otherwise Set of type keys
    types: null,
    search: '',
    sort: 'dateAsc', // 'dateAsc' | 'dateDesc'
    asideTab: 'dated', // 'dated' | 'undated' (UI state; timeline ignores)
  }), []);

  const [filters, setFilters] = useState(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    const f = tl?.filters;
    if (!f) return defaultFilters;
    // Normalize persisted shape
    return {
      types: Array.isArray(f.types) ? new Set(f.types) : (f.types instanceof Set ? f.types : (f.types == null ? null : new Set(f.types))),
      search: String(f.search ?? ''),
      sort: f.sort === 'dateDesc' ? 'dateDesc' : 'dateAsc',
      asideTab: f.asideTab === 'undated' ? 'undated' : 'dated',
    };
  });

  // Load viewport when active timeline changes
  useEffect(() => {
    const app = readApp();
    const tl = app?.data?.[activeTimelineId];
    setViewport(tl?.viewport || { scale: CONFIG.zoom.reset, pan: 0 });
    // Load filters for the active timeline
    const f = tl?.filters;
    if (!f) {
      setFilters(defaultFilters);
    } else {
      setFilters({
        types: Array.isArray(f.types) ? new Set(f.types) : (f.types instanceof Set ? f.types : (f.types == null ? null : new Set(f.types))),
        search: String(f.search ?? ''),
        sort: f.sort === 'dateDesc' ? 'dateDesc' : 'dateAsc',
        asideTab: f.asideTab === 'undated' ? 'undated' : 'dated',
      });
    }
  }, [activeTimelineId, readApp]);

  // Persist timeline data (events + viewport) into APP_KEY with debounce from CONFIG
  useEffect(() => {
    if (!activeTimelineId) return;
    if (!debouncedSetRef.current) {
      debouncedSetRef.current = makeDebouncedSet(APP_KEY, CONFIG.storage.debounceMs);
    }
    const app = readApp() || { version: CONFIG.app.initialVersion, activeTimelineId, timelines, data: {} };
    const existing = app.data?.[activeTimelineId] || { id: activeTimelineId, name: timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled', createdAt: Date.now(), version: CONFIG.app.initialVersion, events: [], viewport: { scale: CONFIG.zoom.reset, pan: 0 } };
    const persistedFilters = {
      types: filters?.types instanceof Set ? Array.from(filters.types) : (filters?.types == null ? null : Array.from(new Set(filters.types))),
      search: String(filters?.search ?? ''),
      sort: filters?.sort === 'dateDesc' ? 'dateDesc' : 'dateAsc',
      asideTab: filters?.asideTab === 'undated' ? 'undated' : 'dated',
    };
    const updatedEntry = { ...existing, updatedAt: Date.now(), events: events || [], viewport: viewport || { scale: CONFIG.zoom.reset, pan: 0 }, filters: persistedFilters };
    const next = { ...app, activeTimelineId, timelines, data: { ...(app.data || {}), [activeTimelineId]: updatedEntry } };
    debouncedSetRef.current(next);
  }, [events, viewport, filters, activeTimelineId, timelines, readApp, makeDebouncedSet]);

  // Derived helpers for dated/undated + filtering and sorting
  const isDated = useCallback((e) => Number.isFinite(Number(e?.start?.year)), []);

  const normalizedTypes = useMemo(() => (filters?.types instanceof Set ? filters.types : (filters?.types == null ? null : new Set(filters.types))), [filters]);

  const applyTypeFilter = useCallback((e) => {
    if (!normalizedTypes || normalizedTypes.size === 0) return true;
    const t = e?.type;
    return normalizedTypes.has(t);
  }, [normalizedTypes]);

  const searchText = useMemo(() => String(filters?.search ?? '').trim().toLowerCase(), [filters]);
  const applySearch = useCallback((e) => {
    if (!searchText) return true;
    const title = String(e?.title ?? '').toLowerCase();
    const body = String(e?.body ?? '').toLowerCase();
    return title.includes(searchText) || body.includes(searchText);
  }, [searchText]);

  const sortOrder = filters?.sort === 'dateDesc' ? 'dateDesc' : 'dateAsc';

  const filteredDatedEvents = useMemo(() => {
    const items = (events || []).filter(isDated).filter(applyTypeFilter).filter(applySearch);
    // Stable sort by date, then by original index
    const mapped = items.map((e, i) => ({ e, i }));
    mapped.sort((a, b) => {
      const cmp = comparePartialDate(a.e?.start, b.e?.start);
      if (cmp !== 0) return sortOrder === 'dateDesc' ? -cmp : cmp;
      return a.i - b.i;
    });
    return mapped.map(w => w.e);
  }, [events, applyTypeFilter, applySearch, sortOrder, isDated]);

  const filteredUndatedEvents = useMemo(() => {
    return (events || []).filter(e => !isDated(e)).filter(applyTypeFilter).filter(applySearch);
  }, [events, applyTypeFilter, applySearch, isDated]);

  // Combined convenience list (not used by timeline); mirrors aside tab selection
  const filteredEvents = useMemo(() => (filters?.asideTab === 'undated' ? filteredUndatedEvents : filteredDatedEvents), [filters, filteredDatedEvents, filteredUndatedEvents]);

  // Public setters for filters
  const setTypesFilter = useCallback((arrOrSet) => {
    setFilters(prev => ({
      ...prev,
      types: arrOrSet == null ? null : (arrOrSet instanceof Set ? arrOrSet : new Set(arrOrSet)),
    }));
  }, []);

  const setSearchFilter = useCallback((text) => {
    setFilters(prev => ({ ...prev, search: String(text ?? '') }));
  }, []);

  const setSortOrder = useCallback((order) => {
    setFilters(prev => ({ ...prev, sort: order === 'dateDesc' ? 'dateDesc' : 'dateAsc' }));
  }, []);

  const setAsideTab = useCallback((tab) => {
    setFilters(prev => ({ ...prev, asideTab: tab === 'undated' ? 'undated' : 'dated' }));
  }, []);

  const clearFilters = useCallback(() => setFilters(defaultFilters), [defaultFilters]);

  // Event CRUD
  const addEvent = useCallback((input) => {
    const id = makeId();
    const normalized = normalizeEvent({ ...input, id });
    setEvents(prev => [...prev, normalized]);
    return id;
  }, []);

  const updateEvent = useCallback((id, input) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== id) return e;
      const merged = { ...e, ...input };
      return normalizeEvent(merged);
    }));
  }, []);

  const removeEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const setScale = useCallback((s) => setViewport(v => (v.scale === s ? v : { ...v, scale: s })), []);
  const setPan = useCallback((p) => setViewport(v => (v.pan === p ? v : { ...v, pan: p })), []);

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
    // Filters API
    filters,
    setTypesFilter,
    setSearchFilter,
    setSortOrder,
    setAsideTab,
    clearFilters,
    // Derived projections
    filteredEvents,
    filteredDatedEvents,
    filteredUndatedEvents,
  }), [activeTimelineId, setActiveTimeline, timelines, createTimeline, deleteTimeline, viewport, setScale, setPan, addEvent, updateEvent, removeEvent, events, filters, setTypesFilter, setSearchFilter, setSortOrder, setAsideTab, clearFilters, filteredEvents, filteredDatedEvents, filteredUndatedEvents]);

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}
