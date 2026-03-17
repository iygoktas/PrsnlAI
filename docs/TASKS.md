# TASKS.md — Task List

> Claude: mark each task [x] and commit when done. Do not reorder tasks.

---

## Phase 0 — Project setup

- [x] **T-001** Scaffold Next.js 14 project (TypeScript, App Router, Tailwind, ESLint)
- [x] **T-002** Install and configure Prisma; connect to Supabase via `DATABASE_URL` and `DIRECT_URL`; create `.env.example`
- [x] **T-003** Add pgvector migration: create a Prisma migration file that runs `CREATE EXTENSION IF NOT EXISTS vector` and the IVFFLAT index
- [x] **T-004** Write `Source` and `Chunk` models in `prisma/schema.prisma` exactly as defined in ARCHITECTURE.md; run `npm run db:migrate`
- [x] **T-005** Write `src/lib/config.ts` — parse all env variables with Zod, export typed config object; throw on missing required variables at startup
- [x] **T-006** Write `src/lib/logger.ts` — Winston logger; log level from `config.LOG_LEVEL`; JSON format in production, pretty in development
- [x] **T-007** Write `src/lib/errors.ts` — `IngestionError`, `SearchError`, `EmbeddingError` custom classes extending `Error` with a `code` field
- [x] **T-008** Configure Jest with `ts-jest`; set up `@/` path alias in both `tsconfig.json` and `jest.config.ts`
- [x] **T-009** Write `.gitignore` (node_modules, .env, uploads/, .next/); configure ESLint and Prettier; add all scripts to `package.json`

---

## Phase 1 — Embedding infrastructure

- [x] **T-010** Write `src/embedding/chunker.ts`
  - Accepts a string, returns `Array<{ content: string; chunkIndex: number; tokenEstimate: number }>`
  - Uses `MAX_CHUNK_SIZE` and `CHUNK_OVERLAP` from config
  - Write unit tests: short text, long text, empty string, single-word input

- [x] **T-011** Write `src/embedding/openai.ts`
  - Uses `text-embedding-3-small`
  - Accepts `string[]`, returns `number[][]`
  - Batches in groups of 100 to stay within API limits
  - Exponential backoff on rate limit errors (429)
  - Unit tests with mocked OpenAI client

- [x] **T-012** Write `src/embedding/local.ts`
  - Calls Ollama `/api/embeddings` with `OLLAMA_EMBEDDING_MODEL` from config
  - Same interface as openai.ts
  - Unit tests with mocked `fetch`

- [x] **T-013** Write `src/embedding/index.ts`
  - Reads `EMBEDDING_PROVIDER` from config
  - Exports `embed(texts: string[]): Promise<number[][]>`

---

## Phase 2 — Storage layer

- [x] **T-014** Write `src/storage/metadata.ts`
  - `createSource(data: CreateSourceInput): Promise<Source>`
  - `getSource(id: string): Promise<Source | null>`
  - `listSources(filter?: SourceFilter): Promise<Source[]>`
  - `deleteSource(id: string): Promise<void>` — cascades to chunks via Prisma relation
  - Unit tests with mocked Prisma client

- [x] **T-015** Write `src/storage/vector.ts`
  - `insertChunks(chunks: ChunkWithEmbedding[]): Promise<void>` — uses Prisma `$executeRaw` for the vector column
  - `similaritySearch(embedding: number[], topK: number, filter?: VectorFilter): Promise<ScoredChunk[]>`
    ```sql
    SELECT c.*, 1 - (c.embedding <=> $1::vector) AS score
    FROM "Chunk" c
    JOIN "Source" s ON c."sourceId" = s.id
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
    ```
  - Unit tests with mocked `$queryRaw`

- [x] **T-016** Write `src/storage/index.ts`
  - `saveDocument(source: CreateSourceInput, chunks: Chunk[], embeddings: number[][]): Promise<string>` — returns sourceId
  - Wraps metadata + vector inserts in a logical transaction (delete source on failure)

---

## Phase 3 — Ingestion pipelines

- [x] **T-017** Write `src/ingestion/text.ts`
  - Accepts plain text or Markdown string
  - Cleans whitespace and control characters
  - Returns `{ title: string; content: string; type: 'TEXT' }`
  - Unit tests

- [x] **T-018** Write `src/ingestion/pdf.ts`
  - Accepts a `Buffer` (file upload)
  - Uses `pdf-parse` to extract text
  - Preserves page number per chunk (split by page break, then chunk within page)
  - Logs and throws `IngestionError` for scanned-only or corrupt PDFs
  - Unit tests with a real small PDF fixture

