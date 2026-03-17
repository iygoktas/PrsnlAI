'use client';

import { type SearchResult } from '@/search/semantic';

interface SourceBadgeProps {
  source: SearchResult;
  className?: string;
  showIcon?: boolean;
  showDomain?: boolean;
  showDate?: boolean;
  showScore?: boolean;
}

/**
 * SourceBadge component — inline metadata display: domain, date, similarity score
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
  const domain = source.url ? (() => { try { return new URL(source.url!).hostname; } catch { return 'Local'; } })() : 'Local';
  const formattedDate = formatDate(source.createdAt);
  const scorePercent = Math.round(source.score * 100);

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
    >
      {showIcon && (
        <span style={{ fontSize: '14px' }}>{typeIcon}</span>
      )}
      {showDomain && (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{domain}</span>
      )}
      {showDate && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
      )}
      {showDate && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formattedDate}
        </span>
      )}
      {showScore && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
      )}
      {showScore && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
            backgroundColor: 'var(--accent-dim)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {scorePercent}%
        </span>
      )}
    </div>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'URL':  return '🌐';
    case 'PDF':  return '📄';
    case 'TEXT': return '📝';
    default:     return '📎';
  }
}

function formatDate(date: Date): string {
  if (!(date instanceof Date)) date = new Date(date);
  const d = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
