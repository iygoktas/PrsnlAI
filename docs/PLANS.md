# PLANS.md — Implementation Plans

---

## T-001: Scaffold Next.js 14 project

**Steps:**
1. Run `create-next-app` with TypeScript, App Router, Tailwind, and ESLint flags in the current directory
2. Verify the generated `tsconfig.json` has `strict: true` and the `@/` path alias
3. Verify `tailwind.config.ts` and `postcss.config.js` are present
4. Remove the default boilerplate from `src/app/page.tsx` and `src/app/globals.css`
5. Create the folder structure from ARCHITECTURE.md (`src/ingestion`, `src/embedding`, `src/storage`, `src/search`, `src/llm`, `src/lib`, `src/types`, `src/components`, `__tests__/`)

---

## T-002: Install and configure Prisma; connect to Supabase; create `.env.example`

**Steps:**
1. Prisma is already in `devDependencies`; run `npx prisma init` to generate `prisma/schema.prisma` (overwrite with correct datasource block)
2. Write `prisma/schema.prisma` with datasource referencing `DATABASE_URL` / `DIRECT_URL` and generator block (no models yet — T-004)
3. Create `src/lib/prisma.ts` — singleton Prisma client for use across the app
4. Write `.env.example` with all required variables documented (DATABASE_URL, DIRECT_URL, plus placeholders for upcoming tasks)
5. Write a test that verifies the schema file has the correct datasource provider and both URL env vars

---

## T-006: Write src/lib/logger.ts — Winston logger

**Steps:**
1. Install `winston` if not already present
2. Create logger with two transports: JSON format in production, colorized `printf` in development/test
3. Log level read from `config.LOG_LEVEL`
4. Write `__tests__/lib/logger.test.ts` — verify logger is created, has correct level, and correct format per NODE_ENV
5. Commit

---

## T-007: Write src/lib/errors.ts — custom error classes

**Steps:**
1. Define three custom error classes: `IngestionError`, `SearchError`, `EmbeddingError`
2. Each extends `Error` and adds a `code` field for error categorization
3. Constructor accepts `message` and optional `code` parameter (defaults to 'UNKNOWN')
4. Maintain standard Error prototype chain with proper `name` property
5. Write `__tests__/lib/errors.test.ts` — instantiate each, verify inheritance, check code field, test default code

---

## T-008: Configure Jest with ts-jest; set up @/ path alias

**Steps:**
1. Verify `jest.config.ts` has `preset: "ts-jest"` and `moduleNameMapper` for @/ alias
2. Verify `tsconfig.json` has `"strict": true` and `"paths": { "@/*": ["./src/*"] }`
3. Confirm all test files are discoverable via `testMatch` pattern
4. Run `npm test` to verify all tests pass with proper module resolution
5. Task is complete once all tests pass

---

## T-009: Configure .gitignore, ESLint, Prettier, and npm scripts

**Steps:**
1. Verify `.gitignore` contains: node_modules, .env, .next/, uploads/, and .claude/
2. Verify `package.json` has all required scripts: dev, build, start, lint, typecheck, test, db:migrate, db:seed
3. Verify `.eslintrc.json` extends next/core-web-vitals and next/typescript
4. Create `.prettierrc.json` with standard formatting rules (semi, singleQuote, trailingComma, printWidth, tabWidth)
5. All configuration files in place and consistent

---

## T-005: Write src/lib/config.ts — Zod-parsed env variables

**Steps:**
1. Define a Zod schema covering all variables in `.env.example` (DATABASE_URL, DIRECT_URL, provider flags, API keys, chunking constants, search constants, logging, NODE_ENV)
2. Parse `process.env` with the schema; throw a descriptive error on missing required variables at module load time
3. Export a typed `config` object — consumers import from `@/lib/config`
4. Write `__tests__/lib/config.test.ts` — test valid env, missing required fields (error thrown), and numeric coercions
5. Commit

---

## T-004: Write Source and Chunk models in prisma/schema.prisma; run db:migrate

**Steps:**
1. Add `Source`, `Chunk` models and `SourceType` enum to `prisma/schema.prisma` exactly as specified in ARCHITECTURE.md
2. Write `__tests__/prisma/schema.test.ts` — reads the schema file and asserts models, fields, and relations are present
3. Run `npm run db:migrate` to push schema to Supabase (requires `.env` with valid `DATABASE_URL`/`DIRECT_URL`)
4. Commit schema, test, and updated TASKS.md

---

## T-003: Add pgvector migration

