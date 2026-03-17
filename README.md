# Personal AI Knowledge Base

A personal digital memory system that automatically indexes your articles, PDFs, notes, and tweets — then answers your questions with sources.

## Features

- **URL Ingestion** — Paste a link, the system fetches and indexes the content
- **PDF Upload** — Index documents with text extraction and page tracking
- **Plain Text / Markdown** — Save personal notes alongside external content
- **Semantic Search** — Ask natural language questions, get relevant results back
- **Source Attribution** — Every answer includes the source, date, and link
- **Multi-Provider** — Use OpenAI, Anthropic, or local Ollama models

## Quick Start (10 minutes)

### Prerequisites

- **Node.js** 18+ (check: `node --version`)
- **npm** 9+ (check: `npm --version`)
- **Supabase** account (free tier: [supabase.com](https://supabase.com))
- **OpenAI API key** (free tier available) or local **Ollama** setup

### 1. Clone and install

```bash
git clone <repo-url>
cd personal-ai-kb
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **Database** → copy the connection string:
   - Connection string example: `postgresql://user:password@host:5432/postgres`
   - Note: if your password has special characters (like `@`), URL-encode them (e.g., `%40` for `@`)
3. In Supabase, go to **SQL Editor** and run this once to enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE INDEX ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

### 3. Create `.env` file

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database (from Supabase)
DATABASE_URL="postgresql://user:password@host:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"

# LLM provider: "anthropic" or "local"
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."

# Embedding provider: "openai" or "local"
EMBEDDING_PROVIDER="openai"
OPENAI_API_KEY="sk-..."

# Optional: if using Ollama locally
# OLLAMA_LLM_MODEL="llama3.2"
# OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
# OLLAMA_BASE_URL="http://localhost:11434"
```

### 4. Initialize the database

```bash
npm run db:migrate
```

This creates tables and sets up the pgvector extension.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding Content

**Home page** → **[+ Add Content]** tab → choose one of:

- **🌐 URL** — Paste any webpage link; the system fetches and indexes it
- **📝 Text** — Paste plain text or Markdown notes
- **📄 PDF** — Upload a PDF file; text is extracted automatically

Click "Save" and wait for confirmation. Large PDFs or slow URLs may take 10–30 seconds.

### Searching

**Home page** → type your question in the search box → press Enter

Results show:

1. **AI Answer** — Generated using relevant sources
2. **Sources** — Cards showing which documents contributed to the answer, with links

Example queries:

- "What are the key points from the papers I saved last week?"
- "Which article discusses attention mechanisms?"
- "Summarize everything I know about RAG"

## Architecture Overview

The system has three main layers:

### **Ingestion** (`src/ingestion/`)

Routes content by type (URL, PDF, text) to specialized parsers:

- **URL** — Playwright + Readability (extracts article body, removes boilerplate)
- **PDF** — unpdf (text extraction, detects scanned-only PDFs)
- **Text** — Direct chunking

Output: cleaned text + metadata (title, date, URL, page count)

### **Embedding & Storage** (`src/embedding/`, `src/storage/`)

1. Chunk text (512 tokens, 64-token overlap)
2. Generate embeddings (OpenAI 1536-dim or Ollama 768-dim)
3. Store in Supabase (PostgreSQL + pgvector)

Database tables:

- **Source** — document metadata (title, type, URL, date)
- **Chunk** — text chunks with vector embeddings

### **Search & Answer** (`src/search/`, `src/llm/`)

1. Embed user's query
2. Similarity search in pgvector (find top-k most relevant chunks)
3. Rerank results (drop low-score chunks, deduplicate by source)
4. Pass to LLM (Claude Haiku or Ollama) with inline citations
5. Return answer + source metadata

## Environment Variables Reference

See `.env.example` for all options. Key ones:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Supabase PostgreSQL (with pgbouncer) |
| `DIRECT_URL` | ✅ | — | Direct Supabase connection (for migrations) |
| `LLM_PROVIDER` | ✅ | `anthropic` | `anthropic` or `local` |
| `ANTHROPIC_API_KEY` | ✅* | — | Required if `LLM_PROVIDER=anthropic` |
| `EMBEDDING_PROVIDER` | ✅ | `openai` | `openai` or `local` |
| `OPENAI_API_KEY` | ✅* | — | Required if `EMBEDDING_PROVIDER=openai` |
| `OLLAMA_BASE_URL` | — | `http://localhost:11434` | Ollama endpoint (if using local) |
| `LOG_LEVEL` | — | `info` | `error`, `warn`, `info`, `debug` |

## Development

### Running tests

```bash
npm test                          # All tests
npm test -- --testPathPattern=pdf # Just PDF tests
npm run typecheck                 # TypeScript check
npm run lint                      # ESLint check
```

### Build for production

```bash
npm run build
npm start
```

## Performance

With pgvector IVFFLAT index (default):

- Search latency: **< 500ms** (100 documents)
- Maximum documents: **~100k** (without HNSW index)
- Ingestion: **< 30s** per document

For 10k+ documents, consider upgrading to HNSW index:

```sql
DROP INDEX ON "Chunk" USING ivfflat;
CREATE INDEX ON "Chunk" USING hnsw (embedding vector_cosine_ops);
```

## Troubleshooting

### "PDF parsing failed" error

- Check that the PDF is text-based (not a scanned image)
- Large PDFs (>50 pages) may timeout; break into smaller files

### "Invalid `prisma.$executeRawUnsafe()`" error

- Make sure you've run `npm run db:migrate` to create tables

### "expected 1536 dimensions, not 768"

- Make sure `EMBEDDING_PROVIDER` and `OPENAI_API_KEY` are set correctly
- If using Ollama, the model returns 768 dimensions; adjust accordingly or switch to OpenAI

### Connection to Supabase fails

- Check that `DATABASE_URL` and `DIRECT_URL` are correct
- Special characters in passwords must be URL-encoded (`@` → `%40`)
- For pgbouncer errors, ensure `?pgbouncer=true` is in `DATABASE_URL`

## Next Steps (Post-MVP)

- [ ] Browser extension for one-click saves
- [ ] Twitter/X thread ingestion
- [ ] Automatic connection discovery
- [ ] Multi-user support with NextAuth
- [ ] Topic-based summaries

## License

MIT
