import { buildApp } from './app.js';
import { config } from './config.js';

const app = buildApp();

async function startServer() {
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`🚀 MedBridge Fastify Backend listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
