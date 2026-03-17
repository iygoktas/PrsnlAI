-- Change embedding vector dimension from 1536 to 768 for Ollama compatibility
-- Drop the old index first
DROP INDEX IF EXISTS "Chunk_embedding_idx";

-- Recreate the column with new dimension
ALTER TABLE "Chunk" DROP COLUMN "embedding";
ALTER TABLE "Chunk" ADD COLUMN "embedding" vector(768);

-- Recreate the index with the new dimension
CREATE INDEX ON "Chunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
