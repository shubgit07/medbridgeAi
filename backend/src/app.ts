import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config.js';

import { authRoutes } from './modules/auth/routes.js';
import { pharmacyRoutes } from './modules/pharmacies/routes.js';
import { drugRoutes } from './modules/drugs/routes.js';
import { listingRoutes } from './modules/listings/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { inventoryRoutes } from './modules/inventory/routes.js';
import { ocrRoutes } from './modules/ocr/routes.js';
import { aiRoutes } from './modules/ai/routes.js';
import { registerWebSocketRoutes } from './websocket/notifications.js';

// Extend FastifyInstance type to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}

export function buildApp(): FastifyInstance {
  const fastify = Fastify({
    bodyLimit: 8 * 1024 * 1024,
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    },
  });

  // Plugins
  fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  fastify.register(jwt, {
    secret: config.jwtSecret,
  });

  fastify.register(websocket);

  // Authentication Decorator Hook
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid or missing token' });
    }
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'MedBridge Fastify API', timestamp: new Date().toISOString() };
  });

  // Register Module Routes
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(pharmacyRoutes, { prefix: '/pharmacies' });
  fastify.register(drugRoutes, { prefix: '/drugs' });
  fastify.register(listingRoutes, { prefix: '/listings' });
  fastify.register(orderRoutes, { prefix: '/orders' });
  fastify.register(inventoryRoutes, { prefix: '/inventory' });
  fastify.register(ocrRoutes, { prefix: '/ocr' });
  fastify.register(aiRoutes, { prefix: '/ai' });

  // Register WebSocket Route
  registerWebSocketRoutes(fastify);

  return fastify;
}
