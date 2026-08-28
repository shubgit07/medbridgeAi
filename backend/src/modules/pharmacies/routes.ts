import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';

export async function pharmacyRoutes(fastify: FastifyInstance) {
  // POST /pharmacies - Register/Update Pharmacy Profile
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    const schemaBody = z.object({
      name: z.string().min(2),
      ownerName: z.string().min(2),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      address: z.string().min(5),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      city: z.string().min(2),
      pincode: z.string().min(5),
      drugLicenseNo: z.string().min(3),
      licenseType: z.enum(['Form20', 'Form21']),
      licenseScanUrl: z.string().url(),
    });

    const parse = schemaBody.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const data = parse.data;
    if (!data.licenseScanUrl) {
      return reply.status(400).send({ error: 'A Form 20/21 license scan URL is required for verification' });
    }

    // Insert or update pharmacy profile
    const [pharmacy] = await db
      .insert(schema.pharmacies)
      .values({
        userId: userPayload.userId,
        name: data.name,
        ownerName: data.ownerName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        location: { latitude: data.latitude, longitude: data.longitude },
        city: data.city,
        pincode: data.pincode,
        drugLicenseNo: data.drugLicenseNo,
        licenseType: data.licenseType,
        licenseScanUrl: data.licenseScanUrl,
        isVerified: false, // Default to unverified until admin review
        trustScore: '0.50',
      })
      .onConflictDoUpdate({
        target: schema.pharmacies.userId,
        set: {
          name: data.name,
          ownerName: data.ownerName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          location: { latitude: data.latitude, longitude: data.longitude },
          city: data.city,
          pincode: data.pincode,
          drugLicenseNo: data.drugLicenseNo,
          licenseType: data.licenseType,
          licenseScanUrl: data.licenseScanUrl,
          isVerified: false,
          updatedAt: new Date(),
        },
      })
      .returning();

    return reply.status(200).send({
      message: 'Pharmacy onboarding info submitted successfully',
      pharmacy,
    });
  });

  // GET /pharmacies/me - Fetch seller's own pharmacy profile
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { userId: string };

    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(schema.pharmacies.userId, userPayload.userId),
    });

    if (!pharmacy) {
      return reply.status(404).send({ error: 'Pharmacy profile not found. Please complete onboarding.' });
    }

    return reply.send({ pharmacy });
  });

  // GET /admin/verifications - Admin: List pending verifications
  fastify.get('/admin/verifications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { role?: string };
    if (userPayload.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const pending = await db.query.pharmacies.findMany({
      where: eq(schema.pharmacies.isVerified, false),
    });

    return reply.send({ pendingPharmacies: pending });
  });

  // POST /admin/verifications/:id/approve - Admin: Verify pharmacy
  fastify.post('/admin/verifications/:id/approve', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user as { role?: string };
    if (userPayload.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };

    const [updated] = await db
      .update(schema.pharmacies)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(schema.pharmacies.id, id))
      .returning();

    return reply.send({ message: 'Pharmacy verified successfully', pharmacy: updated });
  });
}
