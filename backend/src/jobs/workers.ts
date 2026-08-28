import { Job, Worker } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computeSuggestedPrice } from '../utils/dynamicPricing.js';
import { computeUrgencyScore } from '../utils/urgencyScore.js';
import { broadcastNotification } from '../websocket/notifications.js';
import { extractMedicine } from '../services/medicineExtraction.js';
import { alertsQueue, matchingQueue, ocrQueue, redisConnection } from './queues.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(value: string | Date, now = new Date()) {
  return Math.ceil((new Date(value).getTime() - now.getTime()) / DAY_MS);
}

/** Finds candidates with the indexed PostGIS geography column before scoring them. */
export const matchingWorker = new Worker(
  matchingQueue.name,
  async (job: Job<{ listingId: string }>) => {
    const listing = await db.query.listings.findFirst({
      where: eq(schema.listings.id, job.data.listingId),
      with: { pharmacy: true, drug: true },
    });
    if (!listing || listing.status !== 'active' || !listing.pharmacy || !listing.drug) return;

    const candidates = await db.execute<{
      pharmacy_id: string;
      pharmacy_name: string;
      trust_score: string;
      demand_count: number | null;
      distance_meters: number;
    }>(sql`
      SELECT buyer.id AS pharmacy_id,
             buyer.name AS pharmacy_name,
             buyer.trust_score,
             COALESCE(SUM(ds.signal_count), 0)::int AS demand_count,
             ST_Distance(buyer.location, seller.location) AS distance_meters
      FROM pharmacies buyer
      CROSS JOIN pharmacies seller
      LEFT JOIN demand_signals ds
        ON ds.drug_id = ${listing.drugId}
       AND ds.week_start >= CURRENT_DATE - INTERVAL '28 days'
       AND (ds.pincode = buyer.pincode OR ds.city = buyer.city)
      WHERE seller.id = ${listing.pharmacyId}
        AND buyer.id <> seller.id
        AND buyer.is_verified = true
        AND buyer.location IS NOT NULL
        AND seller.location IS NOT NULL
        AND ST_DWithin(buyer.location, seller.location, 10000)
      GROUP BY buyer.id, buyer.name, buyer.trust_score, buyer.location, seller.location
      ORDER BY distance_meters ASC
      LIMIT 50
    `);

    const daysToExpiry = daysUntil(listing.expiryDate);
    const topMatches = candidates.rows
      .map((candidate) => {
        const demandSignal = Math.min(1, Number(candidate.demand_count || 0) / 10);
        const distanceKm = Number(candidate.distance_meters) / 1000;
        return {
          ...candidate,
          distanceKm,
          score: computeUrgencyScore(daysToExpiry, distanceKm, demandSignal, Number(candidate.trust_score)),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const match of topMatches) {
      const [notification] = await db.insert(schema.notifications).values({
        pharmacyId: match.pharmacy_id,
        type: 'new_match',
        title: `New nearby stock: ${listing.drug.brandName}`,
        body: `${listing.pharmacy.name} listed ${listing.quantity} units at ${listing.discountPct}% below MRP, ${match.distanceKm.toFixed(1)} km away.`,
        metadata: {
          listingId: listing.id,
          urgencyScore: match.score,
          distanceKm: Number(match.distanceKm.toFixed(2)),
        },
      }).returning();
      broadcastNotification(match.pharmacy_id, notification);
    }
  },
  { connection: redisConnection, concurrency: 10 },
);

export const alertsWorker = new Worker(
  alertsQueue.name,
  async (job: Job) => {
    if (job.name === 'send-expiry-alerts') {
      const listings = await db.query.listings.findMany({
        where: eq(schema.listings.status, 'active'),
        with: { pharmacy: true, drug: true },
      });
      const alertWindows = new Map([[90, '90 days to expiry. Review the batch and consider listing it.'], [60, '60 days to expiry. Moderate discounting can protect recovery.'], [30, '30 days to expiry. Aggressive dynamic pricing is recommended.'], [7, '7 days to expiry. This batch needs immediate action.']]);

      for (const listing of listings) {
        const daysLeft = daysUntil(listing.expiryDate);
        const body = alertWindows.get(daysLeft);
        if (!body) continue;
        const [notification] = await db.insert(schema.notifications).values({
          pharmacyId: listing.pharmacyId,
          type: 'expiry_alert',
          title: `Expiry alert: ${listing.drug?.brandName || 'Medicine batch'}`,
          body,
          metadata: { listingId: listing.id, daysLeft },
        }).returning();
        broadcastNotification(listing.pharmacyId, notification);
      }
    }

    if (job.name === 'refresh-urgency-scores') {
      const listings = await db.query.listings.findMany({
        where: eq(schema.listings.status, 'active'),
        with: { pharmacy: true },
      });
      for (const listing of listings) {
        const daysLeft = daysUntil(listing.expiryDate);
        const urgencyScore = computeUrgencyScore(daysLeft, 0, 0.5, Number(listing.pharmacy?.trustScore || 0.5));
        const price = computeSuggestedPrice(Number(listing.mrp), daysLeft);
        await db.update(schema.listings).set({
          urgencyScore: urgencyScore.toString(),
          askingPrice: price.suggestedPrice.toString(),
          discountPct: price.discountPct.toString(),
          status: daysLeft <= 0 ? 'expired' : listing.status,
          updatedAt: new Date(),
        }).where(eq(schema.listings.id, listing.id));
      }
    }
  },
  { connection: redisConnection, concurrency: 2 },
);

export const ocrWorker = new Worker(
  ocrQueue.name,
  async (job: Job<{ jobId: string; text?: string; imageBase64?: string; mimeType?: string }>) => {
    const { jobId, text, imageBase64, mimeType } = job.data;
    await db.update(schema.ocrJobs).set({ status: 'processing', updatedAt: new Date() }).where(eq(schema.ocrJobs.id, jobId));
    try {
      const result = await extractMedicine({ text, imageBase64, mimeType });
      await db.update(schema.ocrJobs).set({
        status: 'completed',
        provider: result.provider,
        result: result.data,
        updatedAt: new Date(),
        completedAt: new Date(),
      }).where(eq(schema.ocrJobs.id, jobId));
      const jobRow = await db.query.ocrJobs.findFirst({ where: eq(schema.ocrJobs.id, jobId) });
      if (jobRow) {
        const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, jobRow.requestedBy) });
        if (pharmacy) broadcastNotification(pharmacy.id, { type: 'ocr_completed', jobId, provider: result.provider, data: result.data });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR extraction failed';
      await db.update(schema.ocrJobs).set({ status: 'failed', error: message, updatedAt: new Date() }).where(eq(schema.ocrJobs.id, jobId));
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 5 },
);

for (const worker of [matchingWorker, alertsWorker, ocrWorker]) {
  worker.on('failed', (job, error) => console.error(`[Worker Error] ${worker.name} job ${job?.id} failed`, error));
}
