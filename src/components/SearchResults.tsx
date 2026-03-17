'use client';

import React from 'react';
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
 * AnswerBlock component — displays answer and sources in two zones
 */
export function SearchResults({ answer, sources }: SearchResultsProps) {
  return (
    <div
      className="w-full mt-8 animate-fade-in"
      style={{
        animation: 'fadeIn 0.2s ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Answer zone */}
      <div
        className="border-l-2 pl-4 py-6"
        style={{
          borderColor: 'var(--color-accent)',
        }}
      >
        <p
          className="text-base leading-relaxed whitespace-pre-wrap"
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-text)',
          }}
        >
          {answer.split(/\[\d+\]/).map((text, index) => (
            <span key={index}>
              {text}
              {index < sources.length && (
                <sup
                  className="ml-1"
                  style={{
                    color: 'var(--color-accent)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75em',
                    fontWeight: '500',
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
        <div className="mt-8">
          <h3
            className="text-xs mb-4 uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
            }}
          >
            SOURCES
          </h3>
          <div className="flex flex-wrap gap-2">
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

/**
 * SourceCard component — compact source display in sources zone
 */
function SourceCard({
  source,
  citationNumber,
}: {
  source: SearchResult;
  citationNumber: number;
}) {
  const scorePercent = Math.round(source.score * 100);
  const truncatedTitle = source.title.length > 40
    ? source.title.substring(0, 40) + '…'
    : source.title;

  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel={source.url ? 'noopener noreferrer' : undefined}
      className="border rounded-sm px-3 py-2 transition-all duration-150 inline-block"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)';
      }}
    >
      <div
        className="flex items-center gap-2 text-xs"
        style={{
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontWeight: '500' }}>
          [{citationNumber}]
        </span>
        <span style={{ color: 'var(--color-text)' }}>{truncatedTitle}</span>
        <span style={{ color: 'var(--color-muted)' }}>{scorePercent}%</span>
      </div>
    </a>
  );
}
