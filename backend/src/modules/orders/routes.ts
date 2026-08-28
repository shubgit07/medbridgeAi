import { FastifyInstance } from 'fastify';
import { and, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { broadcastNotification } from '../../websocket/notifications.js';

const statusTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'disputed'],
  confirmed: ['in_transit', 'cancelled', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: [],
  cancelled: [],
  disputed: ['confirmed', 'cancelled'],
};

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const buyer = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    if (!buyer || !buyer.isVerified) return reply.status(403).send({ error: 'Only verified pharmacies can place orders' });
    const parsed = z.object({ listingId: z.string().uuid(), quantity: z.number().int().positive(), pickupType: z.enum(['self_pickup', 'direct_delivery']).default('direct_delivery') }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const order = await db.transaction(async (tx) => {
        const reservationResult = await tx.execute<{
          id: string; pharmacy_id: string; asking_price: string; quantity: number;
        }>(sql`
          UPDATE listings
          SET quantity = quantity - ${parsed.data.quantity},
              status = CASE WHEN quantity = ${parsed.data.quantity} THEN 'reserved' ELSE status END,
              updated_at = NOW()
          WHERE id = ${parsed.data.listingId}
            AND status = 'active'
            AND quantity >= ${parsed.data.quantity}
            AND pharmacy_id <> ${buyer.id}
            AND expiry_date > CURRENT_DATE
          RETURNING id, pharmacy_id, asking_price, quantity
        `);
        const [reserved] = reservationResult.rows;
        if (!reserved) throw new Error('LISTING_UNAVAILABLE');
        const totalAmount = (Number(reserved.asking_price) * parsed.data.quantity).toFixed(2);
        const [created] = await tx.insert(schema.orders).values({
          listingId: reserved.id,
          buyerId: buyer.id,
          sellerId: reserved.pharmacy_id,
          quantity: parsed.data.quantity,
          totalAmount,
          status: 'pending',
          pickupType: parsed.data.pickupType,
        }).returning();
        return created;
      });
      const [notification] = await db.insert(schema.notifications).values({
        pharmacyId: order.sellerId,
        type: 'order_update',
        title: 'New order received',
        body: `A verified pharmacy ordered ${order.quantity} unit(s) from your listing.`,
        metadata: { orderId: order.id, status: order.status },
      }).returning();
      broadcastNotification(order.sellerId, notification);
      return reply.status(201).send({ message: 'Order placed successfully', order });
    } catch (error) {
      if (error instanceof Error && error.message === 'LISTING_UNAVAILABLE') return reply.status(409).send({ error: 'Listing sold out, expired, or no longer available' });
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to place order' });
    }
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    if (!pharmacy) return reply.status(404).send({ error: 'Pharmacy profile not found' });
    const orders = await db.query.orders.findMany({
      where: or(eq(schema.orders.buyerId, pharmacy.id), eq(schema.orders.sellerId, pharmacy.id)),
      with: { listing: { with: { drug: true } } },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    return reply.send({ orders });
  });

  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    if (!pharmacy) return reply.status(404).send({ error: 'Pharmacy profile not found' });
    const { id } = request.params as { id: string };
    const parsed = z.object({ status: z.enum(['confirmed', 'in_transit', 'delivered', 'cancelled', 'disputed']), invoiceNumber: z.string().trim().min(1).optional(), invoiceUrl: z.string().url().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.id, id), or(eq(schema.orders.buyerId, pharmacy.id), eq(schema.orders.sellerId, pharmacy.id))) });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    if (['confirmed', 'in_transit', 'delivered'].includes(parsed.data.status) && order.sellerId !== pharmacy.id) {
      return reply.status(403).send({ error: 'Only the seller can advance fulfillment status' });
    }
    if (!statusTransitions[order.status]?.includes(parsed.data.status)) return reply.status(409).send({ error: `Cannot move order from ${order.status} to ${parsed.data.status}` });
    if (parsed.data.status === 'delivered' && (!order.invoiceUrl && !parsed.data.invoiceUrl || !order.invoiceNumber && !parsed.data.invoiceNumber)) {
      return reply.status(400).send({ error: 'Form 19 invoice number and URL are required before delivery' });
    }

    const updated = await db.transaction(async (tx) => {
      if (parsed.data.status === 'cancelled') {
        await tx.update(schema.listings).set({
          quantity: sql`${schema.listings.quantity} + ${order.quantity}`,
          status: 'active',
          updatedAt: new Date(),
        }).where(eq(schema.listings.id, order.listingId));
      }
      const [changed] = await tx.update(schema.orders).set({
        status: parsed.data.status,
        invoiceNumber: parsed.data.invoiceNumber || order.invoiceNumber,
        invoiceUrl: parsed.data.invoiceUrl || order.invoiceUrl,
        updatedAt: new Date(),
      }).where(eq(schema.orders.id, id)).returning();
      return changed;
    });
    const recipients = new Set([updated.buyerId, updated.sellerId]);
    for (const recipientId of recipients) {
      const [notification] = await db.insert(schema.notifications).values({
        pharmacyId: recipientId,
        type: 'order_update',
        title: `Order ${updated.status.replace('_', ' ')}`,
        body: `Order ${updated.id.slice(0, 8)} is now ${updated.status.replace('_', ' ')}.`,
        metadata: { orderId: updated.id, status: updated.status },
      }).returning();
      broadcastNotification(recipientId, notification);
    }
    return reply.send({ message: 'Order status updated', order: updated });
  });
}
