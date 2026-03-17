'use client';

import { useState, useEffect } from 'react';

interface SearchBarProps {
  /**
   * Current query value
   */
  query: string;

  /**
   * Whether a search is in progress
   */
  loading?: boolean;

  /**
   * Callback fired when user submits a search query
   */
  onSubmit: (query: string) => void;
}

/**
 * SearchBar component — rounded card style with spinner loading indicator
 */
export function SearchBar({
  query,
  loading = false,
  onSubmit,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(query);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '14px 18px',
        gap: '12px',
        transition: 'border-color 150ms ease',
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Ask anything about your sources…"
        disabled={loading}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: '15px',
          color: 'var(--text-primary)',
          caretColor: 'var(--accent)',
          fontFamily: 'inherit',
        }}
        aria-label="Search query"
      />

      {/* Loading spinner or Enter hint */}
      {loading ? (
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid var(--accent-dim)',
            borderTopColor: 'var(--accent)',
            flexShrink: 0,
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : (
        isFocused && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            ↵
          </span>
        )
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
