# DECISIONS.md — Architecture Decision Records (ADR)

> Log every significant technical decision here, especially new packages.
> Format: ## ADR-XXX — Title | Date | Status

---

## ADR-001 — Supabase over local PostgreSQL

**Date:** Project start
**Status:** Accepted

**Context:** Needed a PostgreSQL instance with pgvector support for the vector store.

**Decision:** Use Supabase (hosted PostgreSQL).

**Rationale:**
- pgvector comes pre-installed — no manual extension setup
- Free tier is sufficient for personal use (500 MB storage, 2 GB transfer/month)
- Zero local setup: no Docker, no Postgres service to manage
- Supabase dashboard makes it easy to inspect data and run one-off queries
- Standard PostgreSQL under the hood — migration to self-hosted is trivial if needed
- `DIRECT_URL` + `DATABASE_URL` pattern works cleanly with Prisma

**Trade-off:** Adds an external dependency. If Supabase is unreachable, the app is down. Acceptable for a personal tool.

---

## ADR-002 — pgvector over Pinecone / Weaviate

**Date:** Project start
**Status:** Accepted

**Context:** Needed a vector store for semantic search.

**Decision:** Use pgvector (as a Supabase extension) instead of a dedicated vector database.

**Rationale:**
- No separate service to manage or pay for
- All data in one place (metadata + vectors in the same DB, joinable with SQL)
- Standard SQL backups and exports
- IVFFLAT index handles up to ~100k documents comfortably
- Cosine similarity query is one SQL expression

**Trade-off:** Not the fastest option at very large scale. Switch to HNSW index (also in pgvector) at 100k+ documents, or migrate to Weaviate/Qdrant at 1M+. Neither applies to a personal knowledge base.

---

## ADR-003 — Anthropic API (claude-haiku) for answer generation

**Date:** Project start
**Status:** Accepted

**Context:** Needed an LLM to generate answers from retrieved chunks (RAG).

**Decision:** Use `@anthropic-ai/sdk` with `claude-haiku-4-5-20251001` as the default model.

**Rationale:**
- RAG answer generation is a simple task: read chunks, summarize, cite sources. Haiku handles it well.
- Haiku is ~10x cheaper than Sonnet and faster (important for <2s latency target)
- Anthropic API gives full control over the prompt — no wrapper abstractions
- Model is swappable via `LLM_MODEL` env variable without code changes

**Trade-off:** Haiku may struggle with complex multi-hop reasoning queries. For those cases, set `LLM_MODEL=claude-sonnet-4-6` in `.env`.

---

## ADR-004 — OpenAI text-embedding-3-small over ada-002

**Date:** Project start
**Status:** Accepted

**Context:** Needed an embedding model for vectorizing chunks and queries.

**Decision:** Use `text-embedding-3-small`.

**Rationale:**
- ~5% better on MTEB benchmark than ada-002
- 5x cheaper ($0.02 vs $0.10 per 1M tokens)
- Same 1536-dimension output — drop-in replacement for ada-002
- Supports dimension reduction (can go down to 256 if storage becomes a concern)

---

## ADR-005 — pdf-parse over PyMuPDF

**Date:** Project start
**Status:** Accepted

**Context:** Needed a PDF text extraction library.

**Decision:** Use `pdf-parse` (Node.js).

**Rationale:**
- Entire stack is TypeScript — adding a Python service introduces operational complexity
- `pdf-parse` handles the majority of text-based PDFs correctly
- No separate process, no IPC overhead

**Trade-off:** Scanned PDFs (image-only) are not supported. If OCR becomes necessary, `tesseract.js` can be added as a post-processing step (separate ADR).

---

## ADR-006 — Playwright over Puppeteer

**Date:** Project start
**Status:** Accepted

**Context:** Needed a browser automation library for URL ingestion.

**Decision:** Use Playwright.

**Rationale:**
- More stable auto-wait mechanism — fewer flaky scrapes
- Multi-browser support (Chromium, Firefox, WebKit) if needed
- More active development and maintenance than Puppeteer
- Better network interception API

---

## Template (copy for new decisions)

```
## ADR-00X — Title

**Date:** YYYY-MM-DD
**Status:** Accepted | Rejected | Superseded by ADR-00Y

**Context:** Why did this decision need to be made?

**Decision:** What was decided?

**Rationale:** Why this option over the alternatives?

**Trade-off:** What was given up or accepted as a risk?
```
