interface EmptyStateCardProps {
  title: string;
  benefits: string;
  placeholderContent: React.ReactNode;
  onAdd: () => void;
  addButtonText: string;
}

export default function EmptyStateCard({
  title,
  benefits,
  placeholderContent,
  onAdd,
  addButtonText,
}: EmptyStateCardProps) {
  return (
    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 bg-zinc-50/50 dark:bg-zinc-900/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{benefits}</p>
        </div>
        <button
          onClick={onAdd}
          className="ml-4 text-2xl text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Placeholder Preview */}
      <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-200 dark:border-zinc-700">
        {placeholderContent}
      </div>

      <button
        onClick={onAdd}
        className="w-full px-4 py-2.5 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold transition-colors"
      >
        {addButtonText}
      </button>
    </div>
  );
}



