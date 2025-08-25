import { useTimeline } from '../hooks/useTimeline';
import { useEvents } from '../hooks/useEvents';
import Timeline from '../components/timeline/Timeline.jsx';
import TypeLegend from '@/components/ui/TypeLegend.jsx';
import TimelineAxis from '@/components/timeline/TimelineAxis.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select.jsx';

export default function TimelineView() {
  const { timelines, activeTimelineId, setActiveTimeline, domain } = useTimeline();
  const { events } = useEvents();
  const activeName = timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled';

  return (
    <section className="flex-1 flex flex-col w-full px-4 py-8">
      <div className="flex items-center mb-16 justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xl font-semibold text-foreground truncate">{activeName}</h2>
          <Select value={activeTimelineId} onValueChange={(val) => setActiveTimeline(val)}>
            <SelectTrigger className="w-[180px]" aria-label="Select timeline">
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              {timelines.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">Events: {events.length}</span>
          <TypeLegend className="hidden md:flex" />
        </div>
      </div>
      <TimelineAxis domain={domain} />
      {events.length === 0 ? (
        <div className="mt-8 border border-dashed border-border rounded-md p-8 bg-background/50 text-center">
          <h3 className="text-foreground font-medium">No events yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Click the + button to add your first event.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex-1 flex flex-col">
            <Timeline domain={domain} />
          </div>
        </>
      )}
    </section>
  );
}
