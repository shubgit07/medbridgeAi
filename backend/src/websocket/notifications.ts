import { FastifyInstance, FastifyRequest } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

interface WsSocket {
  send: (data: string) => void;
  close: () => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  readyState: number;
}

interface WsConnection { socket: WsSocket }
const OPEN = 1;
const connections = new Map<string, Set<WsConnection>>();

export function registerWebSocketRoutes(fastify: FastifyInstance) {
  fastify.get('/ws/notifications', { websocket: true }, async (connection: WsConnection, req: FastifyRequest) => {
    const query = req.query as { pharmacyId?: string; token?: string };
    if (!query.pharmacyId || !query.token) {
      connection.socket.send(JSON.stringify({ type: 'error', error: 'pharmacyId and token are required' }));
      connection.socket.close();
      return;
    }

    try {
      const payload = fastify.jwt.verify<{ userId: string }>(query.token);
      const pharmacy = await db.query.pharmacies.findFirst({ where: and(eq(schema.pharmacies.id, query.pharmacyId), eq(schema.pharmacies.userId, payload.userId)) });
      if (!pharmacy) throw new Error('Invalid pharmacy session');
      const set = connections.get(pharmacy.id) || new Set<WsConnection>();
      set.add(connection);
      connections.set(pharmacy.id, set);
      connection.socket.send(JSON.stringify({ type: 'connected', pharmacyId: pharmacy.id }));
      connection.socket.on('close', () => {
        set.delete(connection);
        if (set.size === 0) connections.delete(pharmacy.id);
      });
      connection.socket.on('error', () => {
        set.delete(connection);
        if (set.size === 0) connections.delete(pharmacy.id);
      });
    } catch {
      connection.socket.send(JSON.stringify({ type: 'error', error: 'Invalid WebSocket session' }));
      connection.socket.close();
    }
  });

  fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    if (!pharmacy) return reply.status(404).send({ error: 'Pharmacy profile not found' });
    const notifications = await db.query.notifications.findMany({
      where: eq(schema.notifications.pharmacyId, pharmacy.id),
      orderBy: [desc(schema.notifications.createdAt)],
      limit: 50,
    });
    return reply.send({ notifications });
  });

  fastify.patch('/notifications/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { id } = request.params as { id: string };
    const pharmacy = await db.query.pharmacies.findFirst({ where: eq(schema.pharmacies.userId, userId) });
    if (!pharmacy) return reply.status(404).send({ error: 'Pharmacy profile not found' });
    const [notification] = await db.update(schema.notifications).set({ isRead: true }).where(and(eq(schema.notifications.id, id), eq(schema.notifications.pharmacyId, pharmacy.id))).returning();
    if (!notification) return reply.status(404).send({ error: 'Notification not found' });
    return reply.send({ notification });
  });
}

export function broadcastNotification(pharmacyId: string, payload: unknown) {
  const recipients = connections.get(pharmacyId);
  if (!recipients) return;
  const message = JSON.stringify({ type: 'notification', payload });
  for (const connection of recipients) {
    if (connection.socket.readyState === OPEN) connection.socket.send(message);
  }
}
