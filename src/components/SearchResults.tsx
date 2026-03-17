'use client';

import React from 'react';
import { type SearchResult } from '@/search/semantic';

interface SearchResultsProps {
  answer: string;
  sources: SearchResult[];
}

/**
 * AnswerBlock component — answer zone with amber left border + sources zone below
 */
export function SearchResults({ answer, sources }: SearchResultsProps) {
  return (
    <div
      style={{
        width: '100%',
        marginTop: '32px',
        animation: 'fadeIn 0.2s ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Answer zone */}
      <div
        style={{
          borderLeft: '3px solid var(--accent)',
          paddingLeft: '16px',
          paddingTop: '4px',
          paddingBottom: '4px',
        }}
      >
        <p
          className="whitespace-pre-wrap"
          style={{
            fontSize: '15px',
            lineHeight: 1.75,
            color: 'var(--text-primary)',
          }}
        >
          {answer.split(/\[\d+\]/).map((text, index) => (
            <span key={index}>
              {text}
              {index < sources.length && (
                <sup
                  style={{
                    color: 'var(--accent)',
                    fontSize: '0.72em',
                    fontWeight: 600,
                    marginLeft: '2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  [{index + 1}]
                </sup>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Sources zone */}
      {sources.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Sources
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sources.map((source, index) => (
              <SourceCard
                key={`${source.sourceId}-${source.chunkIndex}`}
                source={source}
                citationNumber={index + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceCard({
  source,
  citationNumber,
}: {
  source: SearchResult;
  citationNumber: number;
}) {
  const scorePercent = Math.round(source.score * 100);
  const truncatedTitle =
    source.title.length > 40 ? source.title.substring(0, 40) + '…' : source.title;

  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel={source.url ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-block',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '8px 12px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
        }}
      >
        <span
          style={{
            color: 'var(--accent)',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          [{citationNumber}]
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>{truncatedTitle}</span>
        <span
          style={{
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '12px',
          }}
        >
          {scorePercent}%
        </span>
      </div>
    </a>
  );
}
