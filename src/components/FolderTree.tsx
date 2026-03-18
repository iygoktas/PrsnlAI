'use client';

import React, { useState, useCallback } from 'react';
import { Globe, Lock, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import DocumentItem, { type SourceItem } from './DocumentItem';

export interface FolderNode {
  id: string;
  name: string;
  isPublic: boolean;
  parentId: string | null;
  sources: SourceItem[];
  children: FolderNode[];
}

interface FolderTreeProps {
  folder: FolderNode;
  level?: number;
  selectedSourceIds: Set<string>;
  onSelectFolder: (folder: FolderNode, select: boolean) => void;
  onSelectSource: (sourceId: string, selected: boolean) => void;
  /** Viewer role — private folders have checkboxes disabled */
  isViewer?: boolean;
}

/** Recursively collect all source IDs in a folder and its children */
function collectAllSourceIds(folder: FolderNode): string[] {
  const ids = folder.sources.map((s) => s.id);
  for (const child of folder.children) {
    ids.push(...collectAllSourceIds(child));
  }
  return ids;
}

export default function FolderTree({
  folder,
  level = 0,
  selectedSourceIds,
  onSelectFolder,
  onSelectSource,
  isViewer = false,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState(level === 0);

  const allIds = collectAllSourceIds(folder);
  const selectedCount = allIds.filter((id) => selectedSourceIds.has(id)).length;
  const isFullySelected = allIds.length > 0 && selectedCount === allIds.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < allIds.length;

  const disabled = isViewer && !folder.isPublic;

  const handleFolderCheckbox = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelectFolder(folder, e.target.checked);
    },
    [folder, onSelectFolder],
  );

  const indentClass = `pl-${Math.min(level * 4, 16)}`;

  return (
    <div className={level > 0 ? 'ml-4' : ''}>
      {/* Folder row */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[#1A1A1A] transition-colors group
          ${disabled ? 'opacity-50' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand/collapse chevron */}
        <span className="text-gray-500 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Folder visibility icon */}
        {folder.isPublic ? (
          <Globe size={14} className="text-blue-400 shrink-0" />
        ) : (
          <Lock size={14} className="text-red-400 shrink-0" />
        )}

        {/* Folder icon */}
        {expanded ? (
          <FolderOpen size={14} className="text-[#C8922A] shrink-0" />
        ) : (
          <Folder size={14} className="text-[#C8922A] shrink-0" />
        )}

        {/* Folder name */}
        <span className="flex-1 text-sm text-[#F2F0EB] truncate">{folder.name}</span>

        {/* Selected count */}
        {allIds.length > 0 && (
          <span className="text-xs text-gray-500 font-mono shrink-0">
            {selectedCount}/{allIds.length}
          </span>
        )}

        {/* Folder checkbox */}
        <input
          type="checkbox"
          checked={isFullySelected}
          ref={(el) => {
            if (el) el.indeterminate = isPartiallySelected;
          }}
          onChange={handleFolderCheckbox}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
          aria-label={`Select all in ${folder.name}`}
          className="w-4 h-4 rounded border-gray-600 bg-[#1A1A1A] accent-blue-500 shrink-0"
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="ml-4">
          {/* Nested folders */}
          {folder.children.map((child) => (
            <FolderTree
              key={child.id}
              folder={child}
              level={level + 1}
              selectedSourceIds={selectedSourceIds}
              onSelectFolder={onSelectFolder}
              onSelectSource={onSelectSource}
              isViewer={isViewer}
            />
          ))}

          {/* Documents in this folder */}
          {folder.sources.map((source) => (
            <DocumentItem
              key={source.id}
              source={source}
              isSelected={selectedSourceIds.has(source.id)}
              onSelect={onSelectSource}
              disabled={disabled}
            />
          ))}

          {folder.children.length === 0 && folder.sources.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-gray-600 italic">Empty folder</p>
          )}
        </div>
      )}
    </div>
  );
}
