import { ingestText } from '@/ingestion/text';

describe('ingestion/text', () => {
  describe('ingestText()', () => {
    it('should handle plain text', () => {
      const input = 'This is a simple text document.';
      const result = ingestText(input);

      expect(result.type).toBe('TEXT');
      expect(result.title).toBe('This is a simple text document.');
      expect(result.content).toBe('This is a simple text document.');
    });

    it('should handle multiline text', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = ingestText(input);

      expect(result.title).toBe('Line 1');
      expect(result.content).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should extract title from first line', () => {
      const input = 'This is my document title\n\nAnd here is the body.';
      const result = ingestText(input);

      expect(result.title).toBe('This is my document title');
      expect(result.content).toContain('This is my document title');
      expect(result.content).toContain('And here is the body.');
    });

    it('should truncate long titles to 50 chars', () => {
      const longTitle = 'A'.repeat(60);
      const input = longTitle + '\nBody content';
      const result = ingestText(input);

      expect(result.title).toBe('A'.repeat(50) + '...');
      expect(result.title.length).toBe(53); // 50 chars + '...'
    });

    it('should clean multiple spaces', () => {
      const input = 'Text   with    multiple     spaces';
      const result = ingestText(input);

      expect(result.content).toBe('Text with multiple spaces');
    });

    it('should preserve single spaces', () => {
      const input = 'One two three four';
      const result = ingestText(input);

      expect(result.content).toBe('One two three four');
    });

    it('should remove control characters', () => {
      const input = 'Text \x00 with \x01 control \x02 characters';
      const result = ingestText(input);

      // Control characters removed, extra spaces normalized
      expect(result.content).toBe('Text with control characters');
      expect(result.content).not.toContain('\x00');
      expect(result.content).not.toContain('\x01');
      expect(result.content).not.toContain('\x02');
    });

    it('should handle tabs', () => {
      const input = 'Text\twith\ttabs';
      const result = ingestText(input);

      expect(result.content).toBe('Text with tabs');
    });

    it('should handle empty lines and trim', () => {
      const input = '  Line 1  \n\n  Line 2  \n\n  Line 3  ';
      const result = ingestText(input);

      expect(result.content).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle Markdown content', () => {
      const input = '# Heading\n\n## Subheading\n\nParagraph with **bold** and *italic*.';
      const result = ingestText(input);

      expect(result.title).toBe('# Heading');
      expect(result.content).toContain('# Heading');
      expect(result.content).toContain('## Subheading');
      expect(result.content).toContain('bold');
    });

    it('should handle empty string', () => {
      const result = ingestText('');

      expect(result.type).toBe('TEXT');
      expect(result.title).toBe('Untitled');
      expect(result.content).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const result = ingestText('   \n\n   \t\t  ');

      expect(result.title).toBe('Untitled');
      expect(result.content).toBe('');
    });

    it('should handle null or non-string input gracefully', () => {
      const result1 = ingestText(null as any);
      expect(result1.title).toBe('Untitled');
      expect(result1.content).toBe('');

      const result2 = ingestText(undefined as any);
      expect(result2.title).toBe('Untitled');
      expect(result2.content).toBe('');
    });

    it('should preserve newlines within content', () => {
      const input = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const result = ingestText(input);

      const lines = result.content.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle mixed whitespace', () => {
      const input = '  Leading  spaces  \n\t  Mixed  tabs\t \n  Trailing  ';
      const result = ingestText(input);

      const lines = result.content.split('\n');
      expect(lines.every((line) => line === line.trim())).toBe(true);
    });

    it('should return correct type field', () => {
      const result = ingestText('any content');

      expect(result.type).toBe('TEXT');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
    });
  });
});
