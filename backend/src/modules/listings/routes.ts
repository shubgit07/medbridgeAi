import { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { enqueueMatchingJob } from '../../jobs/queues.js';
import { computeSuggestedPrice } from '../../utils/dynamicPricing.js';
import { computeUrgencyScore } from '../../utils/urgencyScore.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS);
}

function isValidIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).default(10),
  drugId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
  maxDays: z.coerce.number().int().positive().max(3650).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export async function listingRoutes(fastify: FastifyInstance) {
  fastify.get('/suggest-price', async (request, reply) => {
    const parsed = z.object({ mrp: z.coerce.number().positive(), expiryDate: z.string() }).safeParse(request.query);
    if (!parsed.success || !isValidIsoDate(parsed.data.expiryDate)) {
      return reply.status(400).send({ error: 'Valid mrp and expiryDate (YYYY-MM-DD) are required' });
    }
    return reply.send({ suggestion: computeSuggestedPrice(parsed.data.mrp, daysUntil(parsed.data.expiryDate)) });
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userPayload = request.user as { userId: string };
      const sellerPharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userPayload.userId) });
      if (!sellerPharmacy) return reply.status(400).send({ error: 'Complete pharmacy onboarding before creating listings' });
      if (!sellerPharmacy.isVerified) return reply.status(403).send({ error: 'Pharmacy license verification is pending admin approval' });

      const parsed = z.object({
        drugId: z.string().uuid().optional(),
        brandName: z.string().trim().min(1).optional(),
        genericName: z.string().trim().min(1).optional(),
        manufacturer: z.string().trim().optional(),
        dosageForm: z.string().trim().optional(),
        batchNumber: z.string().trim().min(1).max(100),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        quantity: z.number().int().positive(),
        mrp: z.number().positive(),
        askingPrice: z.number().positive(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const data = parsed.data;
      if (data.askingPrice > data.mrp) return reply.status(400).send({ error: 'Asking price cannot exceed MRP' });
      if (!isValidIsoDate(data.expiryDate)) return reply.status(400).send({ error: 'expiryDate must be a real YYYY-MM-DD date' });
      const daysToExpiry = daysUntil(data.expiryDate);
      if (daysToExpiry <= 0) return reply.status(400).send({ error: 'Cannot list an expired medicine batch' });

      let targetDrugId = data.drugId;
      if (!targetDrugId) {
        const brandName = data.brandName || 'Uncatalogued medicine';
        const existing = await db.query.drugs.findFirst({ where: eq(schema.drugs.brandName, brandName) });
        if (existing) {
          targetDrugId = existing.id;
        } else {
          const [created] = await db.insert(schema.drugs).values({
            brandName,
            saltName: data.genericName || 'Unspecified active ingredient',
            manufacturer: data.manufacturer || null,
            form: data.dosageForm || null,
          }).returning();
          targetDrugId = created.id;
        }
      }

      const drug = await db.query.drugs.findFirst({ where: eq(schema.drugs.id, targetDrugId) });
      if (!drug) return reply.status(404).send({ error: 'Drug not found in master database' });
      if (drug.isScheduleX || drug.isNarcotic || drug.schedule?.toUpperCase() === 'X') {
        return reply.status(400).send({ error: 'Schedule X and narcotic medicines cannot be traded on MedBridge' });
      }

      const discountPct = Number((((data.mrp - data.askingPrice) / data.mrp) * 100).toFixed(2));
      const urgencyScore = computeUrgencyScore(daysToExpiry, 0, 0.5, Number(sellerPharmacy.trustScore));
      const [listing] = await db.insert(schema.listings).values({
        pharmacyId: sellerPharmacy.id,
        drugId: targetDrugId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        quantity: data.quantity,
        mrp: data.mrp.toString(),
        askingPrice: data.askingPrice.toString(),
        discountPct: discountPct.toString(),
        urgencyScore: urgencyScore.toString(),
        status: 'active',
        expiresAt: data.expiryDate,
      }).returning();

      await db.insert(schema.auditLogs).values({
        actorId: userPayload.userId,
        action: 'listing.created',
        entityType: 'listing',
        entityId: listing.id,
        newData: listing,
        ipAddress: request.ip,
      });
      await enqueueMatchingJob(listing.id);
      return reply.status(201).send({ message: 'Listing created successfully', listing, calculatedUrgencyScore: urgencyScore });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create listing' });
    }
  });

  // PostGIS does the radius filter and distance calculation; only the bounded result set reaches Node.
  fastify.get('/nearby', async (request, reply) => {
    const parsed = querySchema.extend({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }).safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { lat, lng, radiusKm, drugId, q, maxDays, limit } = parsed.data;
    const rows = await db.execute<{
      id: string; batch_number: string; expiry_date: string; quantity: number; mrp: string; asking_price: string;
      discount_pct: string; urgency_score: string | null; pharmacy_id: string; pharmacy_name: string;
      is_verified: boolean; brand_name: string; salt_name: string; manufacturer: string | null; form: string | null;
      distance_km: number;
    }>(sql`
      SELECT l.id, l.batch_number, l.expiry_date, l.quantity, l.mrp, l.asking_price,
             l.discount_pct, l.urgency_score, p.id AS pharmacy_id, p.name AS pharmacy_name,
             p.is_verified, d.brand_name, d.salt_name, d.manufacturer, d.form,
             ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 AS distance_km
      FROM listings l
      JOIN pharmacies p ON p.id = l.pharmacy_id
      JOIN drugs d ON d.id = l.drug_id
      WHERE l.status = 'active'
        AND p.is_verified = true
        AND p.location IS NOT NULL
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
        ${drugId ? sql`AND d.id = ${drugId}` : sql``}
        ${q ? sql`AND (d.brand_name ILIKE ${`%${q}%`} OR d.salt_name ILIKE ${`%${q}%`})` : sql``}
        ${maxDays ? sql`AND l.expiry_date <= CURRENT_DATE + ${maxDays}::int` : sql``}
      ORDER BY l.urgency_score DESC NULLS LAST, distance_km ASC
      LIMIT ${limit}
    `);
    return reply.send({ listings: rows.rows.map((row) => ({
      id: row.id,
      batchNumber: row.batch_number,
      expiryDate: row.expiry_date,
      quantity: row.quantity,
      mrp: row.mrp,
      askingPrice: row.asking_price,
      discountPct: row.discount_pct,
      urgencyScore: row.urgency_score,
      distanceKm: Number(row.distance_km),
      pharmacy: { id: row.pharmacy_id, name: row.pharmacy_name, isVerified: row.is_verified },
      drug: { brandName: row.brand_name, saltName: row.salt_name, manufacturer: row.manufacturer, form: row.form },
    })) });
  });

  fastify.get('/', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { drugId, q, maxDays, limit } = parsed.data;
    const filters = [eq(schema.listings.status, 'active')];
    if (drugId) filters.push(eq(schema.listings.drugId, drugId));
    if (q) filters.push(sql`EXISTS (SELECT 1 FROM drugs d WHERE d.id = ${schema.listings.drugId} AND (d.brand_name ILIKE ${`%${q}%`} OR d.salt_name ILIKE ${`%${q}%`}))`);
    if (maxDays) filters.push(sql`${schema.listings.expiryDate} <= CURRENT_DATE + ${maxDays}::int`);
    const listings = await db.query.listings.findMany({
      where: and(...filters, sql`EXISTS (SELECT 1 FROM pharmacies p WHERE p.id = ${schema.listings.pharmacyId} AND p.is_verified = true)`),
      with: { pharmacy: true, drug: true },
      orderBy: [desc(schema.listings.urgencyScore), desc(schema.listings.listedAt)],
      limit,
    });
    return reply.send({ listings: listings.map((listing) => ({
      ...listing,
      pharmacy: {
        id: listing.pharmacy.id,
        name: listing.pharmacy.name,
        city: listing.pharmacy.city,
        pincode: listing.pharmacy.pincode,
        isVerified: listing.pharmacy.isVerified,
      },
    })) });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const listing = await db.query.listings.findFirst({ where: eq(schema.listings.id, id), with: { pharmacy: true, drug: true } });
    if (!listing) return reply.status(404).send({ error: 'Listing not found' });
    return reply.send({ listing: {
      ...listing,
      pharmacy: {
        id: listing.pharmacy.id,
        name: listing.pharmacy.name,
        city: listing.pharmacy.city,
        pincode: listing.pharmacy.pincode,
        isVerified: listing.pharmacy.isVerified,
      },
    } });
  });
}
