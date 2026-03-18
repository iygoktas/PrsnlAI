'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddContentForm } from '@/components/AddContentForm';
import ReportBuilder from '@/components/ReportBuilder';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';

type Tab = 'upload' | 'report';

export default function AddPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [added, setAdded] = useState(false);

  if (isLoading) return null;
  if (!user) return <AuthModal />;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={16} />
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Add Content</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
          {(['upload', 'report'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontFamily: 'inherit', fontWeight: activeTab === t ? 600 : 400,
                color: activeTab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}>
              {t === 'upload' ? 'Upload Document' : 'Create Report'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'upload' && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Add a URL, paste text, or upload a PDF to your knowledge base.
            </p>
            <AddContentForm
              onClose={() => { window.location.href = '/'; }}
              onSuccess={() => { window.location.href = '/'; }}
              userId={user.userId}
            />
          </div>
        )}

        {activeTab === 'report' && (
          <ReportBuilder
            orgId={user.orgId}
            userId={user.userId}
            onReportCreated={() => { window.location.href = '/reports'; }}
          />
        )}
      </div>
    </div>
  );
}
