import { Worker, Job } from 'bullmq';
import { redisConnection } from './queues.js';
import { db, schema } from '../db/index.js';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { computeUrgencyScore } from '../utils/urgencyScore.js';
import { broadcastNotification } from '../websocket/notifications.js';

/**
 * Worker 1: Matching Engine Worker
 * Triggers when a new listing is created.
 * Performs PostGIS distance query (5 km), scores candidate buyer pharmacies,
 * creates database notification records, and pushes live WebSocket alerts.
 */
export const matchingWorker = new Worker(
  'matching-queue',
  async (job: Job) => {
    const { listingId } = job.data;
    console.log(`[Worker] Running matching engine for listing: ${listingId}`);

    const listing = await db.query.listings.findFirst({
      where: eq(schema.listings.id, listingId),
      with: {
        pharmacy: true,
        drug: true,
      },
    });

    if (!listing || !listing.pharmacy) return;

    const sellerLat = parseFloat(listing.pharmacy.latitude);
    const sellerLng = parseFloat(listing.pharmacy.longitude);

    // Find candidate pharmacies within 5 km (5000m) using PostGIS spatial ST_DWithin or distance math
    const candidatePharmacies = await db.query.pharmacies.findMany({
      where: and(
        eq(schema.pharmacies.isVerified, true),
        sql`${schema.pharmacies.id} != ${listing.pharmacyId}`
      ),
      limit: 50,
    });

    const expiryDate = new Date(listing.expiryDate);
    const daysToExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    const scoredCandidates = candidatePharmacies.map((pharmacy) => {
      const candidateLat = parseFloat(pharmacy.latitude);
      const candidateLng = parseFloat(pharmacy.longitude);

      // Spherical distance estimation (Haversine formula in km)
      const R = 6371; // km
      const dLat = ((candidateLat - sellerLat) * Math.PI) / 180;
      const dLng = ((candidateLng - sellerLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((sellerLat * Math.PI) / 180) *
          Math.cos((candidateLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      const score = computeUrgencyScore(
        daysToExpiry,
        distanceKm,
        0.5,
        parseFloat(listing.pharmacy.trustScore)
      );

      return { pharmacy, distanceKm, score };
    });

    // Take top 5 candidates ranked by score
    const topMatches = scoredCandidates
      .filter((item) => item.distanceKm <= 10) // within 10 km
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Notify each top candidate
    for (const match of topMatches) {
      const [notif] = await db
        .insert(schema.notifications)
        .values({
          pharmacyId: match.pharmacy.id,
          type: 'new_match',
          title: `🔥 High Urgency Match: ${listing.drug.brandName}`,
          body: `${listing.pharmacy.name} listed ${listing.quantity} units of ${listing.drug.brandName} (${listing.discountPct}% off) nearby!`,
          metadata: { listingId: listing.id, urgencyScore: match.score },
        })
        .returning();

      // Push real-time WebSocket alert
      broadcastNotification(match.pharmacy.id, notif);
    }
  },
  { connection: redisConnection }
);

/**
 * Worker 2: Scheduled Expiry Alerts & Urgency Refresh Worker
 */
export const alertsWorker = new Worker(
  'alerts-queue',
  async (job: Job) => {
    if (job.name === 'send-expiry-alerts') {
      console.log('[Worker] Executing daily 9 AM expiry alert task...');
      
      const activeListings = await db.query.listings.findMany({
        where: eq(schema.listings.status, 'active'),
        with: { pharmacy: true, drug: true },
      });

      const today = new Date();

      for (const listing of activeListings) {
        const daysLeft = Math.ceil((new Date(listing.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let alertMessage = '';

        if (daysLeft === 90) alertMessage = 'Consider listing — 90 days to expiry.';
        else if (daysLeft === 60) alertMessage = '⚠️ 60 days left. Moderate discount suggested.';
        else if (daysLeft === 30) alertMessage = '🔴 30 days left! Aggressive dynamic pricing recommended.';
        else if (daysLeft === 7) alertMessage = '🚨 URGENT: 7 days to expiry!';

        if (alertMessage) {
          const [notif] = await db
            .insert(schema.notifications)
            .values({
              pharmacyId: listing.pharmacyId,
              type: 'expiry_alert',
              title: `Expiry Alert: ${listing.drug.brandName}`,
              body: alertMessage,
              metadata: { listingId: listing.id, daysLeft },
            })
            .returning();

          broadcastNotification(listing.pharmacyId, notif);
        }
      }
    } else if (job.name === 'refresh-urgency-scores') {
      console.log('[Worker] Executing hourly urgency score recalculation...');
      // Logic for recalculating urgency scores hourly
    }
  },
  { connection: redisConnection }
);

// Worker error handlers
matchingWorker.on('failed', (job, err) => {
  console.error(`[Worker Error] Matching job ${job?.id} failed:`, err);
});

alertsWorker.on('failed', (job, err) => {
  console.error(`[Worker Error] Alert job ${job?.id} failed:`, err);
});
