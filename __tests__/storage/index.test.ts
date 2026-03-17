// Mock modules before importing the module under test
jest.mock('@/storage/metadata', () => ({
  createSource: jest.fn(),
  deleteSource: jest.fn(),
}));

jest.mock('@/storage/vector', () => ({
  insertChunks: jest.fn(),
}));

import { saveDocument, ChunkInput } from '@/storage/index';
import * as metadata from '@/storage/metadata';
import * as vector from '@/storage/vector';

const mockMetadata = metadata as jest.Mocked<typeof metadata>;
const mockVector = vector as jest.Mocked<typeof vector>;

describe('storage/index (orchestration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveDocument()', () => {
    it('should save a complete document with chunks and embeddings', async () => {
      const source = {
        type: 'URL' as const,
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
      };

      const chunks: ChunkInput[] = [
        { content: 'Chunk 1 content', chunkIndex: 0 },
        { content: 'Chunk 2 content', chunkIndex: 1, pageNumber: 1 },
      ];

      const embeddings = [[0.1, 0.2], [0.3, 0.4]];

      mockMetadata.createSource.mockResolvedValueOnce({
        id: 'src-123',
        type: 'URL',
        title: 'Test Article',
        url: 'https://example.com',
        filePath: null,
        content: 'Test content',
        createdAt: new Date(),
        chunks: [],
      } as any);

      mockVector.insertChunks.mockResolvedValueOnce(undefined);

      const result = await saveDocument(source, chunks, embeddings);

      expect(result).toBe('src-123');
      expect(mockMetadata.createSource).toHaveBeenCalledWith(source);
      expect(mockVector.insertChunks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'src-123-chunk-0',
            sourceId: 'src-123',
            content: 'Chunk 1 content',
            chunkIndex: 0,
            embedding: [0.1, 0.2],
          }),
          expect.objectContaining({
            id: 'src-123-chunk-1',
            sourceId: 'src-123',
            content: 'Chunk 2 content',
            chunkIndex: 1,
            pageNumber: 1,
            embedding: [0.3, 0.4],
          }),
        ]),
      );
    });

    it('should throw if chunk and embedding counts do not match', async () => {
      const source = {
        type: 'URL' as const,
        title: 'Test',
        content: 'Test',
      };

      const chunks: ChunkInput[] = [
        { content: 'Chunk 1', chunkIndex: 0 },
        { content: 'Chunk 2', chunkIndex: 1 },
      ];

      const embeddings = [[0.1, 0.2]]; // Only 1 embedding for 2 chunks

      await expect(saveDocument(source, chunks, embeddings)).rejects.toThrow(
        /Chunk count mismatch/,
      );
      expect(mockMetadata.createSource).not.toHaveBeenCalled();
    });

    it('should fail if source creation fails', async () => {
      const source = {
        type: 'PDF' as const,
        title: 'Test PDF',
        filePath: '/test.pdf',
        content: 'Test',
      };

      const chunks: ChunkInput[] = [{ content: 'Chunk 1', chunkIndex: 0 }];
      const embeddings = [[0.1, 0.2]];

      mockMetadata.createSource.mockRejectedValueOnce(new Error('DB error'));

      await expect(saveDocument(source, chunks, embeddings)).rejects.toThrow('DB error');
      expect(mockVector.insertChunks).not.toHaveBeenCalled();
    });

    it('should rollback source on chunk insertion failure', async () => {
      const source = {
        type: 'TEXT' as const,
        title: 'Test Text',
        content: 'Test content',
      };

      const chunks: ChunkInput[] = [{ content: 'Chunk 1', chunkIndex: 0 }];
      const embeddings = [[0.1]];

      mockMetadata.createSource.mockResolvedValueOnce({
        id: 'src-456',
        type: 'TEXT',
        title: 'Test Text',
        url: null,
        filePath: null,
        content: 'Test content',
        createdAt: new Date(),
        chunks: [],
      } as any);

      mockVector.insertChunks.mockRejectedValueOnce(
        new Error('Embedding failed'),
      );

      mockMetadata.deleteSource.mockResolvedValueOnce(undefined);

      await expect(saveDocument(source, chunks, embeddings)).rejects.toThrow(
        'Embedding failed',
      );

      expect(mockMetadata.deleteSource).toHaveBeenCalledWith('src-456');
    });

    it('should handle rollback errors gracefully', async () => {
      const source = {
        type: 'URL' as const,
        title: 'Test',
        content: 'Test',
      };

      const chunks: ChunkInput[] = [{ content: 'Chunk 1', chunkIndex: 0 }];
      const embeddings = [[0.1]];

      mockMetadata.createSource.mockResolvedValueOnce({
        id: 'src-789',
        type: 'URL',
        title: 'Test',
        url: null,
        filePath: null,
        content: 'Test',
        createdAt: new Date(),
        chunks: [],
      } as any);

      mockVector.insertChunks.mockRejectedValueOnce(
        new Error('Embedding failed'),
      );

      mockMetadata.deleteSource.mockRejectedValueOnce(
        new Error('Delete failed'),
      );

      // Should still throw the original error, not the rollback error
      await expect(saveDocument(source, chunks, embeddings)).rejects.toThrow(
        'Embedding failed',
      );

      expect(mockMetadata.deleteSource).toHaveBeenCalledWith('src-789');
    });

    it('should handle empty chunk list', async () => {
      const source = {
        type: 'TEXT' as const,
        title: 'Empty Document',
        content: 'No chunks',
      };

      const chunks: ChunkInput[] = [];
      const embeddings: number[][] = [];

      mockMetadata.createSource.mockResolvedValueOnce({
        id: 'src-empty',
        type: 'TEXT',
        title: 'Empty Document',
        url: null,
        filePath: null,
        content: 'No chunks',
        createdAt: new Date(),
        chunks: [],
      } as any);

      mockVector.insertChunks.mockResolvedValueOnce(undefined);

      const result = await saveDocument(source, chunks, embeddings);

      expect(result).toBe('src-empty');
      expect(mockVector.insertChunks).toHaveBeenCalledWith([]);
    });

    it('should pass through chunk IDs in order', async () => {
      const source = {
        type: 'URL' as const,
        title: 'Test',
        content: 'Test',
      };

      const chunks: ChunkInput[] = [
        { content: 'C1', chunkIndex: 0 },
        { content: 'C2', chunkIndex: 1 },
        { content: 'C3', chunkIndex: 2 },
      ];

      const embeddings = [[0.1], [0.2], [0.3]];

      mockMetadata.createSource.mockResolvedValueOnce({
        id: 'src-order',
        type: 'URL',
        title: 'Test',
        url: null,
        filePath: null,
        content: 'Test',
        createdAt: new Date(),
        chunks: [],
      } as any);

      mockVector.insertChunks.mockResolvedValueOnce(undefined);

      await saveDocument(source, chunks, embeddings);

      const insertedChunks = (mockVector.insertChunks as jest.Mock).mock.calls[0][0];
      expect(insertedChunks[0].id).toBe('src-order-chunk-0');
      expect(insertedChunks[1].id).toBe('src-order-chunk-1');
      expect(insertedChunks[2].id).toBe('src-order-chunk-2');
    });
  });
});
