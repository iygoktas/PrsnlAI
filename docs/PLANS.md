# PLANS.md — Implementation Plans

---

## T-001: Scaffold Next.js 14 project

**Steps:**
1. Run `create-next-app` with TypeScript, App Router, Tailwind, and ESLint flags in the current directory
2. Verify the generated `tsconfig.json` has `strict: true` and the `@/` path alias
3. Verify `tailwind.config.ts` and `postcss.config.js` are present
4. Remove the default boilerplate from `src/app/page.tsx` and `src/app/globals.css`
5. Create the folder structure from ARCHITECTURE.md (`src/ingestion`, `src/embedding`, `src/storage`, `src/search`, `src/llm`, `src/lib`, `src/types`, `src/components`, `__tests__/`)

---

## T-002: Install and configure Prisma; connect to Supabase; create `.env.example`

**Steps:**
1. Prisma is already in `devDependencies`; run `npx prisma init` to generate `prisma/schema.prisma` (overwrite with correct datasource block)
2. Write `prisma/schema.prisma` with datasource referencing `DATABASE_URL` / `DIRECT_URL` and generator block (no models yet — T-004)
3. Create `src/lib/prisma.ts` — singleton Prisma client for use across the app
4. Write `.env.example` with all required variables documented (DATABASE_URL, DIRECT_URL, plus placeholders for upcoming tasks)
5. Write a test that verifies the schema file has the correct datasource provider and both URL env vars

---

## T-003: Add pgvector migration

**Steps:**
1. Create `prisma/migrations/20260317000000_enable_pgvector_extension/migration.sql` with `CREATE EXTENSION IF NOT EXISTS vector;`
2. Create `prisma/migrations/20260317999999_pgvector_ivfflat_index/migration.sql` with the `CREATE INDEX` statement — uses a far-future timestamp so it always runs after T-004's Chunk table migration
3. Write `__tests__/migrations/pgvector.test.ts` — verifies both migration files exist and contain the expected SQL keywords
4. Run tests; commit

