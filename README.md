# UET Empty Lecture Hall Finder

Static web app for UET students to check which lecture halls are free from the Semester II 2025-2026 timetable.

## What this app does

- Loads a bundled timetable from `public/data/tkb-2025-2026-hk2.xlsx`
- Answers the three MVP queries defined in the SDD
- Lets a user drag-drop a replacement `.xlsx` file for the current browser session only
- Caches parsed timetable data in `localStorage` so repeat visits load faster

The app stays fully static: no backend, no database, no authentication.

## Local development

```bash
corepack pnpm install
corepack pnpm dev
```

Useful commands:

```bash
corepack pnpm test:run
corepack pnpm build
corepack pnpm preview
```

## Semester maintenance

For a new term, update:

- `public/semester.json`
- `public/data/tkb-2025-2026-hk2.xlsx`

No code rewrite, backend change, or database migration is required.

## Deployment

This repo is prepared for GitHub Pages deployment through GitHub Actions.

Why GitHub Pages:

- It matches the SDD's intended hosting target.
- The app already builds to static `dist/` output.
- The router uses hash history, so static hosting does not need rewrite rules.
- The Vite build already emits relative asset URLs, which keeps deployment repo-path friendly.

### One-time GitHub setup

1. Push this repo to GitHub.
2. Open `Settings -> Pages`.
3. Set `Build and deployment -> Source` to `GitHub Actions`.
4. Push to `main` or run the `Deploy to GitHub Pages` workflow manually.

The workflow runs tests, builds the site, uploads `dist/`, and deploys it to Pages.
