# TASKS.md — Görev Listesi

> Claude: Her görevi tamamladığında [x] yap ve git commit at. Sırayı değiştirme.

---

## Faz 0 — Proje kurulumu

- [ ] **T-001** Next.js 14 projesi oluştur (TypeScript, App Router, Tailwind, ESLint)
- [ ] **T-002** Prisma kur, PostgreSQL bağlantısını ayarla, `.env.example` oluştur
- [ ] **T-003** pgvector extension'ı ekle: migration dosyasına `CREATE EXTENSION IF NOT EXISTS vector` ekle
- [ ] **T-004** `Source` ve `Chunk` modellerini ARCHITECTURE.md'deki şemaya göre yaz, migration çalıştır
- [ ] **T-005** `src/lib/config.ts` yaz — tüm env variable'ları Zod ile parse et ve export et
- [ ] **T-006** `src/lib/logger.ts` yaz — Winston logger, level env'den gelsin
- [ ] **T-007** `src/lib/errors.ts` yaz — `IngestionError`, `SearchError`, `EmbeddingError` custom sınıfları
- [ ] **T-008** Jest kurulumu yap, `tsconfig.json` path alias'larını ayarla (`@/` → `src/`)
- [ ] **T-009** ESLint + Prettier config yaz, `package.json` script'lerini ekle

---

## Faz 1 — Embedding altyapısı

- [ ] **T-010** `src/embedding/chunker.ts` yaz
  - Metin alır, ARCHITECTURE.md'deki chunk boyutu ve overlap'e göre array döner
  - Her chunk için `{ content, chunkIndex, tokenEstimate }` objesi
  - Unit test yaz: kısa metin, uzun metin, boş metin edge case'leri