- [x] **T-019** Write `src/ingestion/url.ts`
  - Launches Playwright in headless mode
  - Navigates to URL; timeout: 15 seconds
  - Runs `@mozilla/readability` on the DOM to extract article content
  - Extracts title, author, publish date from metadata
  - Closes browser; throws `IngestionError` with reason on failure
  - Integration test against `https://example.com`

- [x] **T-020** Write `src/ingestion/index.ts`
  - `ingest(input: IngestionInput): Promise<IngestionResult>` factory
  - Routes to correct parser based on `input.type`
  - Calls `chunker` → `embed` → `saveDocument` pipeline

---

## Phase 4 — LLM layer

- [x] **T-021** Write `src/llm/anthropic.ts`
  - Uses `@anthropic-ai/sdk`
  - `generateAnswer(query: string, sources: ScoredChunk[]): Promise<string>`
  - Uses prompt template from ARCHITECTURE.md
  - Model: `claude-haiku-4-5-20251001` (from config)
  - Unit tests with mocked Anthropic client

- [x] **T-022** Write `src/llm/local.ts`
  - Calls Ollama `/api/chat` with `OLLAMA_LLM_MODEL` from config
  - Same interface as anthropic.ts
  - Unit tests with mocked `fetch`

- [x] **T-023** Write `src/llm/index.ts`
  - Reads `LLM_PROVIDER` from config
  - Exports `generateAnswer(query: string, sources: ScoredChunk[]): Promise<string>`

---

## Phase 5 — Search layer

- [x] **T-024** Write `src/search/semantic.ts`
  - Embeds the query string
  - Calls `similaritySearch` with topK from config
  - Joins source metadata onto results
  - Returns `SearchResult[]`
  - Unit tests

- [x] **T-025** Write `src/search/rerank.ts`
  - Drops results below `SIMILARITY_THRESHOLD` (from config)
  - Keeps max 2 chunks per source (pick highest-scoring ones)
  - Sorts by score descending

- [x] **T-026** Write `src/search/index.ts`
  - `search(query: string, options?: SearchOptions): Promise<SearchResponse>`
  - Calls semantic → rerank → generateAnswer
  - Returns `{ answer, sources }`

---

## Phase 6 — API routes

- [x] **T-027** Write `src/app/api/ingest/route.ts`
  - `POST /api/ingest`
  - Validate request with Zod (matches schema in ARCHITECTURE.md)
  - Call `ingest()` from ingestion index
  - Return `{ sourceId, chunksCreated, title, processingTimeMs }`
  - Return correct HTTP status on each error type (400, 422, 500)
  - Integration tests

- [x] **T-028** Write `src/app/api/search/route.ts`
  - `POST /api/search`
  - Validate request with Zod
  - Call `search()` from search index
  - Return `{ answer, sources }`
  - Integration tests

---

## Phase 7 — UI

- [x] **T-029** Write `src/app/layout.tsx` — Tailwind base layout, metadata, font setup
- [x] **T-030** Write `SearchBar.tsx` — controlled input, loading spinner, keyboard submit (Enter)
- [x] **T-031** Write `SearchResults.tsx` — answer text block + source cards below
- [x] **T-032** Write `SourceBadge.tsx` — type icon, domain name, formatted date, similarity score
- [x] **T-033** Write `AddContentForm.tsx` — tabbed form (URL / Text / PDF), progress indicator, success/error toast
- [x] **T-034** Write `src/app/page.tsx` — compose SearchBar + SearchResults; fetch from `/api/search`
- [x] **T-035** Write `src/app/add/page.tsx` — compose AddContentForm; POST to `/api/ingest`

---

## Phase 8 — QA and documentation

- [x] **T-036** End-to-end test: add a URL → search for content from that URL → verify source appears in top 3
- [x] **T-037** End-to-end test: upload a PDF → ask a question about its content → verify correct page number in result
- [x] **T-038** Performance test: index 100 documents → measure search latency → must be under 500 ms
- [x] **T-039** Write `README.md`: prerequisites, setup steps (Supabase project, env vars, `npm run db:migrate`), first run, usage examples with screenshots

---

## Backlog (post-MVP)

- [ ] **B-001** Twitter/X thread ingestion via URL
- [ ] **B-002** Chrome browser extension (one-click save current tab)
- [ ] **B-003** Automatic connection discovery (when a new item is added, find related existing items)
- [ ] **B-004** Topic-based summary view ("summarize everything I've saved about RAG")
- [ ] **B-005** Authentication with NextAuth.js (Google OAuth)
- [ ] **B-006** Bulk import: Pocket export, Instapaper export, OPML feeds
