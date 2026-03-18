'use client';

import { useState } from 'react';

export interface CustomField {
  id: string;
  name: string;
  fieldType: 'TEXT' | 'DATE' | 'SELECT';
  isRequired: boolean;
  options?: string[] | null;
}

interface CustomFieldManagerProps {
  orgId: string;
  /** Current user role — only ADMIN sees the create form */
  userRole: 'ADMIN' | 'MANAGER' | 'VIEWER';
  fields: CustomField[];
  onFieldCreated: (field: CustomField) => void;
}

const FIELD_TYPES = ['TEXT', 'DATE', 'SELECT'] as const;

/**
 * CustomFieldManager — lists existing custom metadata fields and lets ADMINs
 * create new ones. Submits to POST /api/metadata.
 */
export function CustomFieldManager({
  orgId,
  userRole,
  fields,
  onFieldCreated,
}: CustomFieldManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<'TEXT' | 'DATE' | 'SELECT'>('TEXT');
  const [isRequired, setIsRequired] = useState(false);
  const [optionsRaw, setOptionsRaw] = useState(''); // comma-separated
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (fieldType === 'SELECT' && !optionsRaw.trim()) {
      setError('SELECT fields require at least one option');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const options = fieldType === 'SELECT'
        ? optionsRaw.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;

      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), fieldType, isRequired, options }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }

      const created: CustomField = await res.json();
      onFieldCreated(created);
      setName('');
      setFieldType('TEXT');
      setIsRequired(false);
      setOptionsRaw('');
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Field list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {fields.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            No custom fields defined yet.
          </p>
        ) : (
          fields.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
              }}
            >
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-primary)' }}>
                {f.name}
              </span>
              <span style={{ ...tagStyle, background: typeColor(f.fieldType) }}>
                {f.fieldType}
              </span>
              {f.isRequired && (
                <span style={{ ...tagStyle, background: '#e53e3e22', color: '#e53e3e' }}>
                  required
                </span>
              )}
              {f.options && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {(f.options as string[]).join(', ')}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* ADMIN: create form */}
      {userRole === 'ADMIN' && (
        <>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={addBtnStyle}>
              + Add custom field
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                New custom field
              </h4>

              <input
                type="text"
                placeholder="Field name (e.g. Project ID)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />

              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as typeof fieldType)}
                style={inputStyle}
              >
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {fieldType === 'SELECT' && (
                <input
                  type="text"
                  placeholder="Options (comma-separated)"
                  value={optionsRaw}
                  onChange={(e) => setOptionsRaw(e.target.value)}
                  style={inputStyle}
                />
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
                Required
              </label>

              {error && (
                <p style={{ margin: 0, fontSize: '12px', color: '#e53e3e' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCreate} disabled={submitting} style={primaryBtnStyle}>
                  {submitting ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setShowForm(false); setError(null); }} style={cancelBtnStyle}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const tagStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
};

const addBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px dashed var(--border)',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: '13px',
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: '13px',
  cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  cursor: 'pointer',
};

function typeColor(type: string): string {
  if (type === 'DATE')   return '#2b6cb022';
  if (type === 'SELECT') return '#6b46c122';
  return '#2f855a22';
}
