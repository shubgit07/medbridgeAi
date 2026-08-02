import { Queue } from 'bullmq';
import { config } from '../config.js';

// Parse Redis URL or default host/port
function getRedisConnection() {
  try {
    const url = new URL(config.redisUrl);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '6379', 10),
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

export const redisConnection = getRedisConnection();

// Initialize BullMQ Queues
export const matchingQueue = new Queue('matching-queue', {
  connection: redisConnection,
});

export const alertsQueue = new Queue('alerts-queue', {
  connection: redisConnection,
});

/**
 * Enqueues a matching job when a new medicine listing is created.
 */
export async function enqueueMatchingJob(listingId: string) {
  try {
    await matchingQueue.add('run-matching-engine', { listingId });
  } catch (err) {
    console.error('Failed to enqueue matching job:', err);
  }
}

/**
 * Registers daily and hourly scheduled (cron) alert jobs.
 * - Daily 9 AM: Expiry alerts for T-90, T-60, T-30, T-7 days
 * - Hourly: Refresh active listing urgency scores
 */
export async function setupScheduledAlertJobs() {
  try {
    // Upsert Job Schedulers (BullMQ v5/v6 syntax)
    if (typeof (alertsQueue as any).upsertJobScheduler === 'function') {
      await (alertsQueue as any).upsertJobScheduler(
        'daily-expiry-alerts-scheduler',
        { pattern: '0 9 * * *' }, // 9:00 AM daily
        { name: 'send-expiry-alerts', data: {} }
      );

      await (alertsQueue as any).upsertJobScheduler(
        'hourly-urgency-refresh-scheduler',
        { pattern: '0 * * * *' }, // Every hour
        { name: 'refresh-urgency-scores', data: {} }
      );
    } else {
      // Fallback for earlier versions
      await alertsQueue.add('send-expiry-alerts', {}, { repeat: { pattern: '0 9 * * *' } });
      await alertsQueue.add('refresh-urgency-scores', {}, { repeat: { pattern: '0 * * * *' } });
    }
  } catch (err) {
    console.warn('Could not register scheduled BullMQ jobs (Redis may be offline in dev):', err);
  }
}
