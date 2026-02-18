# nosok-the-game

Веб-плакат и мини-игра бренда NOSOK на `Vite + Three.js`.

## Локальный запуск

```bash
npm install
npm run dev
```

## Продакшн-сборка

```bash
npm run build
npm run preview
```

## Деплой на GitHub Pages

Автодеплой уже настроен через workflow:
`.github/workflows/deploy.yml`

Что нужно сделать в репозитории один раз:

1. Открой `Settings` → `Pages`.
2. В `Build and deployment` выбери `Source: GitHub Actions`.
3. Запушь изменения в `main` (или `master`) либо запусти workflow вручную (`Run workflow`).

После успешного джоба `Deploy to GitHub Pages` сайт будет доступен по адресу:
`https://<your-github-username>.github.io/<your-repo-name>/`

## Важно

`base` для Vite настраивается автоматически от имени репозитория из
`GITHUB_REPOSITORY` (с fallback на `nosok-the-game`), чтобы сборка корректно
работала на GitHub Pages.
