# UEmpTy

UEmpTy is a static Vue app for checking UET room availability from the bundled HK II 2025-2026 timetable workbook. It runs entirely in the browser: the app fetches semester metadata and an `.xlsx` file from `public/`, parses the workbook client-side, and answers room-status queries for the selected date and time.

There is no backend, database, authentication, or live schedule feed.

## Use It Directly

You can use UEmpTy directly at <https://ntjson.github.io/UEmpTy>.

## Features

- Loads `public/semester.json` and `public/data/tkb-2025-2026-hk2.xlsx` on startup.
- Parses workbook sheets with timetable headers, skips blank/online rows, normalizes room IDs, expands multi-slot `Ca` values, and builds room/building indexes.
- Interprets common `Ghi chu` week-coverage patterns, including ranges, lists, excluded weeks, stage-specific LT/TH notes, and some exam-dot notes.
- Shows parser warnings and room-conflict warnings in a drawer for maintainer review.
- Lets users choose a date and time or reset to the current time in the configured timezone.
- Checks whether one selected room is free, occupied, or outside the configured semester.
- Shows the current class, class end time, next class, and same-room/same-slot conflicts when available.
- Ranks currently empty rooms, optionally prioritizing a selected building and filtering by minimum free duration.
- Caches parsed timetable data in `localStorage` using the workbook SHA-256 hash, cache version, and semester config.
- Uses hash routing so the app works on static hosting such as GitHub Pages.

## Tech Stack

- Vue 3 with `<script setup>` single-file components
- TypeScript
- Vite
- Pinia
- Vue Router with hash history
- Tailwind CSS, PostCSS, and Autoprefixer
- `xlsx` for workbook parsing
- `date-fns` and `date-fns-tz` for semester/timezone calculations
- Vitest with jsdom
- pnpm, pinned by `packageManager` in `package.json`

## Local Setup

Prerequisites:

- Node.js LTS
- Corepack enabled, so the pinned pnpm version can be used

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

Start the development server:

```bash
corepack pnpm dev
```

Build and preview the production output:

```bash
corepack pnpm build
corepack pnpm preview
```

## Scripts

The available scripts are defined in `package.json`.

| Command | Purpose |
| --- | --- |
| `corepack pnpm dev` | Start the Vite development server. |
| `corepack pnpm build` | Run `vue-tsc -b`, then create the Vite production build in `dist/`. |
| `corepack pnpm preview` | Serve the built `dist/` output locally. |
| `corepack pnpm test` | Start Vitest in watch mode. |
| `corepack pnpm test:run` | Run the test suite once. |

## Data and Semester Maintenance

Runtime data lives under `public/` and is copied into the production build as static assets.

- `public/semester.json` configures:
  - `semesterStartDate`: first day of week 1, in `YYYY-MM-DD` format.
  - `totalWeeks`: number of configured semester weeks.
  - `timezone`: timezone used for date, time, and week calculations.
  - `excludedWeeks`: week numbers treated as outside the semester.
- `public/data/tkb-2025-2026-hk2.xlsx` is the bundled workbook loaded by the app.
- `src/lib/constants.ts` contains `DEFAULT_WORKBOOK_PATH`. If the workbook file is renamed or moved, update that constant.

The parser searches the first 15 rows of each worksheet for timetable headers. After normalization, it expects columns equivalent to `lop`, `ma hp`, `mon`, `ma lhp`, `nhom`, `lt th`, `thu`, `ca`, `gd`, `gv`, and at least one `ghi chu` column. `tc` is optional. Multiple `ghi chu` columns are joined before week parsing.

When replacing the workbook for a new term:

1. Replace the `.xlsx` file under `public/data/`, or add a new file and update `DEFAULT_WORKBOOK_PATH`.
2. Update `public/semester.json` to match the new semester.
3. Review visible term-specific copy in the Vue components and formatting helpers if the semester label changes.
4. Run `corepack pnpm test:run`; the parser test suite includes a smoke test for the committed workbook.
5. Run `corepack pnpm build`.

Changing the workbook content or semester config naturally creates a new cache key, so browsers will parse and cache the new data.

## Deployment to GitHub Pages

Deployment is handled by `.github/workflows/deploy.yml`.

The workflow runs on pushes to `main` or `master`, and can also be started manually with `workflow_dispatch`. It:

1. Checks out the repo.
2. Installs pnpm.
3. Sets up Node.js LTS with pnpm caching.
4. Configures GitHub Pages.
5. Runs `pnpm install --frozen-lockfile`.
6. Runs `pnpm test:run`.
7. Runs `pnpm build`.
8. Uploads `dist/` as a Pages artifact.
9. Deploys through `actions/deploy-pages`.

One-time repository setup:

1. Open the GitHub repository settings.
2. Go to `Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.
4. Push to `main` or `master`, or run the workflow manually.

The app uses `base: './'` in Vite and hash routes such as `#/room` and `#/empty`, so GitHub Pages does not need custom rewrite rules.

## Project Structure

```text
.
+-- .github/workflows/deploy.yml    # GitHub Pages build and deploy workflow
+-- index.html                      # Vite HTML entrypoint
+-- package.json                    # Scripts and dependencies
+-- public/
|   +-- semester.json               # Semester config fetched at runtime
|   +-- data/
|       +-- tkb-2025-2026-hk2.xlsx  # Bundled timetable workbook
+-- src/
|   +-- App.vue                     # App shell, date/time controls, drawers
|   +-- main.ts                     # Vue, Pinia, and router bootstrap
|   +-- style.css                   # Tailwind layers and shared component classes
|   +-- components/                 # Room cards, settings panel, warnings drawer
|   +-- lib/                        # Parser, query, calendar, formatting, tests
|   +-- router/                     # Hash-route definitions
|   +-- stores/                     # Timetable loading/cache state
|   +-- views/                      # Home, room lookup, empty-room ranking
+-- tailwind.config.ts
+-- tsconfig*.json
+-- vite.config.ts
```

## Known Limitations

- There is no in-app upload, drag-and-drop, or remote data source selector. The app only loads the bundled workbook path from `DEFAULT_WORKBOOK_PATH`.
- Some UI copy is specific to HK II 2025-2026 and should be reviewed when maintaining a new semester.
- `Ghi chu` parsing is heuristic. Unrecognized notes fall back to configured full-semester coverage and produce warnings; split schedules may need manual review.
- Class periods are fixed to four slots: 07:00-09:40, 09:50-12:30, 13:30-16:10, and 16:20-19:00.
- Room availability only reflects classes in the workbook. It does not know about ad hoc reservations, maintenance, exams, or real-time room changes.
- Initial parsing happens in the browser. The result is cached, but a large workbook can still affect first-load time.
- Static hosting is assumed; there are no server-side redirects, APIs, or protected admin workflows.

## Verification Commands

Run these before committing data, parser, or UI changes:

```bash
corepack pnpm test:run
corepack pnpm build
```

Optional local production check:

```bash
corepack pnpm preview
```
