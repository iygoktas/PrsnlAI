'use client';

import React, { useState } from 'react';
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
    switch (type) {
      case 'URL':
        return <Globe size={16} />;
      case 'PDF':
        return <FileText size={16} />;
      case 'TEXT':
        return <AlignLeft size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getDomain = (source: Source) => {
    if (!source.url) return 'Local';
    try {
      const url = new URL(source.url);
      return url.hostname;
    } catch {
      return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo ago`;
    }
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen w-80 overflow-y-auto border-r"
      style={{
        backgroundColor: 'var(--color-bg)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 flex items-center justify-between border-b px-4 py-4"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h1
          className="italic text-sm"
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-text)',
          }}
        >
          memex
        </h1>
        <button
          onClick={onAddClick}
          className="rounded p-1 transition-colors duration-150"
          style={{
            color: 'var(--color-muted)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-border)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'transparent';
          }}
          aria-label="Add content"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Sources List */}
      {sources.length === 0 ? (
        <div
          className="flex items-center justify-center px-4 py-16 text-center"
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-muted)',
          }}
        >
          <p className="italic">No sources yet. Add a URL, PDF, or text.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {sources.map((source) => (
            <div
              key={source.id}
              className="h-12 cursor-pointer border-l-4 border-l-transparent px-4 py-3 transition-all duration-150"
              style={{
                backgroundColor:
                  selectedSourceId === source.id
                    ? 'var(--color-surface)'
                    : 'transparent',
                borderLeftColor:
                  selectedSourceId === source.id
                    ? 'var(--color-accent)'
                    : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedSourceId !== source.id) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    '#1A1A1A';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSourceId !== source.id) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    'transparent';
                }
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  style={{
                    color: 'var(--color-muted)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {getTypeIcon(source.type)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div
                    className="truncate text-xs"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {source.title}
                  </div>
                  <div
                    className="truncate text-xs"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {getDomain(source)}
                  </div>
                </div>
                <div
                  className="flex-shrink-0 text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-muted)',
                  }}
                >
                  {formatDate(source.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
