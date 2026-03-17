import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf-8');

describe('prisma/schema.prisma', () => {
  it('has postgresql datasource provider', () => {
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('references DATABASE_URL and DIRECT_URL', () => {
    expect(schema).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    expect(schema).toMatch(/directUrl\s*=\s*env\("DIRECT_URL"\)/);
  });

  describe('Source model', () => {
    it('exists', () => {
      expect(schema).toMatch(/model Source\s*\{/);
    });

    it('has id, type, title, url, filePath, content, createdAt fields', () => {
      expect(schema).toMatch(/id\s+String\s+@id/);
      expect(schema).toMatch(/type\s+SourceType/);
      expect(schema).toMatch(/title\s+String/);
      expect(schema).toMatch(/url\s+String\?/);
      expect(schema).toMatch(/filePath\s+String\?/);
      expect(schema).toMatch(/content\s+String/);
      expect(schema).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('has chunks relation to Chunk[]', () => {
      expect(schema).toMatch(/chunks\s+Chunk\[\]/);
    });
  });

  describe('Chunk model', () => {
    it('exists', () => {
      expect(schema).toMatch(/model Chunk\s*\{/);
    });

    it('has id, sourceId, content, chunkIndex, pageNumber, embedding, createdAt fields', () => {
      expect(schema).toMatch(/sourceId\s+String/);
      expect(schema).toMatch(/content\s+String/);
      expect(schema).toMatch(/chunkIndex\s+Int/);
      expect(schema).toMatch(/pageNumber\s+Int\?/);
      expect(schema).toMatch(/embedding\s+Unsupported\("vector\(1536\)"\)\?/);
      expect(schema).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('has cascading relation to Source', () => {
      expect(schema).toMatch(/source\s+Source\s+@relation/);
      expect(schema).toMatch(/onDelete: Cascade/);
    });
  });

  describe('SourceType enum', () => {
    it('has URL, PDF, TEXT, TWEET values', () => {
      expect(schema).toMatch(/enum SourceType\s*\{/);
      expect(schema).toMatch(/\bURL\b/);
      expect(schema).toMatch(/\bPDF\b/);
      expect(schema).toMatch(/\bTEXT\b/);
      expect(schema).toMatch(/\bTWEET\b/);
    });
  });
});
