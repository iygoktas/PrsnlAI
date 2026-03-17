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

/**
 * Home page — two-panel layout with Sidebar and search/answer area
 */
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
      // silently ignore — sidebar shows empty state
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

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
      const message = err instanceof Error ? err.message : 'An error occurred during search';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddSuccess = useCallback(() => {
    setShowAddModal(false);
    fetchSources();
  }, [fetchSources]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Left panel: Sidebar */}
      <Sidebar sources={sources} onAddClick={() => setShowAddModal(true)} />

      {/* Right panel */}
      <main
        style={{
          marginLeft: '320px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-base)',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            maxWidth: '672px', // max-w-2xl
            margin: '0 auto',
            padding: '64px 32px 80px',
          }}
        >
          <SearchBar query={query} loading={isLoading} onSubmit={handleSearch} />

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: '24px',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <p style={{ fontSize: '14px', color: 'var(--error)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Results */}
          {searchResults && (
            <SearchResults
              answer={searchResults.answer}
              sources={searchResults.sources}
            />
          )}

          {/* Empty state */}
          {!isLoading && !searchResults && !error && !query && (
            <p
              style={{
                marginTop: '48px',
                textAlign: 'center',
                fontSize: '14px',
                color: 'var(--text-muted)',
              }}
            >
              Start searching your knowledge base
            </p>
          )}
        </div>
      </main>

      {/* Add modal */}
      {showAddModal && (
        <AddContentForm
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