**Steps:**
1. Create `prisma/migrations/20260317000000_enable_pgvector_extension/migration.sql` with `CREATE EXTENSION IF NOT EXISTS vector;`
2. Create `prisma/migrations/20260317999999_pgvector_ivfflat_index/migration.sql` with the `CREATE INDEX` statement — uses a far-future timestamp so it always runs after T-004's Chunk table migration
3. Write `__tests__/migrations/pgvector.test.ts` — verifies both migration files exist and contain the expected SQL keywords
4. Run tests; commit

---

## T-010: Write src/embedding/chunker.ts

**Steps:**
1. Create `src/embedding/chunker.ts` with a function that splits text into chunks based on `MAX_CHUNK_SIZE` and `CHUNK_OVERLAP` from config
2. Implement a simple token estimation (rough approximation: ~4 characters per token)
3. Return array of `{ content: string; chunkIndex: number; tokenEstimate: number }` for each chunk
4. Write `__tests__/embedding/chunker.test.ts` with tests for: short text, long text with overlap, empty string, single-word input
5. Run tests; if passing, commit with type `feat(embedding)`

---

## T-011: Write src/embedding/openai.ts

**Steps:**
1. Create `src/embedding/openai.ts` — export `embedWithOpenAI(texts: string[]): Promise<number[][]>`
2. Batch input in groups of 100; call OpenAI `embeddings.create` with model `text-embedding-3-small`
3. Implement exponential backoff for 429 rate-limit errors (up to 5 retries, starting at 1 s)
4. Throw `EmbeddingError` on non-retryable failures; require `OPENAI_API_KEY` via config
5. Write `__tests__/embedding/openai.test.ts` with mocked OpenAI client covering: successful batch, rate-limit retry, final failure after max retries

---

## T-012: Write src/embedding/local.ts

**Steps:**
1. Create `src/embedding/local.ts` — export `embedWithOllama(texts: string[]): Promise<number[][]>`
2. Call Ollama `/api/embeddings` endpoint with model from `OLLAMA_EMBEDDING_MODEL` config
3. Same interface as openai.ts (batch handling, error handling with `EmbeddingError`)
4. Handle Ollama connection errors gracefully (e.g., "Ollama server not running")
5. Write `__tests__/embedding/local.test.ts` with mocked fetch covering: successful embedding, connection error, invalid response

---

## T-013: Write src/embedding/index.ts

**Steps:**
1. Create `src/embedding/index.ts` — export `embed(texts: string[]): Promise<number[][]>`
2. Read `EMBEDDING_PROVIDER` from config (`openai` | `local`)
3. Import both `embedWithOpenAI` and `embedWithOllama`
4. Return calls to the appropriate provider based on config
5. Write `__tests__/embedding/index.test.ts` with mocked providers covering: openai provider, local provider, invalid provider

---

## T-014: Write src/storage/metadata.ts

**Steps:**
1. Create type definitions (CreateSourceInput, SourceFilter) in a new file or inline
2. Implement `createSource(data: CreateSourceInput): Promise<Source>` using Prisma create
3. Implement `getSource(id: string): Promise<Source | null>` using findUnique (include chunks)
4. Implement `listSources(filter?: SourceFilter): Promise<Source[]>` with type/date filtering (include chunks)
5. Implement `deleteSource(id: string): Promise<void>` using delete (cascading handled by Prisma relation)
6. Write `__tests__/storage/metadata.test.ts` with mocked Prisma client covering all four functions

---

## T-015: Write src/storage/vector.ts

**Steps:**
1. Create type definitions (ChunkWithEmbedding, ScoredChunk, VectorFilter)
2. Implement `insertChunks(chunks: ChunkWithEmbedding[]): Promise<void>` — batch insert using Prisma `$executeRaw` with vector format
3. Implement `similaritySearch(embedding: number[], topK: number, filter?: VectorFilter): Promise<ScoredChunk[]>` — use pgvector cosine distance `<=>` operator
4. Handle pgvector vector serialization (format embeddings as `[val1,val2,...]::vector`)
5. Write `__tests__/storage/vector.test.ts` with mocked `$executeRaw` and `$queryRaw` covering inserts, similarity search, and error cases

---

## T-016: Write src/storage/index.ts

**Steps:**
1. Create type definition for ChunkInput (content, chunkIndex, pageNumber)
2. Implement `saveDocument(source: CreateSourceInput, chunks: ChunkInput[], embeddings: number[][]): Promise<string>` orchestrator
3. Create source via metadata.createSource()
4. Pair chunks with embeddings and create ChunkWithEmbedding objects
5. Insert chunks+embeddings via vector.insertChunks(); on error, delete source and re-throw
6. Return sourceId
7. Write `__tests__/storage/index.test.ts` with mocked metadata/vector modules covering success, partial failures, and error recovery

