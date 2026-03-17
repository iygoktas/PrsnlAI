# /ship komutu
# Kullanım: /ship
# TASKS.md'deki sıradaki görevi otomatik implement eder

TASKS.md dosyasını oku.
İlk tamamlanmamış [ ] görevi bul.

Şu adımları sırayla yap:
1. Görevle ilgili dosyaları oku (ARCHITECTURE.md + etkilenecek src dosyaları)
2. Implementation planını PLANS.md'e yaz (3-5 madde, hangi dosyalara dokunacaksın)
3. Kodu yaz
4. Test yaz ve `npm test -- --testPathPattern=<ilgili test dosyası>` çalıştır
5. Testler geçiyorsa: `git add -A && git commit -m "<type>(scope): <açıklama>"`
6. TASKS.md'de görevi `[x]` yap
7. Tamamlandığını ve bir sonraki görevin ne olduğunu bildir

Hata alırsan 2 kez kendi çöz, 3. denemede dur ve ne denediğini açıkla.
