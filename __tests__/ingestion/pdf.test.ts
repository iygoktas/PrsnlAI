import { ingestPdf } from '@/ingestion/pdf';
import { IngestionError } from '@/lib/errors';

// Mock logger to avoid setImmediate issues with Winston in jsdom
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock unpdf
jest.mock('unpdf', () => ({
  getDocumentProxy: jest.fn(),
  extractText: jest.fn(),
}));

import { getDocumentProxy, extractText } from 'unpdf';

const mockGetDocumentProxy = getDocumentProxy as jest.MockedFunction<typeof getDocumentProxy>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function setupMock(text: string | string[], numPages: number) {
  const fakeDoc = { numPages } as any;
  mockGetDocumentProxy.mockResolvedValueOnce(fakeDoc);
  mockExtractText.mockResolvedValueOnce({ text } as any);
}

describe('ingestion/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestPdf()', () => {
    it('should extract text from a valid PDF', async () => {
      const buffer = Buffer.from('fake pdf content');
      const mockContent = 'This is a PDF document.\nWith multiple lines.\nAnd some content.';
      setupMock(mockContent, 1);

      const result = await ingestPdf(buffer, 'test.pdf');

      expect(result.type).toBe('PDF');
      expect(result.title).toBe('test');
      expect(result.content).toBe(mockContent);
      expect(result.pageCount).toBe(1);
    });

    it('should extract title from filename', async () => {
      const mockContent = 'PDF content ' + 'x'.repeat(200);
      setupMock(mockContent, 2);

      const result = await ingestPdf(Buffer.from('fake pdf'), 'my-document.pdf');

      expect(result.title).toBe('my-document');
    });

    it('should use default title if no filename', async () => {
      const mockContent = 'PDF content ' + 'x'.repeat(200);
      setupMock(mockContent, 1);

      const result = await ingestPdf(Buffer.from('fake pdf'));

      expect(result.title).toBe('Untitled PDF');
    });

    it('should truncate long filenames to 50 chars', async () => {
      const mockContent = 'PDF content ' + 'x'.repeat(200);
      const longFilename = 'A'.repeat(60) + '.pdf';
      setupMock(mockContent, 1);

      const result = await ingestPdf(Buffer.from('fake pdf'), longFilename);

      expect(result.title.length).toBe(50);
      expect(result.title).toBe('A'.repeat(50));
    });

    it('should detect and reject scanned PDFs', async () => {
      setupMock('a', 10); // 1 char across 10 pages = scanned

      await expect(ingestPdf(Buffer.from('fake scanned pdf'))).rejects.toThrow(
        expect.objectContaining({
          code: 'SCANNED_PDF',
          message: expect.stringContaining('scanned or contains mostly images'),
        }),
      );
    });

    it('should handle PDF parse errors', async () => {
      mockGetDocumentProxy.mockRejectedValueOnce(new Error('PDF parsing failed'));

      await expect(ingestPdf(Buffer.from('corrupt pdf'))).rejects.toThrow(
        expect.objectContaining({
          code: 'CORRUPT_PDF',
          message: expect.stringContaining('Failed to parse PDF'),
        }),
      );
    });

    it('should throw on empty PDF buffer', async () => {
      await expect(ingestPdf(Buffer.from(''))).rejects.toThrow(
        expect.objectContaining({ code: 'EMPTY_BUFFER' }),
      );
    });

    it('should throw on null/undefined buffer', async () => {
      await expect(ingestPdf(null as any)).rejects.toThrow(
        expect.objectContaining({ code: 'EMPTY_BUFFER' }),
      );
    });

    it('should handle PDFs with no extractable text', async () => {
      setupMock('', 1);

      await expect(ingestPdf(Buffer.from('fake pdf'))).rejects.toThrow(
        expect.objectContaining({ code: 'NO_TEXT' }),
      );
    });

    it('should handle text returned as array', async () => {
      const pages = ['Page 1 content. ' + 'x'.repeat(100), 'Page 2 content. ' + 'x'.repeat(100)];
      setupMock(pages, 2);

      const result = await ingestPdf(Buffer.from('fake pdf'), 'test.pdf');

      expect(result.content).toContain('Page 1 content');
      expect(result.content).toContain('Page 2 content');
      expect(result.pageCount).toBe(2);
    });

    it('should preserve multiline content', async () => {
      const mockContent = 'Line 1\nLine 2\nLine 3\n' + 'x'.repeat(300);
      setupMock(mockContent, 3);

      const result = await ingestPdf(Buffer.from('fake pdf'));

      expect(result.content).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should trim whitespace from extracted text', async () => {
      const mockContent = '  \n\n  PDF content  \n\n  ' + 'x'.repeat(300);
      setupMock(mockContent, 1);

      const result = await ingestPdf(Buffer.from('fake pdf'));

      expect(result.content).not.toMatch(/^\s+/);
      expect(result.content).not.toMatch(/\s+$/);
    });

    it('should handle multi-page PDFs', async () => {
      const mockContent = 'Page 1 content\n' + 'x'.repeat(300);
      setupMock(mockContent, 10);

      const result = await ingestPdf(Buffer.from('fake pdf'), 'multi.pdf');

      expect(result.pageCount).toBe(10);
      expect(result.title).toBe('multi');
    });

    it('should return correct shape', async () => {
      const mockContent = 'PDF content ' + 'x'.repeat(200);
      setupMock(mockContent, 1);

      const result = await ingestPdf(Buffer.from('fake pdf'));

      expect(result.type).toBe('PDF');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('pageCount');
    });
  });
});
