'use client';

import { useState } from 'react';
import { AddContentForm } from '@/components/AddContentForm';

interface SuccessMessage {
  title: string;
  sourceId: string;
  chunksCreated: number;
}

/**
 * Add content page — interface for ingesting new content
 */
export default function AddPage() {
  const [successMessage, setSuccessMessage] = useState<SuccessMessage | null>(null);

  const handleSuccess = (result: { sourceId: string; title: string; chunksCreated: number }) => {
    setSuccessMessage({
      title: result.title,
      sourceId: result.sourceId,
      chunksCreated: result.chunksCreated,
    });

    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleError = (error: Error) => {
    console.error('Content ingestion error:', error);
  };

  return (
    <main className="min-h-screen w-full py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Add Content</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add a URL, paste text, or upload a PDF to your knowledge base.
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="font-medium text-green-900 dark:text-green-100">Content added successfully!</p>
            <p className="mt-2 text-sm text-green-800 dark:text-green-200">
              <strong>{successMessage.title}</strong> was added with {successMessage.chunksCreated} chunks.
              <br />
              <a
                href="/"
                className="mt-2 inline-block font-medium hover:underline"
              >
                Start searching →
              </a>
            </p>
          </div>
        )}

        {/* Add content form */}
        <AddContentForm onSuccess={handleSuccess} onError={handleError} />
      </div>
    </main>
  );
}
