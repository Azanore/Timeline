import { useContext, useEffect, useMemo, useState } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';
import { useEvents } from './useEvents';

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  const { events = [] } = useEvents();

  // Compute domain from events with padding
  const domain = useMemo(() => {
    if (!events || events.length === 0) return [1990, 2030];
    const years = events.map(e => Number(e.start?.year)).filter(Boolean);
    if (years.length === 0) return [1990, 2030];
    const min = Math.min(...years);
    const max = Math.max(...years);
    const pad = Math.max(1, Math.round((max - min) * 0.1));
    return [min - pad, max + pad];
  }, [events]);

  // Orientation: vertical on small screens
  const [orientation, setOrientation] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'vertical' : 'horizontal'));
  useEffect(() => {
    const onResize = () => setOrientation(window.innerWidth < 768 ? 'vertical' : 'horizontal');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (!ctx) {
    return {
      activeTimelineId: 'default',
      timelines: [{ id: 'default', name: 'Default' }],
      setActiveTimeline: () => {},
      createTimeline: () => 'default',
      deleteTimeline: () => {},
      domain,
      orientation,
    };
  }
  const { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline } = ctx;
  return { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline, domain, orientation };
}
