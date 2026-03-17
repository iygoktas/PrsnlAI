# PRD.md — Personal AI Knowledge Base

## Vizyon

Kişisel dijital hafıza sistemi. Her okuduğun makale, attığın not, kaydettiğin PDF, beğendiğin tweet — hepsi tek bir yere giriyor. Aylar sonra "o makaleyi nerede okumuştum?" dediğinde AI anında buluyor, context veriyor, bağlantılar kuruyor.

## Problem

Mevcut çözümlerin hiçbiri tam olmuyor:
- **Notion**: Manuel organizasyon gerektirir, AI arama yüzeysel
- **Obsidian**: Teknik, sync zor, AI eklentileri kısıtlı
- **Mem.ai**: Pahalı, export yok, vendor lock-in
- **Readwise**: Sadece highlight'lar, bağlantı kurmaz

**Core problem:** Bilgi birikiyor ama erişilemiyor. Semantic bağlantılar insan tarafından elle kurulmak zorunda.

---

## Kullanıcı (şimdilik: sadece sen)

- Günde 5-15 içerik tüketiyor (makale, PDF, tweet, video)
- Aktif not tutuyor
- 3-6 ay sonra eski içeriklere referans veriyor
- Terminal/kod ortamına alışkın, fancy UI gerekmez

---

## Kullanıcı hikayeleri

### Kritik (MVP'de olmalı)
- [ ] **US-01**: Bir URL yapıştırıp "kaydet" diyebilmeliyim, sistem içeriği alıp indexlemeli
- [ ] **US-02**: Türkçe veya İngilizce doğal dil sorusu sorabilmeliyim, sistem alakalı içerikleri getirmeli
- [ ] **US-03**: PDF yükleyebilmeliyim, metin ve sayfa numarasıyla indexlemeli
- [ ] **US-04**: Düz metin veya markdown not girebilmeliyim
- [ ] **US-05**: Sorgu sonuçları hangi kaynaktan geldiğini göstermeli (kaynak, tarih, link)

### Önemli (v1.1)
- [ ] **US-06**: Tweet veya Twitter thread'i URL'siyle kaydedebilmeliyim
- [ ] **US-07**: Browser extension ile tek tıkla sayfayı kaydedebilmeliyim
- [ ] **US-08**: İki kaynak arasındaki bağlantıyı AI bulup göstermeli ("Bu makale şu notunla ilişkili")
- [ ] **US-09**: Belirli bir konudaki tüm içeriklerimi özet olarak görmek istiyorum

### Güzel olur (v2)
- [ ] **US-10**: Görsel (screenshot, diagram) yükleyip içeriğini sorabilmeliyim
- [ ] **US-11**: Yeni eklenen içerik, eski içeriklerle otomatik ilişkilendirilmeli ve bildirim gelmeli
- [ ] **US-12**: Podcast/video transcript indexleme

---

## MVP kapsamı

**Dahil:**
- Web UI (basit, Next.js)
- URL ingestion (web scraping)
- PDF ingestion
- Düz metin / Markdown ingestion
- Semantic search (doğal dil sorgu)
- Kaynak gösterme (hangi belge, hangi bölüm)

**Dahil değil (MVP sonrası):**
- Browser extension
- Twitter/X ingestion
- Görsel anlama (OCR dışında)
- Mobil uygulama
- Çoklu kullanıcı

---

## Başarı kriterleri

- 100 belge indexlenmiş halde, sorgu 2 saniyenin altında yanıt vermeli
- Sorgu sonuçları ilk 3 sonuçta doğru kaynağı %80+ oranında getirmeli
- Yeni belge ekleme süreci 30 saniyenin altında olmalı (URL'den kaydetme dahil)
- Hafıza: 10.000 belgeye kadar local çalışabilmeli

---

## Kullanıcı akışları

### URL kaydetme
```
Kullanıcı URL giriyor
→ Sistem sayfayı scrape ediyor (Puppeteer)
→ Temiz metin çıkarılıyor (boilerplate temizlenir)
→ Chunk'lara bölünüyor (500 token, 50 token overlap)
→ Her chunk embed ediliyor
→ Vector DB'ye kaydediliyor
→ Metadata (URL, başlık, tarih, domain) ayrıca kaydediliyor
→ "Kaydedildi" onayı
```

### Soru sorma
```
Kullanıcı doğal dil sorusu giriyor
→ Soru embed ediliyor
→ Vector DB'de similarity search (top-k: 5)
→ Bulunan chunk'lar + metadata LLM'e gönderiliyor
→ LLM cevabı kaynak referanslarıyla üretiyor
→ Kullanıcıya gösteriliyor
```

---

## Bağımlılıklar ve riskler

| Risk | Etki | Önlem |
|------|------|-------|
| OpenAI API maliyeti | Orta | İlk aşamada local model (Ollama) seçeneği sun |
| Scraping'in engellenmesi | Düşük | Playwright + farklı user-agent stratejisi |
| Vector DB boyutu | Düşük | pgvector ile Postgres içinde tut, ayrı DB gerekmez |
| PDF parse kalitesi | Orta | PyMuPDF ile test et, sorunlu PDF'leri logla |
