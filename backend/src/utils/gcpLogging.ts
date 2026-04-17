/**
 * gcpLogging.ts — Google Cloud observability bridge for the AristoTest backend.
 *
 * Status: scaffolding. The code is self-contained and safe to ship even when
 * the Google Cloud packages are not installed — it dynamically imports them
 * only if the relevant env vars are set.
 *
 * To activate:
 *   1. `npm install @google-cloud/logging @google-cloud/error-reporting`
 *   2. Create a service account with roles:
 *        roles/logging.logWriter
 *        roles/errorreporting.writer
 *      Download the JSON key.
 *   3. Set these env vars on the server:
 *        GCP_PROJECT_ID=<project>
 *        GOOGLE_APPLICATION_CREDENTIALS=<absolute path to service account json>
 *        GCP_LOG_NAME=aristotest-backend     (optional, default shown)
 *        GCP_SERVICE_NAME=aristotest         (optional, used by Error Reporting)
 *        GCP_SERVICE_VERSION=<git sha>       (optional, release tag)
 *   4. Call `initGcpLogging()` once from server.ts before the logger is used,
 *      and call `reportError(err)` from error handlers.
 *
 * If any of the above is missing, all functions become no-ops — the app keeps
 * running with the local winston logger only.
 */

import logger from './logger';

let cloudLogging: any = null;
let errorReporter: any = null;
let initialized = false;

export const isGcpLoggingEnabled = (): boolean => {
  return Boolean(process.env.GCP_PROJECT_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS);
};

/**
 * Initialize Google Cloud Logging and Error Reporting clients.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * Does NOT throw on failure. A broken observability pipeline should never
 * take down the app.
 */
export const initGcpLogging = async (): Promise<void> => {
  if (initialized) return;
  initialized = true;

  if (!isGcpLoggingEnabled()) {
    logger.info('GCP observability disabled (GCP_PROJECT_ID or credentials missing)');
    return;
  }

  const projectId = process.env.GCP_PROJECT_ID!;
  const logName = process.env.GCP_LOG_NAME || 'aristotest-backend';
  const serviceName = process.env.GCP_SERVICE_NAME || 'aristotest';
  const serviceVersion = process.env.GCP_SERVICE_VERSION || 'unknown';

  try {
    // Dynamic imports so the packages are optional at install time.
    const [{ Logging }, { ErrorReporting }] = await Promise.all([
      import('@google-cloud/logging' as any),
      import('@google-cloud/error-reporting' as any),
    ]);

    const logging = new Logging({ projectId });
    cloudLogging = logging.log(logName);

    errorReporter = new ErrorReporting({
      projectId,
      serviceContext: { service: serviceName, version: serviceVersion },
      reportMode: 'production',
    });

    logger.info('GCP observability initialized', {
      projectId,
      logName,
      serviceName,
      serviceVersion,
    });
  } catch (err: any) {
    logger.warn('Failed to initialize GCP observability (continuing with local logs only)', {
      error: err?.message || err,
    });
    cloudLogging = null;
    errorReporter = null;
  }
};

/**
 * Forward a structured log entry to Cloud Logging.
 * Fails silently — never throws.
 */
export const cloudLog = async (
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
  message: string,
  payload?: Record<string, any>
): Promise<void> => {
  if (!cloudLogging) return;
  try {
    const metadata = {
      severity,
      resource: { type: 'global' },
    };
    const entry = cloudLogging.entry(metadata, {
      message,
      ...payload,
    });
    await cloudLogging.write(entry);
  } catch (err: any) {
    // Fall through — we already wrote to the local logger.
    logger.debug('cloudLog write failed', { error: err?.message || err });
  }
};

/**
 * Report an error to Google Cloud Error Reporting.
 * Safe to call when observability is disabled.
 */
export const reportError = (
  error: Error | unknown,
  context?: { user?: string; httpRequest?: any; [k: string]: any }
): void => {
  if (!errorReporter) return;
  try {
    if (error instanceof Error) {
      errorReporter.report(error, context?.httpRequest, context);
    } else {
      errorReporter.report(new Error(String(error)), context?.httpRequest, context);
    }
  } catch (err: any) {
    logger.debug('reportError failed', { error: err?.message || err });
  }
};
