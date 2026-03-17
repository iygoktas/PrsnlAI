'use client';

import { useState } from 'react';

type SourceType = 'url' | 'text' | 'pdf';

interface Toast {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface AddContentFormProps {
  /**
   * Optional callback when content is successfully added
   */
  onSuccess?: (result: { sourceId: string; title: string; chunksCreated: number }) => void;

  /**
   * Optional callback when an error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * AddContentForm component — tabbed form for adding content (URL, text, or PDF)
 */
export function AddContentForm({ onSuccess, onError }: AddContentFormProps) {
  const [activeTab, setActiveTab] = useState<SourceType>('url');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // URL form state
  const [urlValue, setUrlValue] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

  // Text form state
  const [textValue, setTextValue] = useState('');
  const [textTitle, setTextTitle] = useState('');

  // PDF form state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');

  const addToast = (type: 'success' | 'error', title: string, message: string) => {
    const id = `${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlValue.trim()) {
      addToast('error', 'Error', 'Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          content: urlValue,
          title: urlTitle || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      addToast(
        'success',
        'Content Added',
        `"${data.title}" added with ${data.chunksCreated} chunks`
      );
      onSuccess?.(data);
      setUrlValue('');
      setUrlTitle('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast('error', 'Upload Failed', message);
      onError?.(error instanceof Error ? error : new Error(message));
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textValue.trim()) {
      addToast('error', 'Error', 'Please enter some text');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: textValue,
          title: textTitle || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      addToast(
        'success',
        'Content Added',
        `"${data.title}" added with ${data.chunksCreated} chunks`
      );
      onSuccess?.(data);
      setTextValue('');
      setTextTitle('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast('error', 'Upload Failed', message);
      onError?.(error instanceof Error ? error : new Error(message));
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      addToast('error', 'Error', 'Please select a PDF file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', 'pdf');
      formData.append('file', pdfFile);
      if (pdfTitle) {
        formData.append('title', pdfTitle);
      }

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      addToast(
        'success',
        'PDF Added',
        `"${data.title}" added with ${data.chunksCreated} chunks`
      );
      onSuccess?.(data);
      setPdfFile(null);
      setPdfTitle('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast('error', 'Upload Failed', message);
      onError?.(error instanceof Error ? error : new Error(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['url', 'text', 'pdf'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={loading}
            className={`px-4 py-3 font-medium text-sm uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab === 'url' && '🌐 URL'}
            {tab === 'text' && '📝 Text'}
            {tab === 'pdf' && '📄 PDF'}
          </button>
        ))}
      </div>

      {/* Progress indicator */}
      {loading && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Uploading...</span>
          </div>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium mb-2">
              URL
            </label>
            <input
              id="url-input"
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/article"
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400"
            />
          </div>
          <div>
            <label htmlFor="url-title" className="block text-sm font-medium mb-2">
              Title (optional)
            </label>
            <input
              id="url-title"
              type="text"
              value={urlTitle}
              onChange={(e) => setUrlTitle(e.target.value)}
              placeholder="Custom title..."
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !urlValue.trim()}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Add URL
          </button>
        </form>
      )}

      {/* Text Tab */}
      {activeTab === 'text' && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <label htmlFor="text-input" className="block text-sm font-medium mb-2">
              Text Content
            </label>
            <textarea
              id="text-input"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Paste your text or markdown here..."
              disabled={loading}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400 font-mono text-sm"
            />
          </div>
          <div>
            <label htmlFor="text-title" className="block text-sm font-medium mb-2">
              Title (optional)
            </label>
            <input
              id="text-title"
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Custom title..."
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !textValue.trim()}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Add Text
          </button>
        </form>
      )}

      {/* PDF Tab */}
      {activeTab === 'pdf' && (
        <form onSubmit={handlePdfSubmit} className="space-y-4">
          <div>
            <label htmlFor="pdf-input" className="block text-sm font-medium mb-2">
              PDF File
            </label>
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.files?.[0] || null)}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 file:mr-2 file:px-3 file:py-1 file:rounded file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-400"
            />
            {pdfFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div>
            <label htmlFor="pdf-title" className="block text-sm font-medium mb-2">
              Title (optional)
            </label>
            <input
              id="pdf-title"
              type="text"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder="Custom title..."
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !pdfFile}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Upload PDF
          </button>
        </form>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{toast.type === 'success' ? '✓' : '✕'}</span>
              <div>
                <h4
                  className={`font-semibold ${
                    toast.type === 'success'
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {toast.title}
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    toast.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
