import {
  createSource,
  getSource,
  listSources,
  deleteSource,
  CreateSourceInput,
} from '@/storage/metadata';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    source: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('storage/metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSource()', () => {
    it('should create a new source', async () => {
      const input: CreateSourceInput = {
        type: 'URL',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
      };

      const mockSource = {
        id: 'src-123',
        type: 'URL' as const,
        title: 'Test Article',
        url: 'https://example.com',
        filePath: null,
        content: 'Test content',
        createdAt: new Date(),
        chunks: [],
      };

      (prisma.source.create as jest.Mock).mockResolvedValueOnce(mockSource);

      const result = await createSource(input);

      expect(result).toEqual(mockSource);
      expect(prisma.source.create).toHaveBeenCalledWith({
        data: input,
        include: { chunks: true },
      });
    });

    it('should create a PDF source', async () => {
      const input: CreateSourceInput = {
        type: 'PDF',
        title: 'Research Paper',
        filePath: '/uploads/paper.pdf',
        content: 'PDF content',
      };

      const mockSource = {
        id: 'src-pdf-123',
        ...input,
        url: null,
        createdAt: new Date(),
        chunks: [],
      };

      (prisma.source.create as jest.Mock).mockResolvedValueOnce(mockSource);

      const result = await createSource(input);

      expect(result.type).toBe('PDF');
      expect(result.filePath).toBe('/uploads/paper.pdf');
    });

    it('should throw on database error', async () => {
      const input: CreateSourceInput = {
        type: 'URL',
        title: 'Test',
        content: 'Test',
      };

      (prisma.source.create as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(createSource(input)).rejects.toThrow('Database error');
    });
  });

  describe('getSource()', () => {
    it('should retrieve a source by ID', async () => {
      const mockSource = {
        id: 'src-123',
        type: 'URL' as const,
        title: 'Test Article',
        url: 'https://example.com',
        filePath: null,
        content: 'Test content',
        createdAt: new Date(),
        chunks: [
          {
            id: 'chunk-1',
            sourceId: 'src-123',
            content: 'Chunk 1',
            chunkIndex: 0,
            pageNumber: null,
            embedding: null,
            createdAt: new Date(),
          },
        ],
      };

      (prisma.source.findUnique as jest.Mock).mockResolvedValueOnce(mockSource);

      const result = await getSource('src-123');

      expect(result).toEqual(mockSource);
      expect(prisma.source.findUnique).toHaveBeenCalledWith({
        where: { id: 'src-123' },
        include: { chunks: true },
      });
    });

    it('should return null if source not found', async () => {
      (prisma.source.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await getSource('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      (prisma.source.findUnique as jest.Mock).mockRejectedValueOnce(
        new Error('Query error'),
      );

      await expect(getSource('src-123')).rejects.toThrow('Query error');
    });
  });

  describe('listSources()', () => {
    it('should list all sources without filter', async () => {
      const mockSources = [
        {
          id: 'src-1',
          type: 'URL' as const,
          title: 'Article 1',
          url: 'https://example1.com',
          filePath: null,
          content: 'Content 1',
          createdAt: new Date('2024-01-01'),
          chunks: [],
        },
        {
          id: 'src-2',
          type: 'PDF' as const,
          title: 'Article 2',
          url: null,
          filePath: '/doc.pdf',
          content: 'Content 2',
          createdAt: new Date('2024-01-02'),
          chunks: [],
        },
      ];

      (prisma.source.findMany as jest.Mock).mockResolvedValueOnce(mockSources);

      const result = await listSources();

      expect(result).toEqual(mockSources);
      expect(prisma.source.findMany).toHaveBeenCalledWith({
        where: {},
        include: { chunks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by source type', async () => {
      const mockSources = [
        {
          id: 'src-1',
          type: 'URL' as const,
          title: 'Article',
          url: 'https://example.com',
          filePath: null,
          content: 'Content',
          createdAt: new Date(),
          chunks: [],
        },
      ];

      (prisma.source.findMany as jest.Mock).mockResolvedValueOnce(mockSources);

      const result = await listSources({ type: ['URL'] });

      expect(result).toEqual(mockSources);
      expect(prisma.source.findMany).toHaveBeenCalledWith({
        where: { type: { in: ['URL'] } },
        include: { chunks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      (prisma.source.findMany as jest.Mock).mockResolvedValueOnce([]);

      await listSources({ dateFrom, dateTo });

      expect(prisma.source.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: { chunks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by type and date range', async () => {
      const dateFrom = new Date('2024-01-01');

      (prisma.source.findMany as jest.Mock).mockResolvedValueOnce([]);

      await listSources({ type: ['PDF'], dateFrom });

      expect(prisma.source.findMany).toHaveBeenCalledWith({
        where: {
          type: { in: ['PDF'] },
          createdAt: {
            gte: dateFrom,
          },
        },
        include: { chunks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw on database error', async () => {
      (prisma.source.findMany as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(listSources()).rejects.toThrow('Database error');
    });
  });

  describe('deleteSource()', () => {
    it('should delete a source', async () => {
      const mockSource = {
        id: 'src-123',
        type: 'URL' as const,
        title: 'Test Article',
        url: 'https://example.com',
        filePath: null,
        content: 'Test content',
        createdAt: new Date(),
      };

      (prisma.source.delete as jest.Mock).mockResolvedValueOnce(mockSource);

      await deleteSource('src-123');

      expect(prisma.source.delete).toHaveBeenCalledWith({
        where: { id: 'src-123' },
      });
    });

    it('should throw on database error', async () => {
      (prisma.source.delete as jest.Mock).mockRejectedValueOnce(
        new Error('Not found'),
      );

      await expect(deleteSource('nonexistent')).rejects.toThrow('Not found');
    });

    it('should cascade delete associated chunks', async () => {
      // This is handled by the Prisma schema (onDelete: Cascade)
      // Test just verifies the delete call is made
      (prisma.source.delete as jest.Mock).mockResolvedValueOnce({
        id: 'src-123',
      });

      await deleteSource('src-123');

      expect(prisma.source.delete).toHaveBeenCalled();
    });
  });
});
