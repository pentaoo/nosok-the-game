# Share Follow-ups

Временные дефолты уже внедрены в код:
- QR target URL: текущий `window.location.href`.
- Story image format: `1080x1920`.

Перед релизом нужно обновить:
1. Финальный production URL для QR-кода.
2. Финальное соотношение/размер story-картинки (если изменится).

После утверждения значений:
- обновить `src/ui/story-share.js`,
- проверить web-share + fallback download сценарии.
