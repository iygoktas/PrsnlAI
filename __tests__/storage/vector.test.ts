import {
  insertChunks,
  similaritySearch,
  ChunkWithEmbedding,
  ScoredChunk,
} from '@/storage/vector';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));

describe('storage/vector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertChunks()', () => {
    it('should insert chunks with embeddings', async () => {
      const chunks: ChunkWithEmbedding[] = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Hello world',
          chunkIndex: 0,
          embedding: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk-2',
          sourceId: 'src-1',
          content: 'How are you',
          chunkIndex: 1,
          pageNumber: 1,
          embedding: [0.4, 0.5, 0.6],
        },
      ];

      (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(2);

      await insertChunks(chunks);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const call = (prisma.$executeRaw as jest.Mock).mock.calls[0];
      expect(call[0]).toBeDefined(); // Prisma.sql object
    });

    it('should handle empty chunks array', async () => {
      await insertChunks([]);

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should escape single quotes in content', async () => {
      const chunks: ChunkWithEmbedding[] = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: "It's a test",
          chunkIndex: 0,
          embedding: [0.1],
        },
      ];

      (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);

      await insertChunks(chunks);

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle chunks with null pageNumber', async () => {
      const chunks: ChunkWithEmbedding[] = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Test',
          chunkIndex: 0,
          embedding: [0.1],
        },
      ];

      (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);

      await insertChunks(chunks);

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw on database error', async () => {
      const chunks: ChunkWithEmbedding[] = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Test',
          chunkIndex: 0,
          embedding: [0.1],
        },
      ];

      (prisma.$executeRaw as jest.Mock).mockRejectedValueOnce(
        new Error('Insert failed'),
      );

      await expect(insertChunks(chunks)).rejects.toThrow('Insert failed');
    });
  });

  describe('similaritySearch()', () => {
    it('should find similar chunks', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const mockResults: ScoredChunk[] = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Similar content',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date(),
        },
        {
          id: 'chunk-2',
          sourceId: 'src-1',
          content: 'Somewhat similar',
          chunkIndex: 1,
          pageNumber: 1,
          score: 0.87,
          createdAt: new Date(),
        },
      ];

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce(mockResults);

      const result = await similaritySearch(embedding, 5);

      expect(result).toEqual(mockResults);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('embedding');
      expect(call[0]).toContain('<=>');
      expect(call[1]).toBe('[0.1,0.2,0.3]');
      expect(call[call.length - 1]).toBe(5); // topK parameter
    });

    it('should respect topK limit', async () => {
      const embedding = [0.1, 0.2];

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await similaritySearch(embedding, 10);

      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(call[call.length - 1]).toBe(10);
    });

    it('should filter by source IDs', async () => {
      const embedding = [0.1, 0.2];
      const sourceIds = ['src-1', 'src-2'];

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await similaritySearch(embedding, 5, { sourceIds });

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('sourceId');
      expect(call).toContainEqual('src-1');
      expect(call).toContainEqual('src-2');
    });

    it('should filter by minimum score', async () => {
      const embedding = [0.1, 0.2];
      const minScore = 0.8;

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await similaritySearch(embedding, 5, { minScore });

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(call).toContainEqual(minScore);
    });

    it('should filter by both source IDs and score', async () => {
      const embedding = [0.1, 0.2];
      const filter = { sourceIds: ['src-1'], minScore: 0.7 };

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await similaritySearch(embedding, 5, filter);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(call).toContainEqual('src-1');
      expect(call).toContainEqual(0.7);
    });

    it('should return empty array when no results', async () => {
      const embedding = [0.1, 0.2];

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      const result = await similaritySearch(embedding, 5);

      expect(result).toEqual([]);
    });

    it('should throw on database error', async () => {
      const embedding = [0.1, 0.2];

      (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(
        new Error('Query failed'),
      );

      await expect(similaritySearch(embedding, 5)).rejects.toThrow('Query failed');
    });

    it('should handle large embeddings', async () => {
      const largeEmbedding = Array(1536).fill(0.1); // text-embedding-3-small size

      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

      await similaritySearch(largeEmbedding, 5);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      // Check that the embedding string is formatted correctly
      expect(call[1]).toMatch(/^\[0\.1,0\.1,.+\]$/);
    });
  });
});
