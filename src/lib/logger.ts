import winston from 'winston';
import { config } from '@/lib/config';

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

/**
 * Application-wide Winston logger.
 * - Development / test: colorized, human-readable output
 * - Production: structured JSON output
 * Log level is controlled by the LOG_LEVEL environment variable.
 */
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: config.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
