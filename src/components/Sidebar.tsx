'use client';

import React from 'react';
import { Globe, FileText, AlignLeft, Plus } from 'lucide-react';
import type { Source } from '@prisma/client';

interface SidebarProps {
  sources: Source[];
  onAddClick: () => void;
  selectedSourceId?: string;
}

/**
 * Sidebar component — fixed left panel with sources list and add button
 */
export default function Sidebar({
  sources,
  onAddClick,
  selectedSourceId,
}: SidebarProps) {
  const getTypeIcon = (type: string) => {
    const s: React.CSSProperties = { color: 'var(--text-muted)', width: 14, height: 14, flexShrink: 0 };
    switch (type) {
      case 'URL': return <Globe style={s} />;
      case 'PDF': return <FileText style={s} />;
      default:    return <AlignLeft style={s} />;
    }
  };

  const getDomain = (source: Source) => {
    if (!source.url) return 'Local';
    try { return new URL(source.url).hostname; }
    catch { return 'Local'; }
  };

  const formatDate = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const d = Math.floor(diffMs / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30) return `${d}d ago`;
    const m = Math.floor(d / 30);
    if (m < 12) return `${m}mo ago`;
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '320px',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          memex
        </span>
        <button
          onClick={onAddClick}
          aria-label="Add content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.backgroundColor = 'var(--bg-elevated)';
            btn.style.borderColor = 'var(--accent)';
            btn.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.backgroundColor = 'transparent';
            btn.style.borderColor = 'var(--border)';
            btn.style.color = 'var(--text-muted)';
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Sources list */}
      {sources.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            No sources yet.{' '}
            <button
              onClick={onAddClick}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            >
              Add a URL, PDF, or text.
            </button>
          </p>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {sources.map((source) => {
            const isSelected = selectedSourceId === source.id;
            return (
              <div
                key={source.id}
                style={{
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '10px',
                  cursor: 'pointer',
                  borderLeft: isSelected
                    ? '3px solid var(--accent)'
                    : '3px solid transparent',
                  backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 150ms ease',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-elevated)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                {getTypeIcon(source.type)}
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {source.title}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getDomain(source)}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDate(source.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
