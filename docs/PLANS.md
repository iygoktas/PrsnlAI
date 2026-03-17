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

## T-006: Write src/lib/logger.ts — Winston logger

**Steps:**
1. Install `winston` if not already present
2. Create logger with two transports: JSON format in production, colorized `printf` in development/test
3. Log level read from `config.LOG_LEVEL`
4. Write `__tests__/lib/logger.test.ts` — verify logger is created, has correct level, and correct format per NODE_ENV
5. Commit

---

## T-007: Write src/lib/errors.ts — custom error classes

**Steps:**
1. Define three custom error classes: `IngestionError`, `SearchError`, `EmbeddingError`
2. Each extends `Error` and adds a `code` field for error categorization
3. Constructor accepts `message` and optional `code` parameter (defaults to 'UNKNOWN')
4. Maintain standard Error prototype chain with proper `name` property
5. Write `__tests__/lib/errors.test.ts` — instantiate each, verify inheritance, check code field, test default code

---

## T-008: Configure Jest with ts-jest; set up @/ path alias

**Steps:**
1. Verify `jest.config.ts` has `preset: "ts-jest"` and `moduleNameMapper` for @/ alias
2. Verify `tsconfig.json` has `"strict": true` and `"paths": { "@/*": ["./src/*"] }`
3. Confirm all test files are discoverable via `testMatch` pattern
4. Run `npm test` to verify all tests pass with proper module resolution
5. Task is complete once all tests pass

---

## T-009: Configure .gitignore, ESLint, Prettier, and npm scripts

**Steps:**
1. Verify `.gitignore` contains: node_modules, .env, .next/, uploads/, and .claude/
2. Verify `package.json` has all required scripts: dev, build, start, lint, typecheck, test, db:migrate, db:seed
3. Verify `.eslintrc.json` extends next/core-web-vitals and next/typescript
4. Create `.prettierrc.json` with standard formatting rules (semi, singleQuote, trailingComma, printWidth, tabWidth)
5. All configuration files in place and consistent

---

## T-005: Write src/lib/config.ts — Zod-parsed env variables

**Steps:**
1. Define a Zod schema covering all variables in `.env.example` (DATABASE_URL, DIRECT_URL, provider flags, API keys, chunking constants, search constants, logging, NODE_ENV)
2. Parse `process.env` with the schema; throw a descriptive error on missing required variables at module load time
3. Export a typed `config` object — consumers import from `@/lib/config`
4. Write `__tests__/lib/config.test.ts` — test valid env, missing required fields (error thrown), and numeric coercions
5. Commit

---

## T-004: Write Source and Chunk models in prisma/schema.prisma; run db:migrate

**Steps:**
1. Add `Source`, `Chunk` models and `SourceType` enum to `prisma/schema.prisma` exactly as specified in ARCHITECTURE.md
2. Write `__tests__/prisma/schema.test.ts` — reads the schema file and asserts models, fields, and relations are present
3. Run `npm run db:migrate` to push schema to Supabase (requires `.env` with valid `DATABASE_URL`/`DIRECT_URL`)
4. Commit schema, test, and updated TASKS.md

---

## T-003: Add pgvector migration

**Steps:**
1. Create `prisma/migrations/20260317000000_enable_pgvector_extension/migration.sql` with `CREATE EXTENSION IF NOT EXISTS vector;`
2. Create `prisma/migrations/20260317999999_pgvector_ivfflat_index/migration.sql` with the `CREATE INDEX` statement — uses a far-future timestamp so it always runs after T-004's Chunk table migration
3. Write `__tests__/migrations/pgvector.test.ts` — verifies both migration files exist and contain the expected SQL keywords
4. Run tests; commit

---

## T-010: Write src/embedding/chunker.ts

**Steps:**
1. Create `src/embedding/chunker.ts` with a function that splits text into chunks based on `MAX_CHUNK_SIZE` and `CHUNK_OVERLAP` from config
2. Implement a simple token estimation (rough approximation: ~4 characters per token)
3. Return array of `{ content: string; chunkIndex: number; tokenEstimate: number }` for each chunk
4. Write `__tests__/embedding/chunker.test.ts` with tests for: short text, long text with overlap, empty string, single-word input
5. Run tests; if passing, commit with type `feat(embedding)`

