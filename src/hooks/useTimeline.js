import { useContext, useEffect, useMemo, useState } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';
import { useEvents } from './useEvents';
import CONFIG from '../config/index.js';

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  const { events = [] } = useEvents();

  // Compute domain from events with padding
  const domain = useMemo(() => {
    if (!events || events.length === 0) return CONFIG.axis.defaultDomain;
    const years = events.map(e => Number(e.start?.year)).filter(Boolean);
    if (years.length === 0) return CONFIG.axis.defaultDomain;
    const min = Math.min(...years);
    const max = Math.max(...years);
    const ratio = Number(CONFIG.axis.domainPadRatio) || 0;
    const pad = Math.max(1, Math.round((max - min) * ratio));
    return [min - pad, max + pad];
  }, [events]);
  if (!ctx) {
    return {
      activeTimelineId: 'default',
      timelines: [{ id: 'default', name: 'Default' }],
      setActiveTimeline: () => {},
      createTimeline: () => 'default',
      deleteTimeline: () => {},
      domain,
    };
  }
  const { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline } = ctx;
  return { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline, domain };
}
