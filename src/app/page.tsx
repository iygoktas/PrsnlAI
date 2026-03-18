'use client';

import { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { AddContentForm } from '@/components/AddContentForm';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { type SearchResult } from '@/search/semantic';
import type { Source } from '@prisma/client';

interface SearchResponse {
  answer: string;
  sources: SearchResult[];
}

export default function Home() {
  const { user, isLoading } = useAuth();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);

  const fetchSources = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) return;
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    }
  }, [user]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;
    setQuery(searchQuery);
    setIsSearching(true);
    setError(null);
    setSearchResults(null);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  const handleAddSuccess = useCallback(() => {
    setShowAddModal(false);
    fetchSources();
  }, [fetchSources]);

  // Auth loading — blank screen briefly
  if (isLoading) return null;

  // Not logged in — show auth modal
  if (!user) return <AuthModal />;

  const hasContent = !!(searchResults || error || (isSearching && query));

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar
        sources={sources}
        onAddClick={() => setShowAddModal(true)}
        onSourcesChange={fetchSources}
        userId={user.userId}
        orgId={user.orgId}
        userRole={user.role}
        userName={user.name}
      />

      {/* Right panel */}
      <main style={{
        marginLeft: '320px', minHeight: '100vh',
        backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Scrollable results area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: hasContent ? '48px 40px 24px' : '0' }}>
          {error && (
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <p style={{ fontSize: '14px', color: 'var(--error)' }}>{error}</p>
            </div>
          )}
          {searchResults && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <SearchResults answer={searchResults.answer} sources={searchResults.sources} />
            </div>
          )}
          {isSearching && !searchResults && (
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--accent-dim)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Searching…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Search bar — sticky at bottom */}
        <div style={{
          position: 'sticky', bottom: 0, backgroundColor: 'var(--bg-base)',
          borderTop: hasContent ? '1px solid var(--border)' : 'none',
          padding: hasContent ? '16px 40px 24px' : '0 40px',
        }}>
          {!hasContent && <div style={{ height: 'calc(50vh - 80px)' }} />}
          <div style={{ maxWidth: '672px', margin: '0 auto' }}>
            {query && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {query}
              </p>
            )}
            <SearchBar query={query} loading={isSearching} onSubmit={handleSearch} />
          </div>
          {!hasContent && <div style={{ height: 'calc(50vh - 80px)' }} />}
        </div>
      </main>

      {showAddModal && (
        <AddContentForm
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          userId={user.userId}
        />
      )}
    </div>
  );
}
