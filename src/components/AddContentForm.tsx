'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface AddContentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'url' | 'text' | 'pdf';

/**
 * AddContentForm component — modal overlay for ingesting new content
 */
export function AddContentForm({ onClose, onSuccess }: AddContentFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form state
  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [fileValue, setFileValue] = useState<File | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setProgress(0);

      try {
        let content = '';
        let type: 'url' | 'text' | 'pdf' | undefined;
        let formData: FormData | undefined;

        if (activeTab === 'url' && urlValue.trim()) {
          type = 'url';
          content = urlValue.trim();
        } else if (activeTab === 'text' && textValue.trim()) {
          type = 'text';
          content = textValue.trim();
        } else if (activeTab === 'pdf' && fileValue) {
          type = 'pdf';
          formData = new FormData();
          formData.append('type', 'pdf');
          formData.append('file', fileValue);
        } else {
          showToast('error', 'Please fill in a field');
          setIsLoading(false);
          return;
        }

        setProgress(30);

        let response: Response;
        if (formData) {
          response = await fetch('/api/ingest', {
            method: 'POST',
            body: formData,
          });
        } else {
          response = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, content }),
          });
        }

        setProgress(70);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Error ${response.status}`);
        }

        setProgress(100);
        showToast(
          'success',
          `✓ "${data.title}" added — ${data.chunksCreated} chunks`
        );

        // Reset form
        setUrlValue('');
        setTextValue('');
        setFileValue(null);
        onSuccess();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        showToast('error', `✗ ${message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, urlValue, textValue, fileValue, onClose, onSuccess]
  );

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-24"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <div
          className="border rounded-sm p-6 w-full max-w-lg relative"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg"
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--color-text)',
              }}
            >
              Add Content
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{
                color: 'var(--color-muted)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--color-border)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-6 mb-6 border-b"
            style={{
              borderColor: 'var(--color-border)',
            }}
          >
            {(['url', 'text', 'pdf'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={isLoading}
                className="pb-2 text-sm transition-colors uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color:
                    activeTab === tab
                      ? 'var(--color-accent)'
                      : 'var(--color-muted)',
                  borderBottom:
                    activeTab === tab ? '2px solid var(--color-accent)' : 'none',
                  marginBottom: '-1px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL tab */}
            {activeTab === 'url' && (
              <div>
                <input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isLoading}
                  className="w-full bg-transparent outline-none pb-2 border-b"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)',
                    caretColor: 'var(--color-accent)',
                  }}
                />
              </div>
            )}

            {/* Text tab */}
            {activeTab === 'text' && (
              <div>
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste your text or markdown here..."
                  disabled={isLoading}
                  className="w-full bg-transparent outline-none pb-2 border-b resize-none h-32"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)',
                    caretColor: 'var(--color-accent)',
                  }}
                />
              </div>
            )}

            {/* PDF tab */}
            {activeTab === 'pdf' && (
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFileValue(e.files?.[0] || null)}
                  disabled={isLoading}
                  className="w-full bg-transparent outline-none pb-2 border-b"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)',
                    caretColor: 'var(--color-accent)',
                  }}
                />
                {fileValue && (
                  <p
                    className="mt-2 text-xs"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {fileValue.name}
                  </p>
                )}
              </div>
            )}

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 text-sm uppercase transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: isLoading
                    ? 'var(--color-muted)'
                    : 'var(--color-accent)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {isLoading ? `Adding... ${progress}%` : 'Add'}
              </button>
            </div>
          </form>

          {/* Progress bar */}
          {isLoading && (
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{
                backgroundColor: 'var(--color-accent)',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
                borderRadius: '0 0 0.25rem 0',
              }}
            />
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-sm text-sm border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            fontFamily: 'var(--font-mono)',
            color: toast.type === 'success' ? 'var(--color-accent)' : '#FF6B6B',
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