---

## T-017: Write src/ingestion/text.ts

**Steps:**
1. Create type definition for IngestionResult (title, content, type)
2. Implement `ingestText(input: string): IngestionResult` function
3. Clean input: trim, remove extra whitespace, remove control characters
4. Generate title from first line (first 50 chars) or default to "Untitled"
5. Return `{ title, content: cleaned, type: 'TEXT' }`
6. Write `__tests__/ingestion/text.test.ts` covering: plain text, markdown, whitespace, empty input, control characters

---

## T-018: Write src/ingestion/pdf.ts

**Steps:**
1. Create type definition for PdfIngestionResult (title, content, type, pageCount)
2. Implement `ingestPdf(buffer: Buffer): Promise<PdfIngestionResult>` using pdf-parse library
3. Extract text while tracking page numbers; throw IngestionError if text extraction fails (scanned PDF)
4. Detect scanned PDFs: if less than 5% of expected text chars extracted, raise error
5. Combine all pages into single content string with page markers
6. Extract title from PDF metadata (name) or filename; default to "Untitled PDF"
7. Write `__tests__/ingestion/pdf.test.ts` with mocked pdf-parse covering: valid PDF, scanned PDF, corrupt PDF, extraction errors

---

## T-019: Write src/ingestion/url.ts

**Steps:**
1. Create type definition for UrlIngestionResult (title, content, type, url, publishDate)
2. Implement `ingestUrl(urlString: string): Promise<UrlIngestionResult>` with Playwright browser
3. Launch Playwright (browser, context, page) with 15s timeout; throw IngestionError on timeout/network failure
4. Use @mozilla/readability to extract article from page.content(); extract metadata (title, author, publish date)
5. Validate URL and extracted content (>50 chars); close browser; return result
6. Write `__tests__/ingestion/url.test.ts` with mocked Playwright covering: valid page, timeout, network error, no content

---

## T-020: Write src/ingestion/index.ts

**Steps:**
1. Create IngestionInput type (type: 'url'|'pdf'|'text', content|url|buffer, optional: title, file)
2. Create IngestionResult type (sourceId, chunksCreated, title, processingTimeMs)
3. Implement `ingest(input: IngestionInput): Promise<IngestionResult>` orchestrator
4. Route to ingestUrl/ingestPdf/ingestText based on input.type; merge results with metadata
5. Call chunker → embed → saveDocument pipeline; handle errors with cleanup
6. Write `__tests__/ingestion/index.test.ts` with mocked sub-modules covering: URL/PDF/text routing, full pipeline, error handling

---

## T-021: Write `src/llm/anthropic.ts`

**Steps:**
1. Create `src/llm/anthropic.ts` exporting `generateAnswer(query: string, sources: ScoredChunk[]): Promise<string>`
2. Instantiate Anthropic SDK client with `ANTHROPIC_API_KEY` from config
3. Build prompt using template from ARCHITECTURE.md with formatted sources (numbered [1], [2], etc.)
4. Format source dates (ISO 8601 to readable format) and titles in the prompt
5. Call `client.messages.create()` with model from config (`ANTHROPIC_MODEL`), throw `SearchError` on API failures
6. Write `__tests__/llm/anthropic.test.ts` with mocked Anthropic client covering: successful answer generation, API errors, no sources

---

## T-022: Write `src/llm/local.ts`

**Steps:**
1. Create `src/llm/local.ts` exporting `generateAnswerLocal(query: string, sources: ScoredChunk[]): Promise<string>`
2. Build same prompt format as anthropic.ts (sources with [1], [2], etc. citations)
3. Call Ollama `/api/chat` endpoint (base URL from `OLLAMA_BASE_URL` config) with model from `OLLAMA_LLM_MODEL`
4. Send request body: `{ model, messages: [{ role: 'user', content: prompt }], stream: false }`
5. Extract response text from JSON; throw `SearchError` on errors (connection, parsing, invalid response)
6. Write `__tests__/llm/local.test.ts` with mocked `fetch` covering: successful generation, connection error, invalid response

---

## T-023: Write `src/llm/index.ts`

**Steps:**
1. Create `src/llm/index.ts` exporting `generateAnswer(query: string, sources: ScoredChunk[]): Promise<string>`
2. Read `LLM_PROVIDER` from config (`'anthropic'` | `'local'`)
3. Import both `generateAnswer` from anthropic.ts and `generateAnswerLocal` from local.ts
4. Router function: if provider is `'anthropic'` call `generateAnswer()`, else if `'local'` call `generateAnswerLocal()`, else throw `SearchError`
5. Write `__tests__/llm/index.test.ts` with mocked sub-modules covering: anthropic provider, local provider, invalid provider

