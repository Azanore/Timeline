import { useTimeline } from '../../hooks/useTimeline';

// Header: app title + timeline switcher + create timeline control
export default function Header() {
  const { timelines, activeTimelineId, setActiveTimeline, createTimeline } = useTimeline();

  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-800 flex-1">Timeline</h1>

        <select
          className="border rounded px-2 py-1 text-sm"
          value={activeTimelineId}
          onChange={(e) => setActiveTimeline(e.target.value)}
          aria-label="Select timeline"
        >
          {timelines.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          type="button"
          className="ml-2 inline-flex items-center gap-1 rounded bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700 transition-all duration-300"
          onClick={() => createTimeline(`Timeline ${timelines.length + 1}`)}
        >
          + New Timeline
        </button>
      </div>
    </header>
  );
}
