import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../../utils/hash.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/signup
  fastify.post('/signup', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.literal('pharmacy').default('pharmacy'),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { name, email, password, role } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    // Check existing email
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (existing) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    // Create user
    let newUser: typeof schema.users.$inferSelect;
    try {
      const created = await db
        .insert(schema.users)
        .values({ name, email: normalizedEmail, password: hashPassword(password), role })
        .returning();
      newUser = created[0];
      if (!newUser) throw new Error('User insert returned no row');
    } catch (error) {
      fastify.log.error(error);
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const token = fastify.jwt.sign({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return reply.status(201).send({
      message: 'User registered successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      accessToken: token,
    });
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { email, password } = parseResult.data;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    if (!user || !verifyPassword(password, user.password)) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.send({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken: token,
    });
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userPayload.userId),
      with: {
        pharmacy: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });
}
