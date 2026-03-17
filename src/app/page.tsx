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

  // Fetch sources list on mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        // TODO: Create /api/sources endpoint to list all sources
        // For now, just use empty list
        setSources([]);
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      }
    };
    fetchSources();
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return;
      }

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

        if (!response.ok) {
          throw new Error(data.error || `Error ${response.status}`);
        }

        setSearchResults(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred during search';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleAddSuccess = useCallback(() => {
    setShowAddModal(false);
    // Refresh sources list
    setSources([]);
  }, []);

  return (
    <div
      className="grid grid-cols-[320px_1fr] min-h-screen w-full"
      style={{
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Left panel: Sidebar */}
      <Sidebar sources={sources} onAddClick={() => setShowAddModal(true)} />

      {/* Right panel: Search and results */}
      <main
        className="ml-80 overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div className="pt-16 px-8 max-w-3xl mx-auto pb-12">
          {/* Search bar */}
          <SearchBar query={query} loading={isLoading} onSubmit={handleSearch} />

          {/* Error message */}
          {error && (
            <div
              className="mt-6 p-4 border rounded-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: '#FF6B6B',
              }}
            >
              <p
                className="text-sm"
                style={{
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {error}
              </p>
            </div>
          )}

          {/* Search results */}
          {searchResults && (
            <SearchResults
              answer={searchResults.answer}
              sources={searchResults.sources}
            />
          )}

          {/* Empty state */}
          {!isLoading && !searchResults && !error && !query && (
            <div
              className="mt-12 text-center py-8"
              style={{
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              <p className="italic">Start searching your knowledge base</p>
            </div>
          )}
        </div>
      </main>

      {/* Add content modal */}
      {showAddModal && (
        <AddContentForm
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
