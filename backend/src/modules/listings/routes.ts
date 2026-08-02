import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { computeSuggestedPrice } from '../../utils/dynamicPricing.js';
import { computeUrgencyScore } from '../../utils/urgencyScore.js';

export async function listingRoutes(fastify: FastifyInstance) {
  // GET /listings/suggest-price?mrp=100&expiryDate=2026-09-30
  fastify.get('/suggest-price', async (request, reply) => {
    const schemaQuery = z.object({
      mrp: z.string().transform((v) => parseFloat(v)),
      expiryDate: z.string(),
    });

    const parse = schemaQuery.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Valid mrp and expiryDate (YYYY-MM-DD) are required' });
    }

    const { mrp, expiryDate } = parse.data;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const priceInfo = computeSuggestedPrice(mrp, daysToExpiry);

    return reply.send({ suggestion: priceInfo });
  });

  // POST /listings - Create new medicine listing
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    // Fetch seller pharmacy profile
    const sellerPharmacy = await db.query.pharmacies.findFirst({
      where: eq(schema.pharmacies.userId, userPayload.userId),
    });

    if (!sellerPharmacy) {
      return reply.status(400).send({ error: 'You must complete pharmacy onboarding before creating listings' });
    }

    if (!sellerPharmacy.isVerified) {
      return reply.status(403).send({ error: 'Your pharmacy license verification is pending admin approval' });
    }

    const bodySchema = z.object({
      drugId: z.string().uuid(),
      batchNumber: z.string().min(1),
      expiryDate: z.string(), // YYYY-MM-DD
      quantity: z.number().int().positive(),
      mrp: z.number().positive(),
      askingPrice: z.number().positive(),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const data = parse.data;

    // Regulatory Check: Schedule X & Narcotic Guard
    const drug = await db.query.drugs.findFirst({
      where: eq(schema.drugs.id, data.drugId),
    });

    if (!drug) {
      return reply.status(404).send({ error: 'Drug not found in master database' });
    }

    if (drug.isScheduleX || drug.isNarcotic) {
      return reply.status(400).send({
        error: 'Regulatory Violation: Schedule X and Narcotic controlled substances cannot be traded on this platform',
      });
    }

    const expiry = new Date(data.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry <= 0) {
      return reply.status(400).send({ error: 'Cannot list medicines that are already expired' });
    }

    const discountPct = (((data.mrp - data.askingPrice) / data.mrp) * 100).toFixed(2);
    const urgencyScore = computeUrgencyScore(daysToExpiry, 0, 0.5, parseFloat(sellerPharmacy.trustScore));

    const [newListing] = await db
      .insert(schema.listings)
      .values({
        pharmacyId: sellerPharmacy.id,
        drugId: data.drugId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        quantity: data.quantity,
        mrp: data.mrp.toString(),
        askingPrice: data.askingPrice.toString(),
        discountPct,
        urgencyScore: urgencyScore.toString(),
        status: 'active',
        expiresAt: data.expiryDate,
      })
      .returning();

    return reply.status(201).send({
      message: 'Listing created successfully',
      listing: newListing,
      calculatedUrgencyScore: urgencyScore,
    });
  });

  // GET /listings - Browse active listings
  fastify.get('/', async (request, reply) => {
    const activeListings = await db.query.listings.findMany({
      where: eq(schema.listings.status, 'active'),
      with: {
        pharmacy: true,
        drug: true,
      },
      limit: 50,
    });

    return reply.send({ listings: activeListings });
  });

  // GET /listings/:id - Fetch single listing detail
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const listing = await db.query.listings.findFirst({
      where: eq(schema.listings.id, id),
      with: {
        pharmacy: true,
        drug: true,
      },
    });

    if (!listing) {
      return reply.status(404).send({ error: 'Listing not found' });
    }

    return reply.send({ listing });
  });
}
