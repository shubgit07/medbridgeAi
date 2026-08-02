import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { eq, or, and } from 'drizzle-orm';

export async function orderRoutes(fastify: FastifyInstance) {
  // POST /orders - Place order for listing
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    const buyerPharmacy = await db.query.pharmacies.findFirst({
      where: eq(schema.pharmacies.userId, userPayload.userId),
    });

    if (!buyerPharmacy || !buyerPharmacy.isVerified) {
      return reply.status(403).send({ error: 'Only verified pharmacies can place orders' });
    }

    const bodySchema = z.object({
      listingId: z.string().uuid(),
      quantity: z.number().int().positive(),
      pickupType: z.enum(['self_pickup', 'direct_delivery']).default('direct_delivery'),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const { listingId, quantity, pickupType } = parse.data;

    const listing = await db.query.listings.findFirst({
      where: eq(schema.listings.id, listingId),
      with: { pharmacy: true },
    });

    if (!listing || listing.status !== 'active') {
      return reply.status(400).send({ error: 'Listing is not available' });
    }

    if (quantity > listing.quantity) {
      return reply.status(400).send({ error: `Requested quantity exceeds available stock (${listing.quantity})` });
    }

    if (listing.pharmacyId === buyerPharmacy.id) {
      return reply.status(400).send({ error: 'Cannot purchase your own listing' });
    }

    const totalAmount = (parseFloat(listing.askingPrice) * quantity).toFixed(2);

    const [order] = await db
      .insert(schema.orders)
      .values({
        listingId: listing.id,
        buyerId: buyerPharmacy.id,
        sellerId: listing.pharmacyId,
        quantity,
        totalAmount,
        status: 'pending',
        pickupType,
      })
      .returning();

    // Mark listing reserved/sold if full quantity ordered
    if (quantity === listing.quantity) {
      await db.update(schema.listings).set({ status: 'reserved' }).where(eq(schema.listings.id, listing.id));
    }

    return reply.status(201).send({ message: 'Order placed successfully', order });
  });

  // GET /orders - List orders (as buyer or seller)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(schema.pharmacies.userId, userPayload.userId),
    });

    if (!pharmacy) {
      return reply.status(404).send({ error: 'Pharmacy profile not found' });
    }

    const myOrders = await db.query.orders.findMany({
      where: or(eq(schema.orders.buyerId, pharmacy.id), eq(schema.orders.sellerId, pharmacy.id)),
      with: {
        listing: {
          with: { drug: true },
        },
      },
    });

    return reply.send({ orders: myOrders });
  });

  // PATCH /orders/:id/status - Update order status (with Form 19 compliance check)
  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      status: z.enum(['confirmed', 'in_transit', 'delivered', 'cancelled', 'disputed']),
      invoiceNumber: z.string().optional(),
      invoiceUrl: z.string().url().optional(),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const { status, invoiceNumber, invoiceUrl } = parse.data;

    // Regulatory Compliance Gate: Cannot set status to 'delivered' without invoice URL
    if (status === 'delivered' && !order.invoiceUrl && !invoiceUrl) {
      return reply.status(400).send({
        error: 'Regulatory Compliance Failure: Form 19 purchase invoice URL is required before marking order as delivered.',
      });
    }

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        status,
        invoiceNumber: invoiceNumber || order.invoiceNumber,
        invoiceUrl: invoiceUrl || order.invoiceUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, id))
      .returning();

    return reply.send({ message: 'Order status updated', order: updatedOrder });
  });
}
