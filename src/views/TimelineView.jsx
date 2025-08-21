import { useState } from 'react';
import { useTimeline } from '../hooks/useTimeline';
import { useEvents } from '../hooks/useEvents';
import Timeline from '../components/timeline/Timeline.jsx';
import ZoomControls from '../components/timeline/ZoomControls.jsx';

export default function TimelineView() {
  const { timelines, activeTimelineId, domain } = useTimeline();
  const { events } = useEvents();
  const activeName = timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled';
  const [orientationMode, setOrientationMode] = useState('auto'); // 'auto' | 'horizontal' | 'vertical'
  const [lanesByType, setLanesByType] = useState(false);

  return (
    <section className="flex-1 flex flex-col w-full px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-slate-800">{activeName}</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-600">Orientation</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={orientationMode}
            onChange={(e) => setOrientationMode(e.target.value)}
            aria-label="Orientation mode"
          >
            <option value="auto">Auto</option>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={lanesByType}
              onChange={(e) => setLanesByType(e.target.checked)}
              aria-label="Toggle lanes by event type"
            />
            Lanes by type
          </label>
        </div>
      </div>
      <p className="text-slate-600 text-sm">Events: {events.length}</p>
      {events.length === 0 ? (
        <div className="mt-8 border border-dashed border-slate-300 rounded-md p-8 bg-white/50 text-center">
          <h3 className="text-slate-800 font-medium">No events yet</h3>
          <p className="text-slate-600 text-sm mt-1">Click the + button to add your first event.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex-1 flex flex-col">
            <Timeline domain={domain} orientationOverride={orientationMode === 'auto' ? undefined : orientationMode} lanesByType={lanesByType} />
          </div>
          <ZoomControls />
        </>
      )}
    </section>
  );
}
