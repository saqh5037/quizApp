/**
 * healthCheck.ts — dependency probes for readiness endpoints.
 *
 * Used by /health/ready. Each probe has a short timeout so a slow dependency
 * can't make the whole endpoint hang. Checks are intentionally cheap (SELECT 1,
 * bucketExists) — this is a liveness signal, not a smoke test.
 */

import { sequelize } from '../config/database';
import logger from './logger';

export type ProbeStatus = 'ok' | 'degraded' | 'down' | 'skipped';

export interface ProbeResult {
  name: string;
  status: ProbeStatus;
  latencyMs?: number;
  error?: string;
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

const probe = async (name: string, fn: () => Promise<void>): Promise<ProbeResult> => {
  const start = Date.now();
  try {
    await fn();
    return { name, status: 'ok', latencyMs: Date.now() - start };
  } catch (err: any) {
    logger.warn('Health probe failed', { probe: name, error: err?.message || err });
    return {
      name,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err?.message || 'unknown error',
    };
  }
};

export const checkDatabase = async (): Promise<ProbeResult> =>
  probe('database', async () => {
    await withTimeout(sequelize.authenticate(), 2000, 'database.authenticate');
  });

export const checkMinio = async (): Promise<ProbeResult> =>
  probe('minio', async () => {
    // Lazy import — MinIO service throws at construction when env vars are
    // missing. If it's not configured, treat the probe as skipped rather
    // than crashing the endpoint.
    try {
      const minioModule = await import('../services/minio.service');
      const minioService: any = minioModule.default;
      if (!minioService) throw new Error('minio service not initialized');
      const bucket = process.env.MINIO_BUCKET_NAME || 'aristotest-videos';
      await withTimeout(minioService.client.bucketExists(bucket), 2000, 'minio.bucketExists');
    } catch (err: any) {
      // Re-throw so probe() captures it
      throw err;
    }
  });

export const checkRedis = async (): Promise<ProbeResult> => {
  // Redis is optional — only probe if host/port are set.
  if (!process.env.REDIS_HOST) {
    return { name: 'redis', status: 'skipped' };
  }
  return probe('redis', async () => {
    const IORedis = await import('ioredis').then((m) => m.default);
    const client = new IORedis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    try {
      await withTimeout(client.connect(), 2000, 'redis.connect');
      await withTimeout(client.ping().then(() => undefined), 2000, 'redis.ping');
    } finally {
      client.disconnect();
    }
  });
};

export interface ReadinessReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  checks: ProbeResult[];
}

/**
 * Run all readiness probes in parallel and aggregate the result.
 * Returns 'down' if any non-optional probe failed, 'degraded' if an optional
 * probe (redis) failed, 'ok' otherwise.
 */
export const runReadinessChecks = async (): Promise<ReadinessReport> => {
  const [database, minio, redis] = await Promise.all([
    checkDatabase(),
    checkMinio(),
    checkRedis(),
  ]);

  const checks: ProbeResult[] = [database, minio, redis];

  let status: ReadinessReport['status'] = 'ok';
  if (database.status === 'down' || minio.status === 'down') {
    status = 'down';
  } else if (redis.status === 'down') {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
};
