# Repository Guidelines

## Project Structure & Module Organization
- Core app: `app.vue`, `nuxt.config.ts`, with pages under `pages/`, shared UI in `components/`, composables in `composables/`, and stores in `stores/` (Pinia).
- Server APIs: `server/api/**` plus middleware in `server/middleware/`.
- Data layer: Prisma schemas in `prisma/`, seeds in `prisma/seed.ts`, migrations in `prisma/migrations/`.
- Types and utilities: `types/` for shared types, `utils/` for helpers, `lib/` for auth/logging/validation.
- Tests: unit/integration in `tests/`, Playwright e2e config in `playwright.config.ts`.

## Build, Test, and Development Commands
- `npm run dev` — start the Nuxt dev server.
- `npm run build` / `npm run preview` — production build and preview.
- `npm run typecheck` — TypeScript strict type checking.
- `npm run lint` / `npm run format` — ESLint (format is alias of lint --fix).
- `npm test` or `npm run test:components` — Vitest suites; use `npm run test:agent` for categorized runs.
- `npm run test:e2e` — Playwright e2e; add `--ui`/`--headed` for debug.
- `npm run db:generate` / `npm run db:migrate` — Prisma client and migrations.

## Coding Style & Naming Conventions
- Language: TypeScript (strict); prefer `<script setup>` Composition API in Vue.
- Imports: use `~` alias for project-root paths.
- Lint/format: ESLint 9 with stylistic plugin; formatting goes through ESLint (`npm run format`).
- Naming: English identifiers; keep file names kebab-case for Vue pages/components.
- Comments: short, in Japanese when needed for clarity.

## Testing Guidelines
- Frameworks: Vitest (unit/integration) with `tests/setup.ts`; Playwright for e2e.
- Naming: place tests alongside feature folders in `tests/<area>/*.test.ts` or `.spec.ts`.
- Run before PR: `npm run typecheck`, `npm run lint`, `npm test`; optionally `npm run test:e2e` for critical flows.

## Commit & Pull Request Guidelines
- Commits: concise imperative subject (e.g., `Add meal analytics chart`); group related changes by feature.
- PRs: include summary, testing notes (commands run), and linked issue/Task ID; attach screenshots for UI-impacting changes.
- Keep changes small and focused; ensure migrations or seeds are documented when DB schema changes.

## Security & Configuration Tips
- Environment: Node >= 20; configure Prisma URLs via `.env` (SQLite for dev, MySQL for prod).
- Secrets: never commit `.env`; use sample/env templates if adding new variables.
- Auth: JWT-based; avoid logging sensitive tokens; prefer `lib/auth.ts` helpers for validation.
