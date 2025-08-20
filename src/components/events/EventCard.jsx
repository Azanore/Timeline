export default function EventCard({ title, year, color = 'emerald' }) {
  const border = {
    emerald: 'border-emerald-300',
    blue: 'border-blue-300',
    violet: 'border-violet-300',
    amber: 'border-amber-300',
    rose: 'border-rose-300',
    slate: 'border-slate-300',
  }[color] || 'border-slate-300';
  const text = {
    emerald: 'text-emerald-800',
    blue: 'text-blue-800',
    violet: 'text-violet-800',
    amber: 'text-amber-800',
    rose: 'text-rose-800',
    slate: 'text-slate-800',
  }[color] || 'text-slate-800';
  return (
    <div className={`px-2 py-1 rounded border bg-white ${text} ${border} shadow-sm text-xs max-w-[220px]`}>
      <span className="font-medium block truncate" title={title}>{title}</span>
      <span className="ml-1 text-slate-500">({year})</span>
    </div>
  );
}
