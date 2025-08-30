import { useTimeline } from '../hooks/useTimeline';
import { useEvents } from '../hooks/useEvents';
import Timeline from '../components/timeline/Timeline.jsx';
import TypeLegend from '@/components/ui/TypeLegend.jsx';
import TimelineAxis from '@/components/timeline/TimelineAxis.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select.jsx';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Trash2, AlertTriangle, CalendarRange, Plus } from 'lucide-react';

export default function TimelineView() {
  const { timelines, activeTimelineId, setActiveTimeline, deleteTimeline, domain } = useTimeline();
  const { events } = useEvents();
  const activeName = timelines.find(t => t.id === activeTimelineId)?.name || 'Untitled';
  const isOnlyTimeline = (timelines?.length || 0) <= 1;
  const isDefaultTimeline = activeTimelineId === 'default';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  return (
    <section className="flex-1 flex flex-col w-full px-4 py-8">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarRange className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-foreground truncate" title={activeName}>{activeName}</h2>
            <span className="text-muted-foreground text-sm">
              {events.length} events
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeline</span>
            <Select value={activeTimelineId} onValueChange={(val) => setActiveTimeline(val)}>
              <SelectTrigger className="w-[200px]" aria-label="Select timeline">
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
            <Button
              variant="outline"
              size="md"
              className="border-destructive text-destructive hover:bg-destructive/10 gap-2"
              disabled={isOnlyTimeline || isDefaultTimeline}
              title={isOnlyTimeline ? 'Cannot delete the only timeline' : isDefaultTimeline ? 'Cannot delete the default timeline' : 'Delete this timeline'}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Types</span>
          <TypeLegend />
        </div>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={(next) => { if (!next) setConfirmOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
            <span>Delete this timeline?</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The timeline "{activeName}" and all its events will be permanently removed from this device.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => {
                  deleteTimeline(activeTimelineId);
                  toast.success('Timeline deleted');
                  setConfirmOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete</span>
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <TimelineAxis domain={domain} />
      <div className="mt-6 flex-1 flex flex-col">
        {events.length === 0 ? (
          <div className="border border-dashed border-border rounded-md p-8 bg-background/50 text-center">
            <h3 className="text-foreground font-medium">No events yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Use the Add button in the aside to create your first event.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <Timeline domain={domain} />
          </div>
        )}
      </div>
    </section>
  );
}

