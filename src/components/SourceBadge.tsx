'use client';

import { type SearchResult } from '@/search/semantic';

interface SourceBadgeProps {
  /**
   * The source to display in the badge
   */
  source: SearchResult;

  /**
   * Optional CSS class for additional styling
   */
  className?: string;

  /**
   * Whether to include the type icon
   */
  showIcon?: boolean;

  /**
   * Whether to include the domain
   */
  showDomain?: boolean;

  /**
   * Whether to include the date
   */
  showDate?: boolean;

  /**
   * Whether to include the similarity score
   */
  showScore?: boolean;
}

/**
 * SourceBadge component — displays source metadata: type icon, domain, date, and similarity score
 */
export function SourceBadge({
  source,
  className = '',
  showIcon = true,
  showDomain = true,
  showDate = true,
  showScore = true,
}: SourceBadgeProps) {
  const typeIcon = getTypeIcon(source.type);
  const domain = source.url ? new URL(source.url).hostname : 'Local';
  const formattedDate = formatDate(source.createdAt);
  const scorePercent = Math.round(source.score * 100);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {showIcon && <span className="text-lg">{typeIcon}</span>}

      {showDomain && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{domain}</span>}

      {showDate && <span className="text-sm text-gray-600 dark:text-gray-400">•</span>}

      {showDate && <span className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</span>}

      {showScore && <span className="text-sm text-gray-600 dark:text-gray-400">•</span>}

      {showScore && <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-900 dark:text-blue-100">{scorePercent}%</span>}
    </div>
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
