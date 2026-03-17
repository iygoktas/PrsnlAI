# CLAUDE.md — Personal AI Knowledge Base

## Read these files in order before doing anything
1. This file (CLAUDE.md) — rules and autonomy boundaries
2. docs/PRD.md — what we're building and why
3. docs/ARCHITECTURE.md — technical decisions and stack
4. docs/TASKS.md — what to work on next

---

## Autonomy rules

### Do WITHOUT asking for approval
- Create, edit, or delete any file
- `npm install`, `pip install`, or any package installation
- `git add`, `git commit`, `git push`
- Create new folders and modules
- Write and run tests
- Refactor and clean up code
- Update `.env.example` (never put real secrets in it)

### STOP and explain before doing
- Write to production database (outside of seeds/migrations)
- Make a paid external API call (ask once during initial setup for OpenAI/Anthropic)
- Modify an existing migration file
- `git push --force`
- Permanently delete a file (always commit first)

---

## Work loop

Follow this sequence for every task:

```
1. Pick the first unchecked [ ] task from docs/TASKS.md
2. Read relevant files (ARCHITECTURE.md + affected src files)
3. Write a 3–5 step implementation plan in docs/PLANS.md
4. Write the code
5. Write tests and run them (`npm test` or `pytest`)
6. If tests pass: git add -A && git commit -m "<type>: <description>"
7. Mark the task [x] in TASKS.md
8. Move on to the next task
```

On error: try to fix it yourself twice. On the third failed attempt, stop and explain what you tried.

---

## Git commit format (Conventional Commits)

```
feat: add new feature
fix: correct a bug
refactor: change code without changing behavior
test: add or update tests
docs: documentation changes
chore: build, config, dependency updates
```

Keep each commit atomic — one logical change per commit.

---

## Code standards

### General
- TypeScript strict mode on — never use `any`
- JSDoc comment above every public function
- All code and comments in English
- No `console.log` — use the `logger` utility
- No magic numbers — define named constants

### Folder layout
```
src/
├── ingestion/       ← Data intake pipelines (PDF, URL, text, image)
├── embedding/       ← Embedding generation and management
├── storage/         ← Vector DB and metadata DB operations
├── search/          ← Semantic search and retrieval
├── api/             ← REST API route handlers
├── ui/              ← Frontend (Next.js pages and components)
├── lib/             ← Shared utilities
└── types/           ← Global TypeScript types
```

### Testing
- At least one unit test per new function
- Integration tests for every API endpoint
- Test files live in `__tests__/` mirroring the module name

---

## Dev commands

```bash
npm run dev          # Next.js dev server
npm test             # Jest test suite
npm run db:migrate   # Push Prisma schema to Supabase
npm run db:seed      # Insert seed data
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
```

If `.env` doesn't exist, copy `.env.example` and fill in the values.

---

## Critical dependencies

Before adding any package not listed in ARCHITECTURE.md, write a short ADR in docs/DECISIONS.md explaining why you chose it.

## Model usage
- Use claude-haiku-4-5-20251001 for: reading files, writing boilerplate,
  updating TASKS.md, updating PLANS.md, running commands, writing tests
- Use claude-sonnet-4-6 for: complex business logic, debugging hard errors,
  architecture decisions, ingestion pipeline, vector search implementation
