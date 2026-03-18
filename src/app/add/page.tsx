'use client';

import React, { useState } from 'react';
import AddContentForm from '@/components/AddContentForm';
import ReportBuilder from '@/components/ReportBuilder';

type Tab = 'upload' | 'report';

/**
 * Add content page — tabs for uploading documents and creating reports.
 * In production, orgId and userId would come from the session.
 */
export default function AddPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  // These would come from session/auth context in production
  const orgId = process.env.NEXT_PUBLIC_ORG_ID ?? 'default-org';
  const userId = process.env.NEXT_PUBLIC_USER_ID ?? 'default-user';

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F2F0EB] font-mono p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 tracking-wide">Add Content</h1>

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A] mb-6">
          {(['upload', 'report'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm capitalize transition-colors
                ${activeTab === tab
                  ? 'border-b-2 border-[#C8922A] text-[#C8922A]'
                  : 'text-gray-500 hover:text-[#F2F0EB]'}`}
            >
              {tab === 'upload' ? 'Upload' : 'Create Report'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'upload' && <AddContentForm />}
        {activeTab === 'report' && (
          <ReportBuilder
            orgId={orgId}
            userId={userId}
            onReportCreated={(id) => {
              console.log('Report created:', id);
            }}
          />
        )}
      </div>
    </div>
  );
}
