'use client';

import React from 'react';
import { Globe, FileText, AlignLeft, Twitter } from 'lucide-react';

export interface SourceItem {
  id: string;
  title: string;
  type: 'URL' | 'PDF' | 'TEXT' | 'TWEET';
  url?: string | null;
  createdAt: string;
  score?: number;
}

interface DocumentItemProps {
  source: SourceItem;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  disabled?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  URL: <Globe size={14} className="text-blue-400 shrink-0" />,
  PDF: <FileText size={14} className="text-red-400 shrink-0" />,
  TEXT: <AlignLeft size={14} className="text-gray-400 shrink-0" />,
  TWEET: <Twitter size={14} className="text-sky-400 shrink-0" />,
};

const TYPE_BADGE: Record<string, string> = {
  URL: 'bg-blue-900 text-blue-300',
  PDF: 'bg-red-900 text-red-300',
  TEXT: 'bg-gray-700 text-gray-300',
  TWEET: 'bg-sky-900 text-sky-300',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentItem({
  source,
  isSelected,
  onSelect,
  disabled = false,
}: DocumentItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-950 border border-blue-700' : 'hover:bg-[#1A1A1A] border border-transparent'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onSelect(source.id, !isSelected)}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => !disabled && onSelect(source.id, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        aria-label={`Select ${source.title}`}
        className="w-4 h-4 rounded border-gray-600 bg-[#1A1A1A] accent-blue-500 shrink-0"
      />

      {/* Type icon */}
      {TYPE_ICONS[source.type] ?? <FileText size={14} className="text-gray-400 shrink-0" />}

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${isSelected ? 'text-blue-200' : 'text-[#F2F0EB]'}`}
        title={source.title}
      >
        {source.title}
      </span>

      {/* Date */}
      <span className="text-xs text-gray-500 shrink-0 font-mono">{formatDate(source.createdAt)}</span>

      {/* Type badge */}
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_BADGE[source.type] ?? 'bg-gray-700 text-gray-300'}`}
      >
        {source.type}
      </span>

      {/* Score (optional) */}
      {source.score !== undefined && (
        <span className="text-xs text-[#C8922A] font-mono shrink-0">
          {Math.round(source.score * 100)}%
        </span>
      )}
    </div>
  );
}
