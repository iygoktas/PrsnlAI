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
 * SearchBar component — underline-only style with animated loading indicator
 */
export function SearchBar({
  query,
  loading = false,
  onSubmit,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [dotCount, setDotCount] = useState(0);

  // Animate dots during loading
  useEffect(() => {
    if (!loading) {
      setDotCount(0);
      return;
    }
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [loading]);

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

  const loadingDots = loading ? '.'.repeat(dotCount) : '';

  return (
    <div
      className="w-full border-b"
      style={{
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="relative flex items-center px-0 py-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`${loading ? '' : 'Ask anything about your sources…'}${loadingDots}`}
          disabled={loading}
          className="w-full bg-transparent outline-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            color: 'var(--color-text)',
            caretColor: 'var(--color-accent)',
            paddingRight: isFocused ? '2rem' : '0',
            transition: 'padding-right 0.15s ease',
          }}
          aria-label="Search query"
        />
        {isFocused && !loading && (
          <div
            className="absolute right-0 flex items-center gap-1"
            style={{
              color: 'var(--color-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <span>↵</span>
          </div>
        )}
      </div>
    </div>
  );
}
