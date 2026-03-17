# ARCHITECTURE.md — Technical Architecture

## Stack decisions

### Frontend
- **Next.js 14** (App Router) — SSR, API routes, and UI all in one project
- **TypeScript strict** — catch errors at compile time, not runtime
- **Tailwind CSS** — fast styling, no component library overhead
- **shadcn/ui** — base components (Button, Input, Card, Tabs)

### Backend (Next.js API Routes)
- **Node.js** — consistent with TypeScript frontend
- **Prisma** — ORM, migration management, type-safe DB access

### Database
- **Supabase (PostgreSQL + pgvector)** — hosted Postgres with vector extension built in
  - Why Supabase over local Postgres: zero local setup, free tier is enough for personal use (500 MB), pgvector pre-installed, easy to inspect data via Supabase dashboard
  - Why pgvector over Pinecone/Weaviate: no separate service, standard SQL backups, good enough for up to ~100k documents
  - Connection: via `DATABASE_URL` (Supabase connection string with `?pgbouncer=true` for serverless)

### Embedding
- **Primary**: `text-embedding-3-small` (OpenAI) — 1536 dimensions, cheap ($0.02/1M tokens)
- **Fallback**: `nomic-embed-text` via Ollama — fully local, free
- **Switching**: controlled by `EMBEDDING_PROVIDER` env variable (`openai` | `local`)

### LLM (for answer generation)
- **Primary**: Anthropic API — `claude-haiku-4-5-20251001`
  - Why Haiku: RAG answer generation is a simple task (summarize + cite), Haiku handles it well at 10x lower cost than Sonnet
  - Why Anthropic API directly: full control over prompt, streaming support, no wrapper overhead
- **Fallback**: `llama3.2` via Ollama
- **Switching**: controlled by `LLM_PROVIDER` env variable (`anthropic` | `local`)

### Ingestion
- **Web scraping**: Playwright — more stable than Puppeteer, better auto-wait
- **PDF parsing**: `pdf-parse` (Node.js) — good enough for text-based PDFs, same language as the rest of the stack
- **HTML cleaning**: `@mozilla/readability` — strips nav, ads, footers; extracts article body

### Chunking strategy
```
Chunk size:  512 tokens
Overlap:      64 tokens
Metadata per chunk: source_id, chunk_index, page_number (PDFs only)
```

---

## Database schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // required by Supabase for migrations
}

model Source {
  id        String     @id @default(cuid())
  type      SourceType
  title     String
  url       String?
  filePath  String?
  content   String     // raw text for full-text fallback
  createdAt DateTime   @default(now())
  chunks    Chunk[]
}

model Chunk {
  id          String                      @id @default(cuid())
  sourceId    String
  source      Source                      @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  content     String
  chunkIndex  Int
  pageNumber  Int?
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime                    @default(now())
}

