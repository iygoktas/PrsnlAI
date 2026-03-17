'use client';

import { useState, useCallback } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { type SearchResult } from '@/search/semantic';

interface SearchResponse {
  answer: string;
  sources: SearchResult[];
}

/**
 * Home page — search interface for the knowledge base
 */
export default function Home() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen w-full py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Personal AI Knowledge Base</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search your knowledge base. Add content at <a href="/add" className="font-medium hover:underline">/add</a>.
          </p>
        </div>

        {/* Search bar */}
        <SearchBar query={query} loading={isLoading} onSubmit={handleSearch} />

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Search results */}
        {searchResults && (
          <SearchResults answer={searchResults.answer} sources={searchResults.sources} />
        )}

        {/* Empty state */}
        {!isLoading && !searchResults && !error && !query && (
          <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">Start by searching your knowledge base.</p>
            <p className="mt-2 text-sm">Or <a href="/add" className="font-medium hover:underline">add new content</a>.</p>
          </div>
        )}
      </div>
    </main>
  );
}
