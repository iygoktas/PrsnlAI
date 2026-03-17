import { ingestUrl } from '@/ingestion/url';
import { IngestionError } from '@/lib/errors';

// Mock Playwright and Readability
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn(),
}));

jest.mock('jsdom', () => ({
  JSDOM: jest.fn(),
}));

import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

describe('ingestion/url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestUrl()', () => {
    it('should extract content from a valid URL', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);

      (JSDOM as jest.Mock).mockImplementation((html, opts) => ({
        window: {
          document: {
            title: 'Test Article',
            body: { innerText: 'Test content with enough words to pass validation test' },
          },
        },
      }));

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Test Article',
          content: '<p>Test content with enough words to pass validation test</p>',
          textContent: 'Test content with enough words to pass validation test',
          publishedTime: '2024-01-15T10:00:00Z',
        }),
      }));

      const result = await ingestUrl('https://example.com/article');

      expect(result.type).toBe('URL');
      expect(result.title).toBe('Test Article');
      expect(result.url).toBe('https://example.com/article');
      expect(result.content).toContain('Test content');
      // URL constructor normalizes URLs, so we check what was actually called
      const callArgs = (mockPage.goto as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toEqual({
        waitUntil: 'networkidle',
        timeout: 15000,
      });
    });

    it('should throw on invalid URL', async () => {
      await expect(ingestUrl('not a valid url')).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_URL',
        }),
      );
    });

    it('should throw on timeout', async () => {
      const mockBrowser = {
        newContext: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockContext = {
        newPage: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockPage = {
        goto: jest
          .fn()
          .mockRejectedValue(new Error('Navigation timeout of 15000 ms exceeded')),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);
      (mockBrowser.newContext as jest.Mock).mockResolvedValueOnce(mockContext);
      (mockContext.newPage as jest.Mock).mockResolvedValueOnce(mockPage);

      await expect(ingestUrl('https://example.com')).rejects.toThrow(
        expect.objectContaining({
          code: 'TIMEOUT',
        }),
      );
    });

    it('should throw on network error', async () => {
      const mockBrowser = {
        newContext: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockContext = {
        newPage: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockPage = {
        goto: jest.fn().mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED')),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);
      (mockBrowser.newContext as jest.Mock).mockResolvedValueOnce(mockContext);
      (mockContext.newPage as jest.Mock).mockResolvedValueOnce(mockPage);

      await expect(ingestUrl('https://nonexistent.invalid')).rejects.toThrow(
        expect.objectContaining({
          code: 'NETWORK_ERROR',
        }),
      );
    });

    it('should throw if no content extracted', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Empty</body></html>'),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);

      (JSDOM as jest.Mock).mockImplementation(() => ({
        window: {
          document: {
            title: 'Empty Page',
            body: { innerText: '' },
          },
        },
      }));

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));

      await expect(ingestUrl('https://example.com')).rejects.toThrow(
        expect.objectContaining({
          code: 'NO_CONTENT',
        }),
      );
    });

    it('should throw if content too short', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Short</body></html>'),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);

      (JSDOM as jest.Mock).mockImplementation(() => ({
        window: {
          document: {
            title: 'Short Page',
            body: { innerText: 'Too short' },
          },
        },
      }));

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Short Page',
          content: '<p>Too short</p>',
          textContent: 'Too short',
        }),
      }));

      await expect(ingestUrl('https://example.com')).rejects.toThrow(
        expect.objectContaining({
          code: 'INSUFFICIENT_CONTENT',
        }),
      );
    });

    it('should return correct type field', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);

      const longContent = 'Test content with enough words for validation '.repeat(3);
      (JSDOM as jest.Mock).mockImplementation(() => ({
        window: {
          document: {
            title: 'Test',
            body: { innerText: longContent },
          },
        },
      }));

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Test',
          content: `<p>${longContent}</p>`,
          textContent: longContent,
        }),
      }));

      const result = await ingestUrl('https://example.com');

      expect(result.type).toBe('URL');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('url');
    });

    it('should close browser on error', async () => {
      const mockBrowser = {
        newContext: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);
      (mockBrowser.newContext as jest.Mock).mockRejectedValueOnce(new Error('Browser error'));

      await expect(ingestUrl('https://example.com')).rejects.toThrow();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle publish date', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (chromium.launch as jest.Mock).mockResolvedValueOnce(mockBrowser);

      const longContent = 'Test content with enough words for validation '.repeat(3);
      (JSDOM as jest.Mock).mockImplementation(() => ({
        window: {
          document: {
            title: 'Test',
            body: { innerText: longContent },
          },
        },
      }));

      const publishDate = '2024-01-15T10:00:00Z';
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Test',
          content: `<p>${longContent}</p>`,
          textContent: longContent,
          publishedTime: publishDate,
        }),
      }));

      const result = await ingestUrl('https://example.com');

      expect(result.publishDate).toBe(publishDate);
    });
  });
});
