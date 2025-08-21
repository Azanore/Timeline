import { useContext, useMemo } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';
import { sortEventsByTimestamp } from '../utils';

export function useEvents() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    return { events: [], sortedEvents: [], addEvent: () => {}, updateEvent: () => {}, removeEvent: () => {} };
  }
  const { events, addEvent, updateEvent, removeEvent } = ctx;

  // Stable sorted events using full timestamp (year->minute)
  const sortedEvents = useMemo(() => sortEventsByTimestamp(events || []), [events]);

  return { events, sortedEvents, addEvent, updateEvent, removeEvent };
}
