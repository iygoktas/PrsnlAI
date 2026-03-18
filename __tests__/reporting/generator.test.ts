/**
 * Integration tests for the PDF report generator.
 *
 * Strategy: mock Prisma, use real PDFKit. Verifies that:
 *  - generatePdfReport returns a valid PDF buffer
 *  - all 3 source titles are present in the raw PDF bytes (PDFKit embeds text)
 *  - the function throws ReportError for missing / empty reports
 */

// @jest-environment node

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    report: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    source: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@/lib/prisma';
import { generatePdfReport } from '@/reporting/generator';
import { ReportError } from '@/lib/errors';

/**
 * PDFKit stores text as hex-encoded glyphs inside TJ operators, e.g. <48656c6c6f>.
 * Decode all <hexhex> sequences in the uncompressed PDF buffer to extract readable text.
 */
function pdfText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const hexPattern = /<([0-9a-fA-F]+)>/g;
  let decoded = '';
  let match: RegExpExecArray | null;
  while ((match = hexPattern.exec(raw)) !== null) {
    const hex = match[1];
    for (let i = 0; i < hex.length; i += 2) {
      decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    // No separator — actual spaces are encoded as 0x20 inside the hex sequences
  }
  return decoded;
}

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ── fixtures ──────────────────────────────────────────────────────────────────

const org = { id: 'org-1', name: 'Acme Corp', createdAt: new Date() };

const baseReport = {
  id: 'report-1',
  name: 'Q1 Research Report',
  orgId: 'org-1',
  org,
  createdBy: 'alice@example.com',
  selectedSourceIds: ['src-1', 'src-2', 'src-3'],
  filters: null,
  generatedAt: null,
  createdAt: new Date(),
};

const makeSource = (id: string, title: string, type = 'TEXT', url?: string) => ({
  id,
  type,
  title,
  url: url ?? null,
  filePath: null,
  content: `Full content of ${title}`,
  folderId: null,
  createdAt: new Date('2024-01-15'),
  chunks: [
    {
      id: `${id}-chunk-0`,
      sourceId: id,
      content: `Introduction section of ${title}. This is the opening paragraph.`,
      chunkIndex: 0,
      pageNumber: 1,
      createdAt: new Date(),
    },
    {
      id: `${id}-chunk-1`,
      sourceId: id,
      content: `Main body of ${title}. Detailed analysis and findings go here.`,
      chunkIndex: 1,
      pageNumber: 2,
      createdAt: new Date(),
    },
  ],
});

const sources = [
  makeSource('src-1', 'Machine Learning Fundamentals', 'PDF'),
  makeSource('src-2', 'Neural Network Architectures', 'URL', 'https://example.com/nn'),
  makeSource('src-3', 'Data Preprocessing Guide', 'TEXT'),
];

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.report.update as jest.Mock).mockResolvedValue({ ...baseReport, generatedAt: new Date() });
});

// ── happy path ────────────────────────────────────────────────────────────────

describe('generatePdfReport()', () => {
  describe('with 3 sources', () => {
    beforeEach(() => {
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue(baseReport);
      (mockPrisma.source.findMany as jest.Mock).mockResolvedValue(sources);
    });

    it('returns a non-empty Buffer', async () => {
      const result = await generatePdfReport('report-1');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces a valid PDF (starts with %PDF-)', async () => {
      const result = await generatePdfReport('report-1');
      expect(result.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('contains all 3 source titles in the PDF text', async () => {
      const result = await generatePdfReport('report-1');
      const text = pdfText(result);

      for (const source of sources) {
        expect(text).toContain(source.title);
      }
    });

    it('contains the report name in the PDF', async () => {
      const result = await generatePdfReport('report-1');
      const text = pdfText(result);
      expect(text).toContain(baseReport.name);
    });

    it('contains the organization name in the PDF', async () => {
      const result = await generatePdfReport('report-1');
      const text = pdfText(result);
      expect(text).toContain(org.name.toUpperCase());
    });

    it('contains "Table of Contents" section', async () => {
      const result = await generatePdfReport('report-1');
      const text = pdfText(result);
      expect(text).toContain('Table of Contents');
    });

    it('contains "Sources" section', async () => {
      const result = await generatePdfReport('report-1');
      const text = pdfText(result);
      expect(text).toContain('Sources');
    });

    it('marks the report as generated (updates generatedAt)', async () => {
      await generatePdfReport('report-1');
      expect(mockPrisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'report-1' },
          data: expect.objectContaining({ generatedAt: expect.any(Date) }),
        }),
      );
    });

    it('queries sources by the selectedSourceIds', async () => {
      await generatePdfReport('report-1');
      expect(mockPrisma.source.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['src-1', 'src-2', 'src-3'] } },
          include: expect.objectContaining({ chunks: expect.anything() }),
        }),
      );
    });
  });

  // ── sources with no chunks ──────────────────────────────────────────────────

  describe('with a source that has no chunks', () => {
    it('still generates a valid PDF', async () => {
      const noChunkSource = { ...makeSource('src-empty', 'Empty Doc'), chunks: [] };
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue({
        ...baseReport,
        selectedSourceIds: ['src-empty'],
      });
      (mockPrisma.source.findMany as jest.Mock).mockResolvedValue([noChunkSource]);

      const result = await generatePdfReport('report-1');
      expect(result.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  // ── sources with URL ────────────────────────────────────────────────────────

  describe('with a URL source', () => {
    it('includes the URL in the PDF', async () => {
      const urlSource = makeSource('src-url', 'Web Article', 'URL', 'https://example.com/article');
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue({
        ...baseReport,
        selectedSourceIds: ['src-url'],
      });
      (mockPrisma.source.findMany as jest.Mock).mockResolvedValue([urlSource]);

      const result = await generatePdfReport('report-1');
      const text = pdfText(result);
      expect(text).toContain('https://example.com/article');
    });
  });

  // ── error cases ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws ReportError NOT_FOUND when report does not exist', async () => {
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(generatePdfReport('missing')).rejects.toMatchObject({
        name: 'ReportError',
        code: 'NOT_FOUND',
      });
    });

    it('throws ReportError INVALID_INPUT when selectedSourceIds is empty', async () => {
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue({
        ...baseReport,
        selectedSourceIds: [],
      });

      await expect(generatePdfReport('report-1')).rejects.toMatchObject({
        name: 'ReportError',
        code: 'INVALID_INPUT',
      });
    });

    it('does not update generatedAt when generation fails', async () => {
      (mockPrisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(generatePdfReport('missing')).rejects.toThrow();
      expect(mockPrisma.report.update).not.toHaveBeenCalled();
    });
  });
});