---

## T-024: Write `src/search/semantic.ts`

**Steps:**
1. Define `SearchResult` type: sourceId, title, url?, excerpt (chunk content), score, chunkIndex, pageNumber?
2. Define `SemanticSearchOptions`: filter by source type/date (optional), topK (default from config)
3. Implement `semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]>`
4. Call `embed([query])` to get embedding, then `similaritySearch()` from storage/vector with embedding + topK + filter
5. For each ScoredChunk result, call `getSource()` and merge title, url, type onto result to build SearchResult
6. Write `__tests__/search/semantic.test.ts` with mocked embed/similaritySearch/getSource covering: basic search, filters, no results, errors

---

## T-025: Write `src/search/rerank.ts`

**Steps:**
1. Import `SearchResult` from semantic.ts; read `SIMILARITY_THRESHOLD` from config
2. Implement `rerank(results: SearchResult[]): SearchResult[]` function
3. Filter: drop any result with score < SIMILARITY_THRESHOLD
4. Deduplicate: group by sourceId, keep max 2 chunks per source (highest scoring), flatten back to array
5. Sort: by score descending, so top results appear first
6. Write `__tests__/search/rerank.test.ts` with tests covering: threshold filtering, per-source deduplication, sorting, edge cases

---

## T-026: Write `src/search/index.ts`

**Steps:**
1. Define `SearchOptions` type (query, limit?, filters?); define `SearchResponse` type (answer, sources: SearchResult[])
2. Implement `search(query: string, options?: SearchOptions): Promise<SearchResponse>` orchestrator
3. Call `semanticSearch(query, options.filters)` to get initial results
4. Call `rerank(results)` to filter, deduplicate, sort
5. Call `generateAnswer(query, reranked)` to get LLM-generated answer with citations
6. Return `{ answer, sources: reranked }`; throw `SearchError` on failures
7. Write `__tests__/search/index.test.ts` with mocked sub-modules covering: full pipeline, empty results, LLM failures

---

## T-027: Write `src/app/api/ingest/route.ts`

**Steps:**
1. Create route handler for `POST /api/ingest`; define Zod schema for request validation (type, content|file, title?)
2. Parse request body; validate with Zod; return 400 if invalid
3. Build `IngestionInput` object; call `ingest()` from ingestion index
4. Map error codes to HTTP status: PARSE_ERROR/validation errors → 422, others → 500; return error JSON
5. Return 200 with `{ sourceId, chunksCreated, title, processingTimeMs }`
6. Write `__tests__/api/ingest.test.ts` with mocked ingest() covering: successful ingest, validation errors, parse errors, storage errors

---

## T-028: Write `src/app/api/search/route.ts`

**Steps:**
1. Create route handler for `POST /api/search`; define Zod schema (query: string, limit?: number, filter?: { type?: SourceType[], dateFrom?: ISO8601, dateTo?: ISO8601 })
2. Parse and validate request body with Zod; return 400 if invalid
3. Convert dateFrom/dateTo from ISO 8601 strings to Date objects; build SearchOptions
4. Call `search(query, options)` from search/index; return 200 with `{ answer, sources }`
5. Map SearchError code to HTTP status: return 422 for search failures, 500 for others
6. Write `__tests__/api/search.test.ts` with mocked search() covering: successful search, validation errors, empty results, search failures

---

## T-029: Write `src/app/layout.tsx`

**Steps:**
1. Create root layout component (RootLayout) that wraps all pages; export metadata with title, description, viewport
2. Import Tailwind base styles (`globals.css`); set up font via next/font (e.g., Geist Sans for clean UI)
3. Configure theme: dark mode via `dark:` Tailwind classes, sensible color palette
4. Build HTML structure: `<html>`, `<body>` with Tailwind utilities (max-width container, padding, dark background)
5. Render `{children}` slot for page-specific content; no tests needed for layout

---

## T-030: Write `SearchBar.tsx`

**Steps:**
1. Create `src/components/SearchBar.tsx` as a client component (use 'use client' directive)
2. Define `SearchBarProps` type: `query: string; loading?: boolean; onSubmit: (query: string) => void`
3. Implement controlled input: state tracks user typing, submit fires onSubmit callback on Enter key or button click
4. Add loading spinner (simple CSS spinner or text indicator) that displays when loading is true
5. Write `__tests__/components/SearchBar.test.tsx` with tests covering: render, input changes, submit on Enter, submit on button click, loading state display



