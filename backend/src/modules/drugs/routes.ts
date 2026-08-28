import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { ilike, or, eq } from 'drizzle-orm';

export async function drugRoutes(fastify: FastifyInstance) {
  // GET /drugs/search?q=
  fastify.get('/search', async (request, reply) => {
    const querySchema = z.object({
      q: z.string().min(1),
    });

    const parse = querySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Search query parameter q is required' });
    }

    const { q } = parse.data;

    // Search by brand name OR generic salt name
    const matches = await db.query.drugs.findMany({
      where: or(
        ilike(schema.drugs.brandName, `%${q}%`),
        ilike(schema.drugs.saltName, `%${q}%`)
      ),
      limit: 20,
    });

    return reply.send({ query: q, results: matches });
  });

  // POST /drugs - Seed/Create Drug in Master
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const bodySchema = z.object({
      brandName: z.string().min(1),
      saltName: z.string().min(1),
      manufacturer: z.string().optional(),
      strength: z.string().optional(),
      form: z.string().optional(),
      schedule: z.string().optional(),
      isNarcotic: z.boolean().default(false),
      isScheduleX: z.boolean().default(false),
      barcodeGs1: z.string().optional(),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const [drug] = await db
      .insert(schema.drugs)
      .values(parse.data)
      .returning();

    return reply.status(201).send({ message: 'Drug created', drug });
  });

  // Records a buyer's local demand without exposing private pharmacy data to sellers.
  fastify.post('/:id/demand', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { id } = request.params as { id: string };
    const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    const drug = await db.query.drugs.findFirst({ where: eq(schema.drugs.id, id) });
    if (!pharmacy || !drug) return reply.status(404).send({ error: 'Pharmacy or drug not found' });

    const now = new Date();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
    const [signal] = await db.insert(schema.demandSignals).values({
      drugId: drug.id,
      pincode: pharmacy.pincode,
      city: pharmacy.city,
      signalCount: 1,
      weekStart: monday.toISOString().slice(0, 10),
    }).returning();
    return reply.status(201).send({ signal });
  });
}
