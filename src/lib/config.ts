import { z } from 'zod';

const envSchema = z.object({
  // ── Database ────────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // ── Embedding provider ───────────────────────────────────────────────────────
  EMBEDDING_PROVIDER: z.enum(['openai', 'local']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().optional(),

  // ── LLM provider ────────────────────────────────────────────────────────────
  LLM_PROVIDER: z.enum(['anthropic', 'local']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  OLLAMA_LLM_MODEL: z.string().optional(),

  // ── Chunking ─────────────────────────────────────────────────────────────────
  MAX_CHUNK_SIZE: z.coerce.number().int().positive().default(512),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(64),

  // ── Search ───────────────────────────────────────────────────────────────────
  SEARCH_TOP_K: z.coerce.number().int().positive().default(5),
  SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),

  // ── Logging ──────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // ── App ──────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Parsed and typed environment configuration.
 * Throws a ZodError with a descriptive message at module load time if any
 * required variable is missing or malformed.
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${messages}`);
}

export const config = parsed.data;
