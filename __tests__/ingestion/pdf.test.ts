import { ingestPdf } from '@/ingestion/pdf';
import { IngestionError } from '@/lib/errors';

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());
import pdfParse from 'pdf-parse';

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe('ingestion/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestPdf()', () => {
    it('should extract text from a valid PDF', async () => {
      const buffer = Buffer.from('fake pdf content');
      const mockContent = 'This is a PDF document.\nWith multiple lines.\nAnd some content.';

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 1,
        info: { Title: 'Test Document' },
      } as any);

      const result = await ingestPdf(buffer, 'test.pdf');

      expect(result.type).toBe('PDF');
      expect(result.title).toBe('Test Document');
      expect(result.content).toBe(mockContent);
      expect(result.pageCount).toBe(1);
    });

    it('should extract title from filename if metadata missing', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'PDF content ' + 'x'.repeat(200);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 2,
        info: {},
      } as any);

      const result = await ingestPdf(buffer, 'my-document.pdf');

      expect(result.title).toBe('my-document');
    });

    it('should use default title if no metadata or filename', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'PDF content ' + 'x'.repeat(200);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 1,
        info: null,
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.title).toBe('Untitled PDF');
    });

    it('should truncate long titles to 50 chars', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'PDF content ' + 'x'.repeat(200);
      const longTitle = 'A'.repeat(60);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 1,
        info: { Title: longTitle },
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.title.length).toBe(50);
      expect(result.title).toBe('A'.repeat(50));
    });

    it('should detect and reject scanned PDFs', async () => {
      const buffer = Buffer.from('fake scanned pdf');
      const veryLittleText = 'a'; // Only 1 character

      mockPdfParse.mockResolvedValueOnce({
        text: veryLittleText,
        numpages: 10, // Many pages but almost no text = scanned
        info: {},
      } as any);

      await expect(ingestPdf(buffer)).rejects.toThrow(
        expect.objectContaining({
          code: 'SCANNED_PDF',
          message: expect.stringContaining('scanned or contains mostly images'),
        }),
      );
    });

    it('should handle PDF parse errors', async () => {
      const buffer = Buffer.from('corrupt pdf');

      mockPdfParse.mockRejectedValueOnce(new Error('PDF parsing failed'));

      await expect(ingestPdf(buffer)).rejects.toThrow(
        expect.objectContaining({
          code: 'CORRUPT_PDF',
          message: expect.stringContaining('Failed to parse PDF'),
        }),
      );
    });

    it('should throw on empty PDF buffer', async () => {
      const buffer = Buffer.from('');

      await expect(ingestPdf(buffer)).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_BUFFER',
        }),
      );
    });

    it('should throw on null/undefined buffer', async () => {
      await expect(ingestPdf(null as any)).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_BUFFER',
        }),
      );
    });

    it('should handle PDFs with no extractable text', async () => {
      const buffer = Buffer.from('fake pdf');

      mockPdfParse.mockResolvedValueOnce({
        text: '',
        numpages: 1,
        info: {},
      } as any);

      await expect(ingestPdf(buffer)).rejects.toThrow(
        expect.objectContaining({
          code: 'NO_TEXT',
        }),
      );
    });

    it('should handle PDFs with no page count', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'PDF content ' + 'x'.repeat(200);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: undefined,
        info: {},
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.pageCount).toBe(1); // Defaults to 1
    });

    it('should preserve multiline content', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'Line 1\nLine 2\nLine 3\n' + 'x'.repeat(300);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 3,
        info: {},
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.content).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should trim whitespace from extracted text', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = '  \n\n  PDF content  \n\n  ' + 'x'.repeat(300);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 1,
        info: {},
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.content).not.toMatch(/^\s+/);
      expect(result.content).not.toMatch(/\s+$/);
    });

    it('should handle multi-page PDFs', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'Page 1 content\n' + 'x'.repeat(300);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 10,
        info: { Title: 'Multi-page Document' },
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.pageCount).toBe(10);
      expect(result.title).toBe('Multi-page Document');
    });

    it('should return correct type field', async () => {
      const buffer = Buffer.from('fake pdf');
      const mockContent = 'PDF content ' + 'x'.repeat(200);

      mockPdfParse.mockResolvedValueOnce({
        text: mockContent,
        numpages: 1,
        info: {},
      } as any);

      const result = await ingestPdf(buffer);

      expect(result.type).toBe('PDF');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('pageCount');
    });
  });
});
