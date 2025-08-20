// Floating Add Event button fixed at bottom-right
export default function FloatingButton({ onClick = () => {} }) {
  return (
    <button
      type="button"
      aria-label="Add Event"
      className="fixed bottom-6 right-6 rounded-full bg-emerald-600 text-white shadow-lg w-14 h-14 flex items-center justify-center text-2xl hover:bg-emerald-700 transition-all duration-300"
      onClick={onClick}
    >
      +
    </button>
  );
}
