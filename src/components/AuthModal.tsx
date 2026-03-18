'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { SessionUser } from '@/lib/session';

type Tab = 'login' | 'register';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin — full access, can manage org',
  MANAGER: 'Manager — upload & manage content',
  VIEWER: 'Viewer — read-only access',
};

export function AuthModal() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [orgName, setOrgName] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      login(data as SessionUser);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPassword !== regPassword2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      login(data as SessionUser);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const btn: React.CSSProperties = {
    width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
    backgroundColor: 'var(--accent)', color: '#000', fontSize: '14px',
    fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', margin: '16px',
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '32px', boxSizing: 'border-box',
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Knowledge Base
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Your personal AI memory
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              style={{
                flex: 1, padding: '8px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: tab === t ? 600 : 400, fontFamily: 'inherit',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}>
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '13px', color: '#f87171',
          }}>{error}</div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={(e) => void handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input style={inp} type="email" placeholder="you@example.com" value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input style={inp} type="password" placeholder="••••••••" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" style={btn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              No account?{' '}
              <span onClick={() => setTab('register')}
                style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                Create one
              </span>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={(e) => void handleRegister(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Organization / Workspace name
              </label>
              <input style={inp} type="text" placeholder="My Company or Personal" value={orgName}
                onChange={(e) => setOrgName(e.target.value)} required autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Your name</label>
              <input style={inp} type="text" placeholder="Full name" value={regName}
                onChange={(e) => setRegName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input style={inp} type="email" placeholder="you@example.com" value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input style={inp} type="password" placeholder="Min. 8 characters" value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Confirm password</label>
              <input style={inp} type="password" placeholder="Repeat password" value={regPassword2}
                onChange={(e) => setRegPassword2(e.target.value)} required />
            </div>

            {/* Role info box */}
            <div style={{
              padding: '12px', borderRadius: '8px',
              backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0', fontWeight: 600 }}>
                YOUR ACCOUNT ROLE
              </p>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                    backgroundColor: role === 'ADMIN' ? 'rgba(200,146,42,0.2)' : 'var(--bg-surface)',
                    color: role === 'ADMIN' ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${role === 'ADMIN' ? 'var(--accent)' : 'var(--border)'}`,
                  }}>{role}</span>
                  <span style={{ fontSize: '12px', color: role === 'ADMIN' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {label.split(' — ')[1]}
                  </span>
                </div>
              ))}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                You are creating the workspace — you get <strong style={{ color: 'var(--accent)' }}>Admin</strong> role.
              </p>
            </div>

            <button type="submit" style={btn} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account & workspace'}
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              Already have an account?{' '}
              <span onClick={() => setTab('login')}
                style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                Sign in
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
