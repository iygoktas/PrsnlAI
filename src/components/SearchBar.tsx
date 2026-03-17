'use client';

import { useState } from 'react';

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
 * SearchBar component — controlled input with loading indicator and keyboard submit
 */
export function SearchBar({ query, loading = false, onSubmit }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(query);

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
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search your knowledge base..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          aria-label="Search query"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !inputValue.trim()}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 font-medium transition-colors flex items-center gap-2"
          aria-label="Submit search"
        >
          {loading ? (
            <>
              <Spinner />
              <span>Searching...</span>
            </>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Simple loading spinner component
 */
function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
