'use client';

import { useState } from 'react';

export interface CustomFieldDef {
  id: string;
  name: string;
  fieldType: 'TEXT' | 'DATE' | 'SELECT';
  isRequired: boolean;
  options?: string[] | null;
}

interface MetadataFormProps {
  /** Custom field definitions for the user's organization */
  customFields: CustomFieldDef[];
  /** Called whenever any value changes */
  onChange: (metadata: Record<string, string>) => void;
}

/**
 * MetadataForm — renders per-field inputs based on type when uploading a source.
 * Integrates into the ingest form; calls `onChange` with the current metadata values.
 */
export function MetadataForm({ customFields, onChange }: MetadataFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (customFields.length === 0) return null;

  function update(name: string, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    onChange(next);
  }

  function touch(name: string) {
    setTouched((t) => ({ ...t, [name]: true }));
  }

  function isInvalid(field: CustomFieldDef): boolean {
    if (!touched[field.name]) return false;
    const val = values[field.name] ?? '';
    if (field.isRequired && !val.trim()) return true;
    if (field.fieldType === 'DATE' && val && isNaN(new Date(val).getTime())) return true;
    return false;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
        Custom metadata
      </p>

      {customFields.map((field) => {
        const invalid = isInvalid(field);
        const val = values[field.name] ?? '';

        return (
          <div key={field.id}>
            <label
              style={{
                fontSize: '12px',
                color: invalid ? '#e53e3e' : 'var(--text-secondary)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {field.name}
              {field.isRequired && (
                <span style={{ color: '#e53e3e', marginLeft: '2px' }}>*</span>
              )}
            </label>

            {field.fieldType === 'SELECT' ? (
              <select
                value={val}
                onChange={(e) => update(field.name, e.target.value)}
                onBlur={() => touch(field.name)}
                style={inputStyle(invalid)}
              >
                {!field.isRequired && <option value="">— select —</option>}
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.fieldType === 'DATE' ? 'date' : 'text'}
                value={val}
                placeholder={field.fieldType === 'TEXT' ? `Enter ${field.name}…` : undefined}
                onChange={(e) => update(field.name, e.target.value)}
                onBlur={() => touch(field.name)}
                style={inputStyle(invalid)}
              />
            )}

            {invalid && field.isRequired && !val.trim() && (
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#e53e3e' }}>
                {field.name} is required
              </p>
            )}
            {invalid && field.fieldType === 'DATE' && val && (
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#e53e3e' }}>
                Must be a valid date
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${invalid ? '#e53e3e' : 'var(--border)'}`,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };
}
