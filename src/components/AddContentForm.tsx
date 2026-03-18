'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface AddContentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

type Tab = 'url' | 'text' | 'pdf';

/**
 * AddContentForm — modal overlay for ingesting new content
 */
export function AddContentForm({ onClose, onSuccess, userId }: AddContentFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [fileValue, setFileValue] = useState<File | null>(null);

  const isValid = (() => {
    if (activeTab === 'url') return urlValue.trim().length > 0;
    if (activeTab === 'text') return textValue.trim().length > 0;
    if (activeTab === 'pdf') return fileValue !== null;
    return false;
  })();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1200);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || isLoading) return;

      setIsLoading(true);
      setProgress(0);

      try {
        let response: Response;

        if (activeTab === 'pdf' && fileValue) {
          const formData = new FormData();
          formData.append('type', 'pdf');
          formData.append('file', fileValue);
          setProgress(30);
          response = await fetch('/api/ingest', { method: 'POST', body: formData, headers: userId ? { 'x-user-id': userId } : {} });
        } else {
          const type = activeTab;
          const content = activeTab === 'url' ? urlValue.trim() : textValue.trim();
          setProgress(30);
          response = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
            body: JSON.stringify({ type, content }),
          });
        }

        setProgress(70);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

        setProgress(100);
        showToast('success', `"${data.title}" added — ${data.chunksCreated} chunks`);

        setUrlValue('');
        setTextValue('');
        setFileValue(null);
        onSuccess();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        showToast('error', message);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, urlValue, textValue, fileValue, isValid, isLoading, onClose, onSuccess]
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    caretColor: 'var(--accent)',
    transition: 'border-color 150ms ease',
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '80px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        onClick={onClose}
      >
        {/* Panel */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Add Content
            </h2>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {(['url', 'text', 'pdf'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    padding: '0 0 10px 0',
                    marginBottom: '-1px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'inherit',
                    transition: 'color 150ms ease',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTab === 'url' && (
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
              />
            )}

            {activeTab === 'text' && (
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Paste your text or markdown here..."
                disabled={isLoading}
                rows={6}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '120px',
                }}
                onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'; }}
              />
            )}

            {activeTab === 'pdf' && (
              <div>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: `1px dashed ${fileValue ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'border-color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    if (!fileValue) (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isLoading}
                    style={{ display: 'none' }}
                    onChange={(e) => setFileValue(e.target.files?.[0] ?? null)}
                  />
                  {fileValue ? (
                    <>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 500 }}>
                        {fileValue.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {(fileValue.size / 1024).toFixed(0)} KB — click to change
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '20px' }}>📁</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Click to select a PDF
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        .pdf files only
                      </span>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (!isValid || isLoading) ? 'var(--accent-dim)' : 'var(--accent)',
                color: (!isValid || isLoading) ? 'var(--text-muted)' : '#1C1B1F',
                fontSize: '14px',
                fontWeight: 500,
                cursor: (!isValid || isLoading) ? 'not-allowed' : 'pointer',
                opacity: (!isValid || isLoading) ? 0.5 : 1,
                transition: 'all 150ms ease',
                fontFamily: 'inherit',
              }}
            >
              {isLoading ? `Adding… ${progress}%` : 'Add'}
            </button>
          </form>

          {/* Progress bar at bottom of modal */}
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '2px',
                backgroundColor: 'var(--accent)',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
                borderRadius: '0 0 0 16px',
              }}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            fontSize: '13px',
            color: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
            maxWidth: '320px',
          }}
        >
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.message}
        </div>
      )}
    </>
  );
}
