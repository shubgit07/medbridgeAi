import { FastifyInstance } from 'fastify';
import { db, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';

/**
 * GET /inventory - the authenticated pharmacy's own stock.
 * Backs the dashboard stats/value-at-risk and the inventory catalog screen.
 */
export async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userPayload = request.user as { userId: string };

      const pharmacy = await db.query.pharmacies.findFirst({
        where: eq(schema.pharmacies.userId, userPayload.userId),
      });

      if (!pharmacy) {
        return reply.status(404).send({ error: 'Pharmacy profile not found' });
      }

      const rows = await db.query.listings.findMany({
        where: eq(schema.listings.pharmacyId, pharmacy.id),
        with: {
          drug: true,
        },
        orderBy: (listings, { asc }) => [asc(listings.expiryDate)],
      });

      const now = Date.now();
      const inventory = rows.map((row) => {
        const expiry = new Date(row.expiryDate);
        return {
          medicine_id: row.id,
          brand_name: row.drug?.brandName ?? 'Medicine',
          generic_name: row.drug?.saltName ?? '',
          dosage_form: row.drug?.form ?? undefined,
          batch_number: row.batchNumber,
          stock_qty: row.quantity,
          expiry_date: row.expiryDate,
          price: Number(row.askingPrice),
          mrp: Number(row.mrp),
          days_left: Math.ceil((expiry.getTime() - now) / (1000 * 60 * 60 * 24)),
        };
      });

      // Frontend expects a top-level array
      return reply.send(inventory);
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to load inventory' });
    }
  });
}
