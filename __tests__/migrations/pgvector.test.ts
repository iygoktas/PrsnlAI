import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

describe('pgvector migration files', () => {
  const extensionMigration = path.join(
    MIGRATIONS_DIR,
    '20260317000000_enable_pgvector_extension',
    'migration.sql'
  );
  const indexMigration = path.join(
    MIGRATIONS_DIR,
    '20260317999999_pgvector_ivfflat_index',
    'migration.sql'
  );

  it('extension migration file exists', () => {
    expect(fs.existsSync(extensionMigration)).toBe(true);
  });

  it('extension migration enables the vector extension', () => {
    const sql = fs.readFileSync(extensionMigration, 'utf-8');
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS vector/i);
  });

  it('IVFFLAT index migration file exists', () => {
    expect(fs.existsSync(indexMigration)).toBe(true);
  });

  it('IVFFLAT index migration creates the correct index on Chunk.embedding', () => {
    const sql = fs.readFileSync(indexMigration, 'utf-8');
    expect(sql).toMatch(/CREATE INDEX/i);
    expect(sql).toMatch(/ivfflat/i);
    expect(sql).toMatch(/"Chunk"/);
    expect(sql).toMatch(/embedding/i);
    expect(sql).toMatch(/vector_cosine_ops/i);
  });

  it('IVFFLAT index migration has a higher timestamp than the extension migration', () => {
    const migrations = fs.readdirSync(MIGRATIONS_DIR).filter((d) =>
      fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory()
    );
    const extensionTs = migrations.find((d) => d.includes('enable_pgvector_extension'));
    const indexTs = migrations.find((d) => d.includes('pgvector_ivfflat_index'));
    expect(extensionTs).toBeDefined();
    expect(indexTs).toBeDefined();
    expect(extensionTs! < indexTs!).toBe(true);
  });
});
