import { logAudit } from '@/storage/audit';
import { logger } from '@/lib/logger';

interface CaptureOptions {
  userId: string;
  orgId: string;
  resource?: { id: string; type: string };
}

/**
 * Wraps an async operation with audit logging.
 * Logs start time, end time, duration, and success/failure.
 * Audit log failures never propagate — they are swallowed and warned.
 *
 * @param action   The audit action name (e.g. 'SEARCH', 'UPLOAD')
 * @param fn       The async function to execute
 * @param options  Auth context and optional resource reference
 */
export async function captureAction<T>(
  action: string,
  fn: () => Promise<T>,
  options: CaptureOptions,
): Promise<T> {
  const startMs = Date.now();
  let success = true;
  let errorMessage: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const durationMs = Date.now() - startMs;
    try {
      await logAudit(
        options.userId,
        options.orgId,
        action,
        options.resource,
        { durationMs, success, ...(errorMessage ? { error: errorMessage } : {}) },
      );
    } catch (auditError) {
      logger.warn(`captureAction audit log failed (action=${action}): ${auditError}`);
    }
  }
}
