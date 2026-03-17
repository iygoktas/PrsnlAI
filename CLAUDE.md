# CLAUDE.md — Personal AI Knowledge Base

## Projeyi anlamak için sırayla oku
1. Bu dosya (CLAUDE.md) — kurallar ve otonomluk sınırları
2. docs/PRD.md — ne yapıyoruz ve neden
3. docs/ARCHITECTURE.md — teknik kararlar ve stack
4. docs/TASKS.md — sıradaki görev ne

---

## Otonomluk kuralları

### Onay ALMADAN yap
- Her türlü dosya oluşturma, düzenleme, silme
- `npm install`, `pip install` ve benzeri paket kurulumları
- `git add`, `git commit`, `git push`
- Yeni klasör ve modül oluşturma
- Test yazma ve çalıştırma
- Refactor ve kod temizleme
- `.env.example` güncelleme (gerçek secret'ları asla koyma)

### Dur ve açıkla
- Production veritabanına write işlemi (seed/migration dışında)
- Ücretli external API çağrısı (OpenAI, Pinecone vb. ilk kurulumda bir kez sor)
- Mevcut bir migration dosyasını değiştirme
- `git push --force`
- Bir dosyayı kalıcı silme (önce git commit al)

---

## Çalışma döngüsü

Her görev için şu sırayı takip et:

```
1. TASKS.md'den ilk [ ] görevi seç
2. İlgili dosyaları oku (ARCHITECTURE.md + etkilenen src dosyaları)
3. Implementation planını 3-5 maddeyle PLANS.md'e yaz
4. Kodu yaz
5. Test yaz ve çalıştır (`npm test` veya `pytest`)
6. Testler geçiyorsa: git add -A && git commit -m "<type>: <açıklama>"
7. TASKS.md'de görevi [x] yap
8. Bir sonraki göreve geç
```

Hata alırsan: 2 kez kendi çöz. 3. denemede dur, hatayı ve denediklerini açıkla.

---

## Git commit formatı (Conventional Commits)

```
feat: yeni özellik
fix: hata düzeltme
refactor: davranış değişmeden kod değişikliği
test: test ekleme/düzenleme
docs: döküman değişikliği
chore: build, config, paket güncelleme
```

Her commit atomik olsun — tek bir mantıksal değişiklik.

---

## Kod standartları

### Genel
- TypeScript strict mode açık, `any` kullanma
- Her public fonksiyonun üstüne JSDoc yorum
- Türkçe yorum satırı yazma (kod İngilizce)
- `console.log` bırakma, `logger` kullan
- Magic number kullanma, sabit tanımla

### Dosya yapısı
```
src/
├── ingestion/       ← Veri alma pipeline'ları (PDF, URL, text, image)
├── embedding/       ← Embedding oluşturma ve yönetimi
├── storage/         ← Vector DB ve metadata DB işlemleri
├── search/          ← Semantic search ve retrieval
├── api/             ← REST API endpoint'leri
├── ui/              ← Frontend (Next.js pages/components)
├── lib/             ← Paylaşılan utility'ler
└── types/           ← Global TypeScript tipleri
```

### Test
- Her yeni fonksiyon için en az 1 unit test
- API endpoint'leri için integration test
- Test dosyaları `__tests__` klasöründe, aynı modül adıyla

---

## Environment

```bash
# Geliştirme
npm run dev          # Next.js dev server
npm test             # Jest testleri
npm run db:migrate   # Prisma migration
npm run db:seed      # Test verisi

# Kontrol komutları
npm run lint         # ESLint
npm run typecheck    # TypeScript kontrol
```

`.env` dosyası yoksa `.env.example`'ı kopyala ve değerleri doldur.

---

## Kritik bağımlılıklar ve versiyonlar

Yeni paket eklemeden önce ARCHITECTURE.md'deki "Kabul edilen paketler" listesine bak. Listede yoksa eklemeden önce DECISIONS.md'e neden seçtiğini yaz.
