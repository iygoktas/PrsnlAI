# ARCHITECTURE.md — Teknik Mimari

## Stack kararları

### Frontend
- **Next.js 14** (App Router) — SSR, API routes hepsi tek projede
- **TypeScript strict** — runtime hatalarını azalt
- **Tailwind CSS** — hızlı UI, custom component gerekmez
- **shadcn/ui** — temel component'ler (Button, Input, Card)

### Backend (Next.js API Routes içinde)
- **Node.js** — TypeScript ile tutarlılık
- **Prisma** — ORM, migration yönetimi, type-safe DB erişimi

### Veritabanı
- **PostgreSQL + pgvector extension** — hem metadata hem vector aynı DB'de
  - Neden: Pinecone/Weaviate yerine local başla, maliyet sıfır, export kolay
  - pgvector 1536 boyut (OpenAI ada-002) veya 768 boyut (local model) destekler
- **Prisma** migration ile yönetilir

### Embedding
- **Birincil**: `text-embedding-3-small` (OpenAI) — 1536 boyut, ucuz ($0.02/1M token)
- **Alternatif**: `nomic-embed-text` via Ollama — tamamen local, ücretsiz
- **Seçim**: `.env`'de `EMBEDDING_PROVIDER=openai|local` ile değiştirilebilir

### LLM (soru-cevap için)
- **Birincil**: `claude-3-5-haiku` — hızlı, ucuz, RAG için yeterli
- **Alternatif**: `llama3.2` via Ollama
- Seçim: `.env`'de `LLM_PROVIDER=anthropic|local`

### Ingestion
- **Web scraping**: Playwright (Puppeteer yerine — daha kararlı)
- **PDF**: `pdf-parse` (Node.js) — PyMuPDF kadar kapasiteli, aynı dilde
- **HTML temizleme**: `@mozilla/readability` — makale içeriğini boilerplate'den ayırır

### Chunking stratejisi
```
Chunk boyutu: 512 token
Overlap: 64 token
Metadata her chunk'ta: source_id, chunk_index, page_number (PDF için)
```

---

## Veritabanı şeması

```prisma
model Source {
  id          String   @id @default(cuid())
  type        SourceType  // URL | PDF | TEXT | TWEET
  title       String
  url         String?
  filePath    String?
  content     String   // ham metin (arama için)
  createdAt   DateTime @default(now())
  chunks      Chunk[]
}

model Chunk {
  id          String   @id @default(cuid())
  sourceId    String
  source      Source   @relation(fields: [sourceId], references: [id])
  content     String
  chunkIndex  Int
  pageNumber  Int?
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())
}

enum SourceType {
  URL
  PDF
  TEXT
  TWEET
}
```

pgvector için ek migration:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Klasör yapısı (tam)

```
personal-ai-kb/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   └── PLANS.md              ← Claude'un implementation planlarını yazdığı yer
├── .claude/
│   └── commands/
│       ├── ship.md           ← /ship komutu
│       ├── status.md         ← /status komutu
│       └── review.md         ← /review komutu
├── src/
│   ├── ingestion/
│   │   ├── url.ts            ← Playwright scraper
│   │   ├── pdf.ts            ← PDF parser
│   │   ├── text.ts           ← Düz metin/markdown
│   │   └── index.ts          ← Ingestion factory
│   ├── embedding/
│   │   ├── openai.ts         ← OpenAI embedding provider
│   │   ├── local.ts          ← Ollama embedding provider
│   │   ├── chunker.ts        ← Metin chunking logic
│   │   └── index.ts          ← Provider seçimi
│   ├── storage/
│   │   ├── vector.ts         ← pgvector işlemleri (insert, search)
│   │   ├── metadata.ts       ← Prisma CRUD
│   │   └── index.ts
│   ├── search/
│   │   ├── semantic.ts       ← Embedding + vector search
│   │   ├── rerank.ts         ← Sonuçları skor ile sırala
│   │   └── index.ts
│   ├── api/
│   │   └── (Next.js route handlers)
│   │       ├── ingest/
│   │       │   └── route.ts  ← POST /api/ingest
│   │       └── search/
│   │           └── route.ts  ← POST /api/search
│   ├── ui/
│   │   ├── app/
│   │   │   ├── page.tsx      ← Ana sayfa (search)
│   │   │   ├── add/
│   │   │   │   └── page.tsx  ← İçerik ekleme
│   │   │   └── layout.tsx
│   │   └── components/
│   │       ├── SearchBar.tsx
│   │       ├── SearchResults.tsx
│   │       ├── AddContentForm.tsx
│   │       └── SourceBadge.tsx
│   ├── lib/
│   │   ├── logger.ts         ← Winston logger
│   │   ├── config.ts         ← Env variables type-safe
│   │   └── errors.ts         ← Custom error sınıfları
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
├── .env                      ← gitignore'da
├── package.json
├── tsconfig.json
└── jest.config.ts
```

---

## API tasarımı

### POST /api/ingest
```typescript
// Request
{
  type: "url" | "pdf" | "text",
  content: string,    // URL için URL, text için içerik
  title?: string,     // opsiyonel başlık override
  file?: File         // PDF upload için
}

// Response
{
  sourceId: string,
  chunksCreated: number,
  title: string,
  processingTimeMs: number
}
```

### POST /api/search
```typescript
// Request
{
  query: string,
  limit?: number,     // default: 5
  filter?: {
    type?: SourceType[],
    dateFrom?: string,
    dateTo?: string
  }
}

// Response
{
  answer: string,     // LLM'in ürettiği cevap
  sources: [{
    sourceId: string,
    title: string,
    url?: string,
    excerpt: string,  // ilgili chunk
    score: number,    // cosine similarity
    chunkIndex: number
  }]
}
```

---

## Kabul edilen paketler

Aşağıdakiler dışında paket eklemeden önce DECISIONS.md'e yaz:

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "@prisma/client": "latest",
    "playwright": "latest",
    "pdf-parse": "latest",
    "@mozilla/readability": "latest",
    "openai": "latest",
    "@anthropic-ai/sdk": "latest",
    "winston": "latest",
    "zod": "latest",
    "tailwindcss": "latest"
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

```bash
# .env.example

# Database
DATABASE_URL="postgresql://localhost:5432/personal_kb"

# Embedding
EMBEDDING_PROVIDER="openai"          # openai | local
OPENAI_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"  # local için

# LLM
LLM_PROVIDER="anthropic"             # anthropic | local
ANTHROPIC_API_KEY=""

# App
NODE_ENV="development"
LOG_LEVEL="info"
MAX_CHUNK_SIZE=512
CHUNK_OVERLAP=64
SEARCH_TOP_K=5
```

---

## Performans hedefleri

| Operasyon | Hedef |
|-----------|-------|
| URL ingestion | < 10 saniye |
| PDF ingestion (10 sayfa) | < 15 saniye |
| Semantic search (100 belge) | < 500ms |
| Semantic search (10.000 belge) | < 2 saniye |

10.000 belge için pgvector IVFFLAT index yeterli. 100k+ olursa HNSW index'e geç.

---

## Güvenlik notları

- API endpoint'leri şimdilik auth yok (local kullanım)
- v1.1'de NextAuth.js ekle (Google OAuth yeterli)
- `.env` asla commit'e gitmesin
- Yüklenen PDF'ler `uploads/` klasöründe, gitignore'da
