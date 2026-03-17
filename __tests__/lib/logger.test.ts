/**
 * Tests for src/lib/logger.ts
 */

describe('logger', () => {
  beforeEach(() => {
    // Set up required env vars for config to load
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.DIRECT_URL = 'postgresql://test';
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
  });

  it('exports a winston logger instance', async () => {
    jest.resetModules();
    const { logger } = await import('@/lib/logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('uses LOG_LEVEL from config', async () => {
    jest.resetModules();
    process.env.LOG_LEVEL = 'debug';
    const { logger } = await import('@/lib/logger');
    expect(logger.level).toBe('debug');
  });

  it('defaults to info level when LOG_LEVEL is not set', async () => {
    jest.resetModules();
    delete process.env.LOG_LEVEL;
    const { logger } = await import('@/lib/logger');
    // Default from config schema is 'info'
    expect(logger.level).toBe('info');
  });

  it('has exactly one Console transport', async () => {
    jest.resetModules();
    const { logger } = await import('@/lib/logger');
    const consoleTransports = logger.transports.filter(
      (t) => t instanceof require('winston').transports.Console
    );
    expect(consoleTransports).toHaveLength(1);
  });
});
