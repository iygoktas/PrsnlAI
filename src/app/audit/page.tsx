'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AuditLogViewer from '@/components/AuditLogViewer';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';

export default function AuditPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <AuthModal />;

  if (user.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Audit logs are only visible to Admins.</p>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: '13px' }}>← Back to home</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={16} />
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Audit Log</h1>
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(200,146,42,0.15)', color: 'var(--accent)', fontWeight: 600 }}>
            KVKK Compliance
          </span>
        </div>
        <AuditLogViewer userId={user.userId} />
      </div>
    </div>
  );
}
