'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, LayoutList } from 'lucide-react';
import FolderTree, { type FolderNode } from './FolderTree';
import DocumentItem, { type SourceItem } from './DocumentItem';

interface RawFolder {
  id: string;
  name: string;
  isPublic: boolean;
  parentId: string | null;
  sources: SourceItem[];
}

interface SourceSelectorProps {
  orgId: string;
  onSelectionChange: (sourceIds: string[]) => void;
  isViewer?: boolean;
}

/** Build a tree from a flat list of folders */
function buildTree(folders: RawFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Recursively collect all source IDs in a folder tree */
function collectAllSourceIds(folder: FolderNode): string[] {
  return [
    ...folder.sources.map((s) => s.id),
    ...folder.children.flatMap(collectAllSourceIds),
  ];
}

export default function SourceSelector({
  orgId,
  onSelectionChange,
  isViewer = false,
}: SourceSelectorProps) {
  const [folders, setFolders] = useState<RawFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  // Load folders + their sources
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/folders?orgId=${encodeURIComponent(orgId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setFolders(data.folders ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`Failed to load folders: ${err}`);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [orgId]);

  // Notify parent whenever selection changes
  useEffect(() => {
    onSelectionChange(Array.from(selectedSourceIds));
  }, [selectedSourceIds, onSelectionChange]);

  const handleSelectSource = useCallback((sourceId: string, selected: boolean) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(sourceId);
      else next.delete(sourceId);
      return next;
    });
  }, []);

  const handleSelectFolder = useCallback((folder: FolderNode, select: boolean) => {
    const ids = collectAllSourceIds(folder);
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (select) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSourceIds(new Set());
  }, []);

  // Flat list of all sources matching search
  const allSources = useMemo<SourceItem[]>(() => {
    const out: SourceItem[] = [];
    for (const folder of folders) {
      out.push(...folder.sources);
    }
    return out;
  }, [folders]);

  const filteredSources = useMemo<SourceItem[]>(() => {
    if (!searchQuery.trim()) return allSources;
    const q = searchQuery.toLowerCase();
    return allSources.filter((s) => s.title.toLowerCase().includes(q));
  }, [allSources, searchQuery]);

  const folderTree = useMemo(() => buildTree(folders), [folders]);

  const selectedCount = selectedSourceIds.size;

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search documents…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
            className="w-full pl-7 pr-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-sm text-[#F2F0EB] placeholder-gray-600 focus:outline-none focus:border-[#C8922A]"
          />
        </div>
        <button
          onClick={() => setViewMode((m) => (m === 'tree' ? 'flat' : 'tree'))}
          className="p-1.5 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] text-gray-400"
          title="Toggle view"
          aria-label="Toggle view mode"
        >
          <LayoutList size={14} />
        </button>
      </div>

      {/* Selection summary */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-2 py-1 bg-blue-950 border border-blue-700 rounded text-xs">
          <span className="text-blue-200">{selectedCount} document{selectedCount !== 1 ? 's' : ''} selected</span>
          <button
            onClick={handleClearSelection}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-200"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Content */}
      <div className="border border-[#2A2A2A] rounded-lg overflow-y-auto max-h-72 bg-[#0D0D0D]">
        {loading && (
          <p className="text-center text-xs text-gray-500 py-6">Loading folders…</p>
        )}
        {!loading && error && (
          <p className="text-center text-xs text-red-400 py-6">{error}</p>
        )}
        {!loading && !error && folderTree.length === 0 && (
          <p className="text-center text-xs text-gray-600 py-6 italic">No folders found.</p>
        )}

        {!loading && !error && viewMode === 'tree' && (
          <div className="p-1">
            {folderTree.map((folder) => (
              <FolderTree
                key={folder.id}
                folder={folder}
                selectedSourceIds={selectedSourceIds}
                onSelectFolder={handleSelectFolder}
                onSelectSource={handleSelectSource}
                isViewer={isViewer}
              />
            ))}
          </div>
        )}

        {!loading && !error && viewMode === 'flat' && (
          <div className="p-1">
            {filteredSources.length === 0 ? (
              <p className="text-center text-xs text-gray-600 py-6 italic">No documents match.</p>
            ) : (
              filteredSources.map((source) => (
                <DocumentItem
                  key={source.id}
                  source={source}
                  isSelected={selectedSourceIds.has(source.id)}
                  onSelect={handleSelectSource}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
