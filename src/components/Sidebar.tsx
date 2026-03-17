'use client';

import React, { useState } from 'react';
import { Globe, FileText, AlignLeft, Plus, X } from 'lucide-react';
import type { Source } from '@prisma/client';

interface SidebarProps {
  sources: Source[];
  onAddClick: () => void;
  selectedSourceId?: string;
}

/**
 * Sidebar component — fixed left panel with sources list, add button,
 * and inline PDF preview modal for PDF sources.
 */
export default function Sidebar({
  sources,
  onAddClick,
  selectedSourceId,
}: SidebarProps) {
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

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

  const handleSourceClick = (source: Source) => {
    if (source.type === 'PDF') {
      setPreviewSource(source);
    }
  };

  return (
    <>
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
              const isPdf = source.type === 'PDF';
              return (
                <div
                  key={source.id}
                  onClick={() => handleSourceClick(source)}
                  title={isPdf ? 'Click to preview PDF' : undefined}
                  style={{
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: '10px',
                    cursor: isPdf ? 'pointer' : 'default',
                    borderLeft: isSelected
                      ? '3px solid var(--accent)'
                      : '3px solid transparent',
                    backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    transition: 'all 150ms ease',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (isPdf) {
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
                        color: isPdf ? 'var(--accent)' : 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isPdf ? 'Click to preview' : getDomain(source)}
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

      {/* PDF Preview Modal */}
      {previewSource && (
        <PdfPreviewModal
          source={previewSource}
          onClose={() => setPreviewSource(null)}
        />
      )}
    </>
  );
}

/**
 * PdfPreviewModal — full-screen overlay with embedded PDF viewer
 */
function PdfPreviewModal({
  source,
  onClose,
}: {
  source: Source;
  onClose: () => void;
}) {
  const fileUrl = `/api/sources/${source.id}/file`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
      }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          margin: '32px auto',
          width: 'calc(100% - 64px)',
          maxWidth: '900px',
          height: 'calc(100vh - 64px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <FileText size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {source.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a
              href={fileUrl}
              download={`${source.title}.pdf`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
              }}
            >
              Download
            </a>
            <button
              onClick={onClose}
              aria-label="Close preview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <iframe
          src={fileUrl}
          title={source.title}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
            backgroundColor: '#fff',
          }}
        />
      </div>
    </div>
  );
}
