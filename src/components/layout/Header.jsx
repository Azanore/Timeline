import { useTimeline } from '../../hooks/useTimeline';
import Button from '@/components/ui/Button.jsx';
import Select from '@/components/ui/Select.jsx';
import TypeLegend from '@/components/ui/TypeLegend.jsx';
import ThemeToggle from '@/components/ui/ThemeToggle.jsx';

// Header: app title + timeline switcher + create timeline control
export default function Header() {
  const { timelines, activeTimelineId, setActiveTimeline, createTimeline } = useTimeline();

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground flex-1">Timeline</h1>

        <Select
          value={activeTimelineId}
          onChange={(e) => setActiveTimeline(e.target.value)}
          aria-label="Select timeline"
          className="w-[180px]"
        >
          {timelines.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Button
          className="ml-2"
          size="md"
          onClick={() => createTimeline(`Timeline ${timelines.length + 1}`)}
        >
          + New Timeline
        </Button>

        <TypeLegend className="ml-auto hidden md:flex" />
        <ThemeToggle className="ml-2" />
      </div>
    </header>
  );
}

