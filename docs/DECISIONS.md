# DECISIONS.md — Mimari Karar Kaydı (ADR)

> Her yeni paket eklendiğinde veya büyük bir teknik karar alındığında buraya yaz.
> Format: ## ADR-XXX — Başlık | Tarih | Durum

---

## ADR-001 — pgvector vs. Pinecone/Weaviate

**Tarih:** Proje başlangıcı
**Durum:** Kabul edildi

**Bağlam:** Vector storage için seçenek gerekiyordu.

**Karar:** pgvector (PostgreSQL extension) kullan.

**Gerekçe:**
- Local geliştirmede sıfır maliyet
- Ayrı servis yok, tek DB
- Prisma ile entegrasyon kolay
- Export/backup standart SQL
- 10.000 belgeye kadar performans yeterli (IVFFLAT index)

**Trade-off:** 1M+ belge için Pinecone/Weaviate daha iyi scale eder. Bu proje için erken optimizasyon.

---

## ADR-002 — pdf-parse vs. PyMuPDF

**Tarih:** Proje başlangıcı
**Durum:** Kabul edildi

**Bağlam:** PDF text extraction için Node.js veya Python seçimi.

**Karar:** `pdf-parse` (Node.js) kullan.

**Gerekçe:**
- Stack tamamen TypeScript, Python servisi eklemek karmaşıklık yaratır
- pdf-parse büyük çoğunluk PDF için yeterli
- PyMuPDF daha güçlü ama ayrı Python process gerektirir

**Trade-off:** Taranmış PDF (image-only) desteklenmez. OCR gerekirse Tesseract.js eklenebilir (ayrı ADR).

---

## ADR-003 — Playwright vs. Puppeteer

**Tarih:** Proje başlangıcı
**Durum:** Kabul edildi

**Bağlam:** Web scraping için browser automation kütüphanesi.

**Karar:** Playwright kullan.

**Gerekçe:**
- Chromium, Firefox, WebKit desteği
- Auto-wait mekanizması daha kararlı
- Puppeteer'dan daha aktif geliştirme
- Network interception daha güçlü

---

## ADR-004 — text-embedding-3-small vs. ada-002

**Tarih:** Proje başlangıcı
**Durum:** Kabul edildi

**Bağlam:** OpenAI embedding modeli seçimi.

**Karar:** `text-embedding-3-small` kullan.

**Gerekçe:**
- ada-002'den %5 daha iyi benchmark skoru (MTEB)
- ada-002'den 5x daha ucuz ($0.02 vs $0.10 per 1M token)
- 1536 boyut, pgvector ile uyumlu

---

## ADR-005 — claude-3-5-haiku vs. claude-3-5-sonnet (RAG için)

**Tarih:** Proje başlangıcı
**Durum:** Kabul edildi

**Bağlam:** RAG pipeline'ında kullanılacak LLM seçimi.

**Karar:** `claude-3-5-haiku` default, config ile değiştirilebilir.

**Gerekçe:**
- RAG'da LLM görevi basit: chunk'ları okuyup özetle
- Haiku bu iş için yeterince iyi
- Sonnet'e kıyasla 10x daha ucuz
- Latency daha düşük (< 1 saniye hedefi için önemli)

**Trade-off:** Karmaşık çıkarım gerektiren sorgularda Sonnet daha iyi. `LLM_MODEL` env eklenebilir.

---

## Şablon (yeni karar için kopyala)

```
## ADR-00X — Başlık

**Tarih:** GG.AA.YYYY
**Durum:** Kabul edildi | Reddedildi | Değiştirildi (ADR-00Y ile)

**Bağlam:** Neden bu karar alınması gerekti?

**Karar:** Ne yapıldı?

**Gerekçe:** Neden bu seçenek?

**Trade-off:** Ne kaybedildi veya ne riske atıldı?
```
