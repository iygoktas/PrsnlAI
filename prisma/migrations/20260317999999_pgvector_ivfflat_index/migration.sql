-- Create IVFFLAT index on Chunk.embedding for fast cosine similarity search.
-- This migration intentionally has a far-future timestamp so it always runs
-- AFTER the Chunk table is created (in T-004's migration).
-- lists = 100 is appropriate for up to ~100k vectors; switch to HNSW beyond that.
CREATE INDEX ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
