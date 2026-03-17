'use client';

import React from 'react';
import { Globe, FileText, AlignLeft } from 'lucide-react';
import { type SearchResult } from '@/search/semantic';

interface SearchResultsProps {
  answer: string;
  sources: SearchResult[];
}

/**
 * SearchResults — two-column layout: answer left, source cards stacked right.
 * On narrow viewports (<768px) stacks vertically.
 */
export function SearchResults({ answer, sources }: SearchResultsProps) {
  return (
    <div
      style={{ width: '100%', animation: 'fadeIn 0.2s ease forwards' }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .results-grid {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 24px;
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .results-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="results-grid">
        {/* Left column — answer */}
        <div style={{ minWidth: 0 }}>
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
              style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-primary)' }}
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
        </div>

        {/* Right column — source cards stacked */}
        {sources.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              Sources
            </div>
            {sources.map((source, index) => (
              <SourceCard
                key={`${source.sourceId}-${source.chunkIndex}`}
                source={source}
                citationNumber={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTypeIcon(type: string) {
  const s: React.CSSProperties = { width: 13, height: 13, flexShrink: 0 };
  switch (type) {
    case 'URL':  return <Globe style={s} />;
    case 'PDF':  return <FileText style={s} />;
    default:     return <AlignLeft style={s} />;
  }
}

function SourceCard({ source, citationNumber }: { source: SearchResult; citationNumber: number }) {
  const scorePercent = Math.round(source.score * 100);
  const truncatedTitle = source.title.length > 36 ? source.title.substring(0, 36) + '…' : source.title;
  const domain = source.url
    ? (() => { try { return new URL(source.url!).hostname; } catch { return ''; } })()
    : '';

  return (
    <a
      href={source.url || '#'}
      target={source.url ? '_blank' : undefined}
      rel={source.url ? 'noopener noreferrer' : undefined}
      style={{
        display: 'block',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 12px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Citation + score row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          [{citationNumber}]
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
          {scorePercent}%
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px', lineHeight: 1.3 }}>
        {truncatedTitle}
      </div>

      {/* Type icon + domain */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
        {getTypeIcon(source.type)}
        {domain && (
          <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {domain}
          </span>
        )}
      </div>
    </a>
  );
}
