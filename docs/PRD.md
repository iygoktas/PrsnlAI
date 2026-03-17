# PRD.md — Personal AI Knowledge Base

## Vision

A personal digital memory system. Every article you read, note you write, PDF you save, or tweet you bookmark flows into one place. Months later, when you ask "what was that paper I read about attention mechanisms?" — the AI finds it instantly, gives you context, and surfaces related content you forgot you had.

## Problem

Existing tools don't fully solve this:
- **Notion**: Requires manual organization; AI search is shallow
- **Obsidian**: Powerful but technical; sync is painful; AI plugins are limited
- **Mem.ai**: Expensive; no export; vendor lock-in
- **Readwise**: Only highlights; doesn't connect ideas across sources

**Core problem:** Knowledge accumulates but stays inaccessible. Semantic connections have to be built by hand, which nobody actually does.

---

## User (for now: just you)

- Consumes 5–15 pieces of content per day (articles, PDFs, tweets, videos)
- Takes active notes
- References older content 3–6 months later
- Comfortable in a terminal and code environment — no need for a polished UI

---

## User stories

### Critical (must be in MVP)
- [ ] **US-01**: I can paste a URL and hit save — the system fetches and indexes the content
- [ ] **US-02**: I can ask a natural language question in English or Turkish and get relevant results back
- [ ] **US-03**: I can upload a PDF — it gets indexed with page numbers preserved
- [ ] **US-04**: I can add a plain text or Markdown note
- [ ] **US-05**: Search results show which source they came from (title, date, link)

### Important (v1.1)
- [ ] **US-06**: I can save a tweet or Twitter thread by pasting its URL
- [ ] **US-07**: I can save any page with one click via a browser extension
- [ ] **US-08**: The AI surfaces connections between sources ("This article relates to a note you saved in March")
- [ ] **US-09**: I can get a summary of everything I've saved on a given topic

### Nice to have (v2)
- [ ] **US-10**: I can upload a screenshot or diagram and ask questions about it
- [ ] **US-11**: When a new item is added, the system automatically links it to related existing content
- [ ] **US-12**: Podcast and video transcript indexing

---

## MVP scope

**In scope:**
- Web UI (simple, Next.js)
- URL ingestion (web scraping)
- PDF ingestion
- Plain text / Markdown ingestion
- Semantic search (natural language queries)
- Source attribution (which document, which section)

**Out of scope (post-MVP):**
- Browser extension
- Twitter/X ingestion
- Visual understanding (beyond basic OCR)
- Mobile app
- Multi-user support

---

## Success criteria

- With 100 documents indexed, queries return in under 2 seconds
- The correct source appears in the top 3 results at least 80% of the time
- Adding a new document (URL-to-indexed) takes under 30 seconds
- The system runs locally and handles up to 10,000 documents without degradation

---

## Core user flows

### Saving a URL
```
User pastes URL
→ System scrapes page (Playwright)
→ Clean text extracted (boilerplate removed via Readability)
→ Text split into chunks (512 tokens, 64-token overlap)
→ Each chunk embedded
→ Embeddings stored in Supabase (pgvector)
→ Metadata saved (URL, title, date, domain)
→ "Saved" confirmation shown
```

### Asking a question
```
User types natural language query
→ Query is embedded
→ Similarity search in vector DB (top-k: 5)
→ Top chunks + their metadata sent to LLM
→ LLM generates answer with inline source references
→ Answer displayed with source cards below
```

---

## Dependencies and risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API cost | Medium | Support local Ollama as a drop-in alternative |
| Scraping blocked by target site | Low | Playwright + realistic user-agent rotation |
| Supabase free tier limits | Low | 500 MB storage, 2 GB transfer — plenty for personal use |
| PDF parse quality | Medium | Log failed PDFs; flag scanned-only PDFs early |
