/**
 * Ingestion result for text/Markdown content.
 */
export interface TextIngestionResult {
  title: string;
  content: string;
  type: 'TEXT';
}

/**
 * Ingests plain text or Markdown content.
 * Cleans whitespace and control characters, and extracts a title.
 * @param input Raw text or Markdown string
 * @returns Cleaned content with extracted title and type
 */
export function ingestText(input: string): TextIngestionResult {
  if (!input || typeof input !== 'string') {
    return {
      title: 'Untitled',
      content: '',
      type: 'TEXT',
    };
  }

  // Remove control characters but preserve newlines and tabs
  const cleaned = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace: collapse multiple spaces, trim each line
  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  // Extract title from first non-empty line
  const firstLine = lines[0] || '';
  const title = firstLine.length > 0
    ? firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '')
    : 'Untitled';

  // Rejoin content with newlines
  const content = lines.join('\n');

  return {
    title,
    content,
    type: 'TEXT',
  };
}
