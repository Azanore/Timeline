import { useTimeline } from '../../hooks/useTimeline';
import Button from '@/components/ui/Button.jsx';
import ThemeToggle from '@/components/ui/ThemeToggle.jsx';
import { Plus } from 'lucide-react';

// Header: app title + global actions (create timeline, theme)
export default function Header() {
  const { timelines, createTimeline } = useTimeline();

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground flex-1">Timeline</h1>

        <Button
          className="ml-auto gap-2"
          size="md"
          onClick={() => createTimeline(`Timeline ${timelines.length + 1}`)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Timeline</span>
        </Button>

        <ThemeToggle className="ml-2" />
      </div>
    </header>
  );
}

