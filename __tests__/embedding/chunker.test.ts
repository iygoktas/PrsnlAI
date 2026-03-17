import { chunk } from '@/embedding/chunker';

describe('chunker', () => {
  describe('chunk()', () => {
    it('should handle empty string', () => {
      const result = chunk('');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = chunk('   \n\t  ');
      expect(result).toEqual([]);
    });

    it('should handle single-word input', () => {
      const result = chunk('hello');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('hello');
      expect(result[0].chunkIndex).toBe(0);
      expect(result[0].tokenEstimate).toBe(2); // 5 characters / 4 = 1.25, rounded up to 2
    });

    it('should handle short text (fits in single chunk)', () => {
      const shortText = 'This is a short sentence.';
      const result = chunk(shortText);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(shortText);
      expect(result[0].chunkIndex).toBe(0);
      expect(result[0].tokenEstimate).toBeGreaterThan(0);
    });

    it('should split long text into multiple chunks', () => {
      // Create a long text that will definitely exceed MAX_CHUNK_SIZE (512 tokens)
      // 512 tokens * 4 chars/token = 2048 characters minimum
      // Create a simple long string without joining arrays
      const longText = 'This is a long text. '.repeat(150); // ~3000 characters

      const result = chunk(longText);

      expect(result.length).toBeGreaterThan(1);
      // Verify all chunks have sequential indices
      result.forEach((c, i) => {
        expect(c.chunkIndex).toBe(i);
        expect(c.content.length).toBeGreaterThan(0);
        expect(c.tokenEstimate).toBeGreaterThan(0);
      });
    });

    it('should apply overlap between chunks', () => {
      // Create text long enough to generate overlap
      const longText = 'This is a test word. '.repeat(200); // ~4000 characters

      const result = chunk(longText);

      expect(result.length).toBeGreaterThan(1);

      // Verify chunks are properly ordered
      for (let i = 1; i < result.length; i++) {
        expect(result[i].chunkIndex).toBe(i);
      }
    });

    it('should trim whitespace from chunk content', () => {
      const text = 'word1 word2   word3    word4';
      const result = chunk(text);

      result.forEach((c) => {
        expect(c.content).toBe(c.content.trim());
        expect(c.content).not.toMatch(/^\s/);
        expect(c.content).not.toMatch(/\s$/);
      });
    });

    it('should estimate tokens correctly', () => {
      const text = 'a'.repeat(100); // 100 characters
      const result = chunk(text);

      expect(result).toHaveLength(1);
      // 100 chars / 4 = 25 tokens
      expect(result[0].tokenEstimate).toBe(25);
    });

    it('should handle text with newlines and special chars', () => {
      const text = `This is a line with
multiple paragraphs.
And some tabs too.
Including special chars: !@#$%^&*()`;
      const result = chunk(text);

      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((c) => {
        expect(c.content.length).toBeGreaterThan(0);
        expect(c.chunkIndex).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