- [ ] **T-011** `src/embedding/openai.ts` yaz
  - `text-embedding-3-small` modeli kullan
  - Batch embedding destekle (tek seferde max 100 chunk)
  - Rate limit için exponential backoff ekle
  - Unit test yaz (OpenAI client mock'la)

- [ ] **T-012** `src/embedding/local.ts` yaz
  - Ollama `/api/embeddings` endpoint'ini çağır
  - `nomic-embed-text` modeli default
  - Unit test yaz (fetch mock'la)

- [ ] **T-013** `src/embedding/index.ts` yaz
  - `EMBEDDING_PROVIDER` env'e göre openai veya local seç
  - `embed(texts: string[]): Promise<number[][]>` interface'i export et

---

## Faz 2 — Storage katmanı

- [ ] **T-014** `src/storage/metadata.ts` yaz
  - `createSource(data)` — Source kaydı oluştur
  - `getSource(id)` — ID ile getir
  - `listSources(filter?)` — tip ve tarih filtresiyle listele
  - `deleteSource(id)` — Source + bağlı Chunk'ları sil
  - Unit test yaz (Prisma mock'la)

- [ ] **T-015** `src/storage/vector.ts` yaz
  - `insertChunks(chunks)` — embedding array'iyle birlikte toplu insert
  - `similaritySearch(embedding, topK, filter?)` — cosine similarity ile arama
    ```sql
    SELECT *, 1 - (embedding <=> $1) as score
    FROM "Chunk"
    ORDER BY embedding <=> $1
    LIMIT $2
    ```
  - Unit test yaz (Prisma $queryRaw mock'la)

- [ ] **T-016** `src/storage/index.ts` yaz — metadata ve vector işlemlerini birleştiren `saveDocument(source, chunks, embeddings)` fonksiyonu

---

## Faz 3 — Ingestion pipeline'ları

- [ ] **T-017** `src/ingestion/text.ts` yaz
  - Düz metin veya Markdown alır
  - Metin temizleme (fazla whitespace, kontrol karakterleri)
  - `{ title, content, type: 'TEXT' }` döner
  - Unit test yaz

- [ ] **T-018** `src/ingestion/pdf.ts` yaz
  - `pdf-parse` ile PDF buffer'ından metin çıkar
  - Sayfa numaralarını chunk metadata'sına ekle
  - Çıkarılamayan PDF'leri logla, hata fırlat
  - Unit test yaz (sample PDF dosyasıyla)

- [ ] **T-019** `src/ingestion/url.ts` yaz
  - Playwright ile sayfayı aç (headless)
  - `@mozilla/readability` ile makale içeriğini çıkar
  - Başlık, yazar, tarih metadata'sını al
  - Timeout: 15 saniye, hata durumunda `IngestionError` fırlat
  - Integration test yaz (example.com gibi basit bir URL ile)

- [ ] **T-020** `src/ingestion/index.ts` yaz — `ingest(input)` factory fonksiyonu, tipe göre doğru parser'ı çağırır

---

## Faz 4 — Search katmanı

- [ ] **T-021** `src/search/semantic.ts` yaz
  - Sorguyu embed et
  - Vector search yap (top-k)
  - Source bilgisini join et
  - `SearchResult[]` döner
  - Unit test yaz

- [ ] **T-022** `src/search/rerank.ts` yaz
  - Score threshold uygula (< 0.5 cosine similarity'yi çıkar)
  - Aynı source'dan gelen chunk'ları birleştir (max 2 chunk/source)
  - Sonuçları score'a göre sırala

- [ ] **T-023** `src/search/index.ts` yaz — `search(query, options?)` export et

---

## Faz 5 — API endpoint'leri

- [ ] **T-024** `src/app/api/ingest/route.ts` yaz
  - POST endpoint
  - Zod ile request validation
  - `ingestion/index.ts` → `embedding/index.ts` → `storage/index.ts` pipeline'ını çağır
  - Hata durumunda anlamlı HTTP status kodu döndür (400, 422, 500)
  - Integration test yaz

- [ ] **T-025** `src/app/api/search/route.ts` yaz
  - POST endpoint
  - Sorguyu al, search yap, LLM'e chunk'ları ver, cevap üret
  - LLM prompt'u ARCHITECTURE.md'deki response formatına uygun olsun
  - Kaynak referanslarını cevaba ekle
  - Integration test yaz

---

## Faz 6 — UI

- [ ] **T-026** Ana layout yaz (`src/app/layout.tsx`) — Tailwind, font, metadata
- [ ] **T-027** `SearchBar.tsx` component'i yaz — input, loading state, submit
- [ ] **T-028** `SearchResults.tsx` component'i yaz — cevap metni + kaynak kartları
- [ ] **T-029** `SourceBadge.tsx` component'i yaz — type icon, domain, tarih
- [ ] **T-030** `AddContentForm.tsx` component'i yaz — URL/text/PDF tab'lı form, progress göstergesi
- [ ] **T-031** Ana sayfa (`src/app/page.tsx`) yaz — search bar + results birleştir
- [ ] **T-032** Ekleme sayfası (`src/app/add/page.tsx`) yaz — AddContentForm entegre et

---

## Faz 7 — Polish ve test

- [ ] **T-033** End-to-end test: URL ekle → ara → sonuç bul
- [ ] **T-034** End-to-end test: PDF ekle → içerikten soru sor → doğru bölümü bul
- [ ] **T-035** Performance test: 100 belge ekle, arama süresini ölç, hedefe (< 500ms) ulaş
- [ ] **T-036** README.md yaz — kurulum adımları, ilk çalıştırma, screenshot

---

## Backlog (MVP sonrası)

- [ ] **B-001** Twitter/X thread ingestion
- [ ] **B-002** Browser extension (Chrome)
- [ ] **B-003** Otomatik ilişki keşfi (yeni belge eklenince eski belgelerle bağlantı kur)
- [ ] **B-004** Konu bazlı özet görünümü
- [ ] **B-005** NextAuth.js ile authentication
- [ ] **B-006** Bulk import (OPML, Pocket export, Instapaper export)
