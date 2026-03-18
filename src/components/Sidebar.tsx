'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Globe, FileText, AlignLeft, Plus, X, Pencil, Trash2, FolderOpen, List, BarChart2, Shield, LogOut, ChevronDown } from 'lucide-react';
import type { Source } from '@prisma/client';
import SourceSelector from '@/components/SourceSelector';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  sources: Source[];
  onAddClick: () => void;
  onSourcesChange?: () => void;
  selectedSourceId?: string;
  userId: string;
  orgId: string;
  userRole: 'ADMIN' | 'MANAGER' | 'VIEWER';
  userName: string;
}

type View = 'sources' | 'folders';

export default function Sidebar({
  sources,
  onAddClick,
  onSourcesChange,
  selectedSourceId,
  userId,
  orgId,
  userRole,
  userName,
}: SidebarProps) {
  const { logout } = useAuth();
  const [view, setView] = useState<View>('sources');
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const getTypeIcon = (type: string) => {
    const s: React.CSSProperties = { color: 'var(--text-muted)', width: 14, height: 14, flexShrink: 0 };
    switch (type) {
      case 'URL': return <Globe style={s} />;
      case 'PDF': return <FileText style={s} />;
      default:    return <AlignLeft style={s} />;
    }
  };

  const getDomain = (source: Source) => {
    if (!source.url) return 'Local';
    try { return new URL(source.url).hostname; }
    catch { return 'Local'; }
  };

  const formatDate = (date: Date) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30) return `${d}d ago`;
    const m = Math.floor(d / 30);
    if (m < 12) return `${m}mo ago`;
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const startEdit = (source: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(source.id);
    setEditingTitle(source.title);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingId(null); return; }
    setEditingId(null);
    await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ title: trimmed }),
    });
    onSourcesChange?.();
  };

  const handleDeleteClick = async (source: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${source.title}"? This cannot be undone.`)) return;
    await fetch(`/api/sources/${source.id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
    onSourcesChange?.();
  };

  const roleColor: Record<string, string> = {
    ADMIN: 'var(--accent)',
    MANAGER: '#60a5fa',
    VIEWER: 'var(--text-muted)',
  };

  const navItem = (href: string, icon: React.ReactNode, label: string) => (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 16px', textDecoration: 'none',
      color: 'var(--text-muted)', fontSize: '13px',
      transition: 'color 150ms ease, background 150ms ease',
      borderRadius: '0',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-elevated)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px',
        backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* ── Header ─────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            memex
          </span>
          <button onClick={onAddClick} aria-label="Add content"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 150ms ease', padding: 0 }}
            onMouseEnter={(e) => { const b = e.currentTarget; b.style.backgroundColor = 'var(--bg-elevated)'; b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { const b = e.currentTarget; b.style.backgroundColor = 'transparent'; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-muted)'; }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '4px', paddingTop: '4px' }}>
          {navItem('/reports', <BarChart2 size={14} />, 'Reports')}
          {userRole === 'ADMIN' && navItem('/audit', <Shield size={14} />, 'Audit Log')}
        </div>

        {/* ── View toggle ────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['sources', 'folders'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: view === v ? 600 : 400, fontFamily: 'inherit',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: view === v ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 150ms ease',
              }}
            >
              {v === 'sources' ? <List size={12} /> : <FolderOpen size={12} />}
              {v === 'sources' ? 'All Sources' : 'Folders'}
            </button>
          ))}
        </div>

        {/* ── Content area ───────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto' }}>

          {/* FOLDER VIEW — uses SourceSelector */}
          {view === 'folders' && (
            <div style={{ padding: '12px' }}>
              <SourceSelector
                orgId={orgId}
                onSelectionChange={() => {}}
                isViewer={userRole === 'VIEWER'}
              />
            </div>
          )}

          {/* SOURCE LIST VIEW — existing flat list */}
          {view === 'sources' && (
            <>
              {sources.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    No sources yet.{' '}
                    <button onClick={onAddClick} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                      Add a URL, PDF, or text.
                    </button>
                  </p>
                </div>
              ) : (
                sources.map((source) => {
                  const isPdf = source.type === 'PDF';
                  const isHovered = hoveredId === source.id;
                  const isEditing = editingId === source.id;
                  const isSelected = selectedSourceId === source.id;

                  return (
                    <div key={source.id}
                      onClick={() => !isEditing && isPdf && setPreviewSource(source)}
                      onMouseEnter={() => setHoveredId(source.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        position: 'relative', height: '48px', display: 'flex', alignItems: 'center',
                        padding: '0 16px', gap: '10px', overflow: 'hidden',
                        cursor: isPdf && !isEditing ? 'pointer' : 'default',
                        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                        backgroundColor: isHovered || isSelected ? 'var(--bg-elevated)' : 'transparent',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {getTypeIcon(source.type)}
                      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                        {isEditing ? (
                          <input ref={editInputRef} value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(source.id); if (e.key === 'Escape') setEditingId(null); }}
                            onBlur={() => commitEdit(source.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '2px 6px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
                          />
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.title}</div>
                            <div style={{ fontSize: '12px', color: isPdf ? 'var(--accent)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isPdf ? 'Click to preview' : getDomain(source)}
                            </div>
                          </>
                        )}
                      </div>
                      {isHovered && !isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button onClick={(e) => startEdit(source, e)} aria-label="Rename" title="Rename"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                          ><Pencil size={13} /></button>
                          <button onClick={(e) => handleDeleteClick(source, e)} aria-label="Delete" title="Delete"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                          ><Trash2 size={13} /></button>
                        </div>
                      )}
                      {!isHovered && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(source.createdAt)}</div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* ── User footer ────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', flexShrink: 0 }}>
          <button onClick={() => setUserMenuOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px', borderRadius: '8px', border: 'none',
              backgroundColor: userMenuOpen ? 'var(--bg-elevated)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)'; }}
            onMouseLeave={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            {/* Avatar */}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#000',
            }}>
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: roleColor[userRole] ?? 'var(--text-muted)', fontWeight: 500 }}>
                {userRole}
              </div>
            </div>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div style={{ marginTop: '4px', padding: '4px 0', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
              <button onClick={logout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '13px', color: 'var(--error)', fontFamily: 'inherit', transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {previewSource && (
        <PdfPreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
      )}
    </>
  );
}

function PdfPreviewModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const fileUrl = `/api/sources/${source.id}/file`;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div style={{ position: 'relative', margin: '32px auto', width: 'calc(100% - 64px)', maxWidth: '900px', height: 'calc(100vh - 64px)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <FileText size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a href={fileUrl} download={`${source.title}.pdf`} onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', transition: 'all 150ms ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
            >Download</a>
            <button onClick={onClose} aria-label="Close"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            ><X size={16} /></button>
          </div>
        </div>
        <iframe src={fileUrl} title={source.title} style={{ flex: 1, border: 'none', width: '100%', backgroundColor: '#fff' }} />
      </div>
    </div>
  );
}
