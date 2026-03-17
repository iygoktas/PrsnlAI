/**
 * Tests for src/lib/config.ts
 * We use jest.resetModules() to re-import the module with different env vars
 * for each scenario.
 */

const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/mydb',
  DIRECT_URL: 'postgresql://user:pass@db.example.com:5432/mydb',
};

/**
 * Loads config module with a fresh environment.
 */
async function loadConfig(env: Record<string, string>) {
  jest.resetModules();
  const prev = { ...process.env };
  // Clear all known keys then set the provided ones
  Object.keys(prev).forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);
  try {
    const mod = await import('@/lib/config');
    return mod.config;
  } finally {
    // Restore original env
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, prev);
  }
}

describe('config', () => {
  it('parses a valid environment with defaults', async () => {
    const config = await loadConfig(REQUIRED_ENV);
    expect(config.DATABASE_URL).toBe(REQUIRED_ENV.DATABASE_URL);
    expect(config.DIRECT_URL).toBe(REQUIRED_ENV.DIRECT_URL);
    expect(config.EMBEDDING_PROVIDER).toBe('openai');
    expect(config.LLM_PROVIDER).toBe('anthropic');
    expect(config.MAX_CHUNK_SIZE).toBe(512);
    expect(config.CHUNK_OVERLAP).toBe(64);
    expect(config.SEARCH_TOP_K).toBe(5);
    expect(config.SIMILARITY_THRESHOLD).toBe(0.7);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.NODE_ENV).toBe('development');
  });

  it('coerces numeric string values to numbers', async () => {
    const config = await loadConfig({
      ...REQUIRED_ENV,
      MAX_CHUNK_SIZE: '256',
      CHUNK_OVERLAP: '32',
      SEARCH_TOP_K: '10',
      SIMILARITY_THRESHOLD: '0.8',
    });
    expect(config.MAX_CHUNK_SIZE).toBe(256);
    expect(config.CHUNK_OVERLAP).toBe(32);
    expect(config.SEARCH_TOP_K).toBe(10);
    expect(config.SIMILARITY_THRESHOLD).toBe(0.8);
  });

  it('accepts "local" for EMBEDDING_PROVIDER and LLM_PROVIDER', async () => {
    const config = await loadConfig({
      ...REQUIRED_ENV,
      EMBEDDING_PROVIDER: 'local',
      LLM_PROVIDER: 'local',
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text',
      OLLAMA_LLM_MODEL: 'llama3.2',
    });
    expect(config.EMBEDDING_PROVIDER).toBe('local');
    expect(config.LLM_PROVIDER).toBe('local');
    expect(config.OLLAMA_EMBEDDING_MODEL).toBe('nomic-embed-text');
    expect(config.OLLAMA_LLM_MODEL).toBe('llama3.2');
  });

  it('throws when DATABASE_URL is missing', async () => {
    await expect(loadConfig({ DIRECT_URL: REQUIRED_ENV.DIRECT_URL })).rejects.toThrow(
      'Invalid environment configuration'
    );
  });

  it('throws when DIRECT_URL is missing', async () => {
    await expect(loadConfig({ DATABASE_URL: REQUIRED_ENV.DATABASE_URL })).rejects.toThrow(
      'Invalid environment configuration'
    );
  });

  it('throws when EMBEDDING_PROVIDER has an invalid value', async () => {
    await expect(
      loadConfig({ ...REQUIRED_ENV, EMBEDDING_PROVIDER: 'pinecone' })
    ).rejects.toThrow('Invalid environment configuration');
  });

  it('throws when LOG_LEVEL has an invalid value', async () => {
    await expect(
      loadConfig({ ...REQUIRED_ENV, LOG_LEVEL: 'verbose' })
    ).rejects.toThrow('Invalid environment configuration');
  });

  it('uses ANTHROPIC_MODEL default when not set', async () => {
    const config = await loadConfig(REQUIRED_ENV);
    expect(config.ANTHROPIC_MODEL).toBe('claude-haiku-4-5-20251001');
  });
});
