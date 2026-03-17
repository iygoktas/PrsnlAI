import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { IngestionError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Result of URL ingestion.
 */
export interface UrlIngestionResult {
  title: string;
  content: string;
  type: 'URL';
  url: string;
  publishDate?: string;
}

/**
 * Ingests content from a URL using Playwright and Readability.
 * @param urlString URL to ingest
 * @returns Extracted article content with metadata
 * @throws IngestionError on network failure, timeout, or invalid content
 */
export async function ingestUrl(urlString: string): Promise<UrlIngestionResult> {
  // Validate URL format
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new IngestionError(`Invalid URL: ${urlString}`, 'INVALID_URL');
  }

  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate with timeout
    try {
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 15000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('timeout')) {
        throw new IngestionError(`URL fetch timeout (15s): ${urlString}`, 'TIMEOUT');
      }
      throw new IngestionError(`Failed to navigate to URL: ${message}`, 'NETWORK_ERROR');
    }

    // Get page content
    const html = await page.content();

    // Close browser early to free resources
    await context.close();
    await browser.close();
    browser = null;

    // Parse HTML with Readability
    const dom = new JSDOM(html, { url: url.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      throw new IngestionError('No article content found on page', 'NO_CONTENT');
    }

    // Extract text from HTML
    const tempDom = new JSDOM(article.content);
    const textContent = tempDom.window.document.body.innerText || article.textContent || '';

    if (textContent.length < 50) {
      throw new IngestionError('Extracted content too short', 'INSUFFICIENT_CONTENT');
    }

    // Extract metadata
    const title = article.title || dom.window.document.title || 'Untitled';
    const publishDate = article.publishedTime || undefined;

    logger.info(`Extracted URL: "${title}" from ${url.hostname}`);

    return {
      title: title.substring(0, 50),
      content: textContent,
      type: 'URL',
      url: url.toString(),
      publishDate,
    };
  } catch (error) {
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }

    // Re-throw IngestionErrors
    if (error instanceof IngestionError) {
      throw error;
    }

    // Wrap other errors
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to ingest URL ${urlString}: ${message}`);
    throw new IngestionError(`Failed to ingest URL: ${message}`, 'UNKNOWN_ERROR');
  }
}
