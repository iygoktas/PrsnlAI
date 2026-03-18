'use client';

import { useState } from 'react';

export interface CustomFieldDef {
  id: string;
  name: string;
  fieldType: 'TEXT' | 'DATE' | 'SELECT';
  options?: string[] | null;
}

export interface ActiveFilters {
  sourceType?: string[];
  folderId?: string;
  dateRange?: { from?: string; to?: string };
  customFields?: Array<{ fieldName: string; value: string }>;
}

interface FilterBuilderProps {
  customFields: CustomFieldDef[];
  onChange: (filters: ActiveFilters) => void;
}

const SOURCE_TYPES = ['PDF', 'URL', 'TEXT', 'TWEET'] as const;

/**
 * FilterBuilder — builds a structured filter object from custom field definitions
 * and built-in filters (source type, date range, folder).
 */
export function FilterBuilder({ customFields, onChange }: FilterBuilderProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [folderId, setFolderId] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  function emit(overrides: Partial<{
    types: string[];
    from: string;
    to: string;
    folder: string;
    custom: Record<string, string>;
  }> = {}) {
    const types   = overrides.types  ?? selectedTypes;
    const from    = overrides.from   ?? dateFrom;
    const to      = overrides.to     ?? dateTo;
    const folder  = overrides.folder ?? folderId;
    const custom  = overrides.custom ?? customValues;

    const filters: ActiveFilters = {};
    if (types.length)  filters.sourceType = types;
    if (folder.trim()) filters.folderId   = folder.trim();
    if (from || to)    filters.dateRange  = { from: from || undefined, to: to || undefined };

    const cfEntries = Object.entries(custom).filter(([, v]) => v.trim() !== '');
    if (cfEntries.length) {
      filters.customFields = cfEntries.map(([fieldName, value]) => ({ fieldName, value: value.trim() }));
    }

    onChange(filters);
  }

  function toggleType(type: string) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    emit({ types: next });
  }

  function updateCustom(fieldName: string, value: string) {
    const next = { ...customValues, [fieldName]: value };
    setCustomValues(next);
    emit({ custom: next });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Source type chips */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
          SOURCE TYPE
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SOURCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              style={{
                padding: '4px 12px',
                borderRadius: '99px',
                border: '1px solid var(--border)',
                background: selectedTypes.includes(t) ? 'var(--accent)' : 'transparent',
                color: selectedTypes.includes(t) ? '#fff' : 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            FROM
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); emit({ from: e.target.value }); }}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            TO
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); emit({ to: e.target.value }); }}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Folder ID */}
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
          FOLDER ID
        </label>
        <input
          type="text"
          placeholder="Paste folder ID…"
          value={folderId}
          onChange={(e) => { setFolderId(e.target.value); emit({ folder: e.target.value }); }}
          style={inputStyle}
        />
      </div>

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CUSTOM FIELDS</label>
          {customFields.map((field) => (
            <div key={field.id}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                {field.name}
              </label>
              {field.fieldType === 'SELECT' ? (
                <select
                  value={customValues[field.name] ?? ''}
                  onChange={(e) => updateCustom(field.name, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Any</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.fieldType === 'DATE' ? 'date' : 'text'}
                  value={customValues[field.name] ?? ''}
                  onChange={(e) => updateCustom(field.name, e.target.value)}
                  placeholder={field.fieldType === 'TEXT' ? `Filter by ${field.name}…` : undefined}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};
