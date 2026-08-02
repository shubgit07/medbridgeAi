import { FastifyInstance, FastifyRequest } from 'fastify';

interface WsSocket {
  send: (data: string) => void;
  close: () => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  readyState: number;
}

interface WsConnection {
  socket: WsSocket;
}

// Map of active WebSocket connections keyed by pharmacyId
const connections = new Map<string, WsConnection>();

export function registerWebSocketRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/ws/notifications',
    { websocket: true },
    (connection: WsConnection, req: FastifyRequest) => {
      const query = req.query as { pharmacyId?: string };
      const pharmacyId = query.pharmacyId;

      if (!pharmacyId) {
        connection.socket.send(JSON.stringify({ error: 'pharmacyId required in query string' }));
        connection.socket.close();
        return;
      }

      // Store socket connection
      connections.set(pharmacyId, connection);
      console.log(`[WebSocket] Pharmacy connected: ${pharmacyId}`);

      connection.socket.send(
        JSON.stringify({ type: 'connected', message: 'WebSocket real-time notification stream connected' })
      );

      connection.socket.on('close', () => {
        connections.delete(pharmacyId);
        console.log(`[WebSocket] Pharmacy disconnected: ${pharmacyId}`);
      });
    }
  );
}

/**
 * Broadcasts a real-time notification to a specific pharmacy over WebSocket if online.
 */
export function broadcastNotification(pharmacyId: string, notificationData: any) {
  const connection = connections.get(pharmacyId);
  if (connection && connection.socket.readyState === 1) { // 1 = OPEN
    connection.socket.send(
      JSON.stringify({
        type: 'notification',
        payload: notificationData,
      })
    );
    console.log(`[WebSocket Push] Delivered live notification to pharmacy ${pharmacyId}`);
  }
}
