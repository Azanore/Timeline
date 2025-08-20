import { useContext } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';
import { useMemo } from 'react';
import { sortEventsByTimestamp } from '../utils';

export function useEvents() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    return { events: [], sortedEvents: [], clusters: [], stacks: new Map(), addEvent: () => {}, updateEvent: () => {}, removeEvent: () => {} };
  }
  const { events, addEvent, updateEvent, removeEvent } = ctx;

  // Stable sorted events using full timestamp (year->minute)
  const sortedEvents = useMemo(() => sortEventsByTimestamp(events || []), [events]);

  // Build a key for grouping identical timestamps
  const tsKey = (e) => {
    const s = e?.start || {};
    const parts = [s.year, s.month || 0, s.day || 0, s.hour || 0, s.minute || 0];
    return parts.join('|');
  };

  // Compute clusters: array of { key, items: EventModel[] }
  const clusters = useMemo(() => {
    const map = new Map();
    for (const e of sortedEvents) {
      const k = tsKey(e);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [sortedEvents]);

  // Compute stacks: for each cluster key, assign side/level alternating up to 4 levels per side
  // Return Map<clusterKey, Array<{ id, side: 'above'|'below', level: 0..3 }>>
  const stacks = useMemo(() => {
    const res = new Map();
    for (const { key, items } of clusters) {
      const assigned = [];
      const maxPerSide = 4; // 0..3
      let aboveCount = 0;
      let belowCount = 0;
      items.forEach((e, idx) => {
        const side = idx % 2 === 0 ? 'above' : 'below';
        if (side === 'above') {
          const level = Math.min(Math.floor(aboveCount / 1), maxPerSide - 1);
          aboveCount += 1;
          assigned.push({ id: e.id, side, level });
        } else {
          const level = Math.min(Math.floor(belowCount / 1), maxPerSide - 1);
          belowCount += 1;
          assigned.push({ id: e.id, side, level });
        }
      });
      res.set(key, assigned);
    }
    return res;
  }, [clusters]);

  return { events, sortedEvents, clusters, stacks, addEvent, updateEvent, removeEvent };
}
