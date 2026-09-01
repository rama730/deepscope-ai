import { escapeRegExp } from "@/lib/utils";

interface HighlightProps {
    text: string;
    query: string;
    className?: string; // Class for the highlighted part
}

export function Highlight({ text, query, className = "bg-yellow-200 dark:bg-yellow-900/50 text-zinc-900 dark:text-zinc-100 font-medium px-0.5 rounded" }: HighlightProps) {
    if (!query || !text || typeof query !== 'string' || query.length > 200) return <>{text}</>;

    const escapedQuery = escapeRegExp(query);
    // eslint-disable-next-line security/detect-non-literal-regexp
    // Safe: query is validated (type checked, max 200 chars) and all special regex chars are escaped
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className={className}>{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
}
