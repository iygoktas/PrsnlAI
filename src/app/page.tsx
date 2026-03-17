'use client';

import { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { AddContentForm } from '@/components/AddContentForm';
import { type SearchResult } from '@/search/semantic';
import type { Source } from '@prisma/client';

interface SearchResponse {
  answer: string;
  sources: SearchResult[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) return;
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddSuccess = useCallback(() => {
    setShowAddModal(false);
    fetchSources();
  }, [fetchSources]);

  const hasContent = !!(searchResults || error || (isLoading && query));

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar
        sources={sources}
        onAddClick={() => setShowAddModal(true)}
        onSourcesChange={fetchSources}
      />

      {/* Right panel — flex column, search pinned to bottom */}
      <main
        style={{
          marginLeft: '320px',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-base)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable results area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: hasContent ? '48px 40px 24px' : '0' }}>
          {/* Error */}
          {error && (
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <p style={{ fontSize: '14px', color: 'var(--error)' }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {searchResults && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <SearchResults answer={searchResults.answer} sources={searchResults.sources} />
            </div>
          )}

          {/* Loading state */}
          {isLoading && !searchResults && (
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--accent-dim)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Searching…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Search bar — sticky at bottom */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--bg-base)',
            borderTop: hasContent ? '1px solid var(--border)' : 'none',
            padding: hasContent ? '16px 40px 24px' : '0 40px',
            // When no content yet, vertically center by using flex trick on the parent
          }}
        >
          {/* Vertical centering spacer when empty */}
          {!hasContent && (
            <div style={{ height: 'calc(50vh - 80px)' }} />
          )}
          <div style={{ maxWidth: '672px', margin: '0 auto' }}>
            {/* Query label */}
            {query && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {query}
              </p>
            )}
            <SearchBar query={query} loading={isLoading} onSubmit={handleSearch} />
          </div>
          {!hasContent && (
            <div style={{ height: 'calc(50vh - 80px)' }} />
          )}
        </div>
      </main>

      {showAddModal && (
        <AddContentForm
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
