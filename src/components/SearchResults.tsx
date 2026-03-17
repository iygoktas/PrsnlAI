'use client';

import { type SearchResult } from '@/search/semantic';

interface SearchResultsProps {
  /**
   * LLM-generated answer to the search query
   */
  answer: string;

  /**
   * Array of source chunks used to generate the answer
   */
  sources: SearchResult[];
}

/**
 * Displays search results with LLM-generated answer and supporting sources
 */
export function SearchResults({ answer, sources }: SearchResultsProps) {
  return (
    <div className="w-full space-y-6 mt-8">
      {/* Answer section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Answer</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {answer}
        </p>
      </div>

      {/* Sources section */}
      {sources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wide">
            Sources ({sources.length})
          </h3>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <SourceCard key={`${source.sourceId}-${source.chunkIndex}`} source={source} index={index} />
            ))}
          </div>
        </div>
      )}

      {sources.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No relevant sources found for this query.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual source card component
 */
function SourceCard({ source, index }: { source: SearchResult; index: number }) {
  const typeIcon = getTypeIcon(source.type);
  const domain = source.url ? new URL(source.url).hostname : 'Local';
  const formattedDate = formatDate(source.createdAt);
  const scorePercent = Math.round(source.score * 100);

  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel={source.url ? 'noopener noreferrer' : undefined}
      className="card hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer block"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{typeIcon}</span>
            <h4 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{source.title}</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">{domain}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {source.excerpt}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Similarity score badge */}
          <div className="badge text-xs">
            <span className="font-semibold">{scorePercent}%</span>
          </div>

          {/* Metadata */}
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            {source.pageNumber !== null && (
              <div>p. {source.pageNumber}</div>
            )}
            <div>{formattedDate}</div>
          </div>
        </div>
      </div>
    </a>
  );
}

/**
 * Get an icon for the source type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'URL':
      return '🌐';
    case 'PDF':
      return '📄';
    case 'TEXT':
      return '📝';
    case 'TWEET':
      return '𝕏';
    default:
      return '📎';
  }
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return 'Today';
  } else if (daysDiff === 1) {
    return 'Yesterday';
  } else if (daysDiff < 7) {
    return `${daysDiff}d ago`;
  } else if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    return `${weeks}w ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
