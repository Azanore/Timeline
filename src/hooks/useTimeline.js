import { useContext } from 'react';
import { TimelineContext } from '../context/TimelineContext.jsx';

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    return {
      activeTimelineId: 'default',
      timelines: [{ id: 'default', name: 'Default' }],
      setActiveTimeline: () => {},
      createTimeline: () => 'default',
      deleteTimeline: () => {},
    };
  }
  const { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline } = ctx;
  return { activeTimelineId, timelines, setActiveTimeline, createTimeline, deleteTimeline };
}