enum SourceType {
  URL
  PDF
  TEXT
  TWEET
}
```

Supabase migration for pgvector (run once via Supabase SQL editor or migration file):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Full folder structure

```
personal-ai-kb/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   └── PLANS.md              ← Claude writes implementation plans here
├── .claude/
│   └── commands/
│       ├── ship.md           ← /ship command
│       ├── status.md         ← /status command
│       └── review.md         ← /review command
├── src/
│   ├── ingestion/
│   │   ├── url.ts            ← Playwright scraper + Readability
│   │   ├── pdf.ts            ← pdf-parse wrapper
│   │   ├── text.ts           ← Plain text / Markdown handler
│   │   └── index.ts          ← Ingestion factory (routes by type)
│   ├── embedding/
│   │   ├── openai.ts         ← OpenAI embedding provider
│   │   ├── local.ts          ← Ollama embedding provider
│   │   ├── chunker.ts        ← Text chunking logic
│   │   └── index.ts          ← Provider selector
│   ├── storage/
│   │   ├── vector.ts         ← pgvector operations (insert, similarity search)
│   │   ├── metadata.ts       ← Prisma CRUD for Source and Chunk
│   │   └── index.ts          ← saveDocument() — combines both
│   ├── search/
│   │   ├── semantic.ts       ← Embed query → vector search → join metadata
│   │   ├── rerank.ts         ← Score threshold, deduplicate by source
│   │   └── index.ts          ← search() public interface
│   ├── llm/
│   │   ├── anthropic.ts      ← Anthropic SDK wrapper (generate answer + stream)
│   │   ├── local.ts          ← Ollama LLM wrapper
│   │   └── index.ts          ← Provider selector
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest/
│   │   │   │   └── route.ts  ← POST /api/ingest
│   │   │   └── search/
│   │   │       └── route.ts  ← POST /api/search
│   │   ├── page.tsx          ← Home page (search)
│   │   ├── add/
│   │   │   └── page.tsx      ← Add content page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   ├── AddContentForm.tsx
│   │   └── SourceBadge.tsx
│   ├── lib/
│   │   ├── logger.ts         ← Winston logger (level from env)
│   │   ├── config.ts         ← Zod-parsed env variables
│   │   └── errors.ts         ← IngestionError, SearchError, EmbeddingError
│   └── types/
│       ├── ingestion.ts
│       ├── search.ts
│       └── storage.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── __tests__/
│   ├── ingestion/
│   ├── embedding/
│   ├── search/
│   └── api/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── jest.config.ts
```

---

## API design

### POST /api/ingest
```typescript
// Request body
{
  type: "url" | "pdf" | "text",
  content: string,    // URL string, plain text, or Markdown
  title?: string,     // optional title override
  file?: File         // multipart, for PDF uploads
}

// Response
{
  sourceId: string,
  chunksCreated: number,
  title: string,
  processingTimeMs: number
}

// Error responses
400 — missing or invalid fields
422 — content could not be parsed (bad PDF, blocked URL, etc.)
500 — internal error (DB write failed, embedding API down)
```

### POST /api/search
```typescript
// Request body
{
  query: string,
  limit?: number,      // default: 5
  filter?: {
    type?: SourceType[],
    dateFrom?: string, // ISO 8601
    dateTo?: string
  }
}

// Response
{
  answer: string,      // LLM-generated answer with inline citations
  sources: Array<{
    sourceId: string,
    title: string,
    url?: string,
    excerpt: string,   // the chunk text used
    score: number,     // cosine similarity (0–1)
    chunkIndex: number,
    pageNumber?: number
  }>
}
```

### LLM prompt template (in `src/llm/anthropic.ts`)
```
You are a personal knowledge assistant. Answer the user's question using only
the provided source excerpts. Cite sources inline as [1], [2], etc.
If the answer is not in the sources, say so — do not make up information.

Sources:
{{#each sources}}
[{{index}}] {{title}} ({{date}})
{{excerpt}}
{{/each}}

Question: {{query}}
```

---

## Approved packages

Add any package outside this list to docs/DECISIONS.md first:

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "@prisma/client": "latest",
    "@anthropic-ai/sdk": "latest",
    "openai": "latest",
    "playwright": "latest",
    "pdf-parse": "latest",
    "@mozilla/readability": "latest",
    "jsdom": "latest",
    "winston": "latest",
    "zod": "latest",
    "tailwindcss": "latest",
    "@shadcn/ui": "latest"
  },
  "devDependencies": {
    "prisma": "latest",
    "jest": "latest",
    "@types/jest": "latest",
    "ts-jest": "latest",
    "eslint": "latest"
  }
}
```

---

## Environment variables

See `.env.example` for the full list with descriptions.

---

## Performance targets

| Operation | Target |
|-----------|--------|
| URL ingestion | < 10 seconds |
| PDF ingestion (10 pages) | < 15 seconds |
| Semantic search (100 docs) | < 500 ms |
| Semantic search (10,000 docs) | < 2 seconds |

For 10k documents, pgvector IVFFLAT index is sufficient.
Switch to HNSW index if the collection exceeds 100k documents.

---

## Security notes

- No authentication in MVP (local / personal use)
- Add NextAuth.js (Google OAuth) in v1.1
- `.env` must never be committed — it's in `.gitignore`
- Uploaded PDFs go in `uploads/` — also in `.gitignore`
- Never log API keys, even at debug level
