import { useTimeline } from '../hooks/useTimeline';
import { useEvents } from '../hooks/useEvents';
import Timeline from '../components/timeline/Timeline.jsx';
import ZoomControls from '../components/timeline/ZoomControls.jsx';

export default function TimelineView() {
  const { timelines, activeTimelineId, domain } = useTimeline();
  const { events } = useEvents();
  const activeName = timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled';

  return (
    <section className="flex-1 flex flex-col w-full px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-slate-800">{activeName}</h2>
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
            <Timeline domain={domain} />
          </div>
          <ZoomControls />
        </>
      )}
    </section>
  );
}
