import { useMemo, useState, useEffect, useRef } from 'react';
import { useContext } from 'react';
import { TimelineContext } from '@/context/TimelineContext.jsx';
import { useEvents } from '@/hooks/useEvents';
import { formatPartialUTC } from '@/utils';
import CONFIG from '@/config/index.js';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select.jsx';
import TypeBadge from '@/components/ui/TypeBadge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Modal.jsx';
import EventForm from '@/components/events/EventForm.jsx';
import EventDialog from '@/components/events/EventDialog.jsx';
import { Plus, Filter, Search, X } from 'lucide-react';

// Helpers to mirror Timeline event styling
function getBorderClass(type) {
  const map = {
    rose: 'border-rose-400',
    emerald: 'border-emerald-400',
    blue: 'border-blue-400',
    violet: 'border-violet-400',
    amber: 'border-amber-400',
    slate: 'border-border',
  };
  const key = CONFIG.types[type || 'other']?.border || 'slate';
  return map[key] || 'border-border';
}

function getBgTintClass(type) {
  return CONFIG.types[type || 'other']?.bgTint || 'bg-muted';
}

export default function Aside() {
  const {
    filters,
    setTypesFilter,
    setSearchFilter,
    setSortOrder,
    setAsideTab,
    filteredEvents,
    filteredDatedEvents,
    filteredUndatedEvents,
    clearFilters,
  } = useContext(TimelineContext);
  const { addEvent } = useEvents();

  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const searchRef = useRef(null);

  const typeKeys = useMemo(() => Object.keys(CONFIG.types || {}), []);
  const activeTypes = useMemo(() => (filters?.types instanceof Set ? filters.types : null), [filters]);

  const toggleType = (key) => {
    if (!activeTypes) {
      setTypesFilter(new Set([key]));
      return;
    }
    const next = new Set(activeTypes);
    if (next.has(key)) next.delete(key); else next.add(key);
    setTypesFilter(next.size === typeKeys.length || next.size === 0 ? null : next);
  };

  const allSelected = !activeTypes || activeTypes.size === 0;

  // Autofocus the search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <aside className="w-full md:w-80 shrink-0 md:sticky md:top-0 md:self-start h-screen bg-background/60 backdrop-blur border-r border-border flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-md overflow-hidden border">
            <button
              className={[
                'px-3 py-1.5 text-sm border-r',
                filters?.asideTab === 'dated' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              ].join(' ')}
              onClick={() => setAsideTab('dated')}
            >
              <span className="inline-flex items-center gap-2">
                <span>Dated</span>
                <span className="text-[10px] inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-background/70 border border-border text-foreground">
                  {filteredDatedEvents?.length ?? 0}
                </span>
              </span>
            </button>
            <button
              className={[
                'px-3 py-1.5 text-sm',
                filters?.asideTab === 'undated' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              ].join(' ')}
              onClick={() => setAsideTab('undated')}
            >
              <span className="inline-flex items-center gap-2">
                <span>Undated</span>
                <span className="text-[10px] inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-background/70 border border-border text-foreground">
                  {filteredUndatedEvents?.length ?? 0}
                </span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={clearFilters} title="Clear filters">
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-2.5" aria-hidden="true" />
            <Input
              ref={searchRef}
              value={filters?.search || ''}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search title or body"
              className="pl-7 pr-7"
            />
            {Boolean(filters?.search) && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchFilter(''); searchRef.current?.focus(); }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <Select value={filters?.sort || 'dateAsc'} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[110px]" aria-label="Sort by date">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateAsc">Date ↑</SelectItem>
              <SelectItem value="dateDesc">Date ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Types</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={[
                'px-2 py-1 rounded border text-xs',
                allSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              ].join(' ')}
              onClick={() => setTypesFilter(null)}
            >
              All
            </button>
            {typeKeys.map((k) => {
              const active = allSelected || (activeTypes?.has(k));
              return (
                <button
                  key={k}
                  type="button"
                  className={[
                    'px-2 py-1 rounded border text-xs inline-flex items-center gap-1',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  ].join(' ')}
                  onClick={() => toggleType(k)}
                >
                  <TypeBadge type={k} showLabel={false} />
                  <span>{CONFIG.types[k]?.label || k}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {filteredEvents.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3">No events</div>
        ) : (
          <ul className="space-y-1">
            {filteredEvents.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className={[
                    'w-full text-left p-2 rounded border transition flex items-start gap-2',
                    getBgTintClass(e.type),
                    getBorderClass(e.type),
                    'hover:brightness-110'
                  ].join(' ')}
                >
                  <TypeBadge type={e.type || 'other'} className="shrink-0" showLabel={false} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {e.start ? formatPartialUTC(e.start) : 'No date'}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: Add Event at very bottom */}
      <div className="p-3 border-t border-border sticky bottom-0 bg-background/80 backdrop-blur z-10">
        <Button size="sm" onClick={() => setAddOpen(true)} className="w-full gap-2" aria-label="Add event">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add event</span>
        </Button>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={addOpen} onOpenChange={(n) => { if (!n) setAddOpen(false); }}>
        <DialogContent aria-label="Add Event">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription className="sr-only">Create a new event.</DialogDescription>
          </DialogHeader>
          <EventForm
            onCancel={() => setAddOpen(false)}
            onSubmit={(val) => {
              addEvent(val);
              setAddOpen(false);
            }}
            labels={{ submitLabel: 'Add', cancelLabel: 'Cancel' }}
          />
        </DialogContent>
      </Dialog>

      {/* Event View/Edit Dialog */}
      <EventDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        event={selected}
      />
    </aside>
  );
}
