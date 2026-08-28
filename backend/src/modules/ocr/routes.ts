import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../../db/index.js';
import { enqueueOcrJob } from '../../jobs/queues.js';
import { extractMedicine, validateLicenseText } from '../../services/medicineExtraction.js';

function parseGs1Date(raw: string) {
  const year = Number(raw.slice(0, 2));
  const month = raw.slice(2, 4);
  const day = raw.slice(4, 6);
  return `20${String(year).padStart(2, '0')}-${month}-${day}`;
}

/** Parses GS1 AI 01 (GTIN), 17 (expiry) and 10 (lot) without assuming a fixed AI order. */
export function parseGS1Barcode(barcode: string) {
  const value = barcode.replace(/\s+/g, '');
  let gtin: string | null = null;
  let expiryRaw: string | null = null;
  let batch: string | null = null;
  const parenthesized = /\((01|17|10)\)([^()\u001d]*)/g;
  let match: RegExpExecArray | null;
  while ((match = parenthesized.exec(value))) {
    if (match[1] === '01') gtin = match[2].slice(0, 14) || null;
    if (match[1] === '17') expiryRaw = match[2].slice(0, 6) || null;
    if (match[1] === '10') batch = match[2].split('\u001d')[0].slice(0, 20) || null;
  }
  if (!gtin && !expiryRaw && !batch) {
    let cursor = 0;
    while (cursor < value.length) {
      const ai = value.slice(cursor, cursor + 2);
      cursor += 2;
      if (ai === '01') { gtin = value.slice(cursor, cursor + 14); cursor += 14; continue; }
      if (ai === '17') { expiryRaw = value.slice(cursor, cursor + 6); cursor += 6; continue; }
      if (ai === '10') { batch = value.slice(cursor).split('\u001d')[0].slice(0, 20) || null; break; }
      break;
    }
  }
  return { gtin, expiryDate: expiryRaw ? parseGs1Date(expiryRaw) : null, batchNumber: batch };
}

export async function ocrRoutes(fastify: FastifyInstance) {
  fastify.post('/parse-barcode', async (request, reply) => {
    const parsed = z.object({ barcode: z.string().min(3) }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Valid barcode string required' });
    return reply.send({ success: true, data: parseGS1Barcode(parsed.data.barcode) });
  });

  // Small text requests remain synchronous for a responsive form; image-heavy requests use /jobs.
  fastify.post('/extract-medicine', async (request, reply) => {
    const parsed = z.object({
      text: z.string().min(5),
      imageBase64: z.string().optional(),
      mimeType: z.string().optional(),
    }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, invalid: true, error: 'Text must contain at least five characters' });
    const result = await extractMedicine(parsed.data);
    return reply.send({ success: true, invalid: false, provider: result.provider, data: result.data });
  });

  fastify.post('/jobs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = z.object({
      text: z.string().optional(),
      imageBase64: z.string().min(20).optional(),
      mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/).optional(),
    }).refine((value) => Boolean(value.text?.trim() || value.imageBase64), 'text or imageBase64 is required').safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = (request.user as { userId: string }).userId;
    const [job] = await db.insert(schema.ocrJobs).values({ requestedBy: userId, inputText: parsed.data.text || null, status: 'queued' }).returning();
    try {
      await enqueueOcrJob({ jobId: job.id, ...parsed.data });
    } catch {
      await db.update(schema.ocrJobs).set({ status: 'failed', error: 'Queue unavailable', updatedAt: new Date() }).where(eq(schema.ocrJobs.id, job.id));
      return reply.status(503).send({ error: 'OCR queue is unavailable' });
    }
    return reply.status(202).send({ jobId: job.id, status: 'queued' });
  });

  fastify.get('/jobs/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { id } = request.params as { id: string };
    const job = await db.query.ocrJobs.findFirst({ where: eq(schema.ocrJobs.id, id) });
    if (!job || job.requestedBy !== userId) return reply.status(404).send({ error: 'OCR job not found' });
    return reply.send({ job });
  });

  fastify.post('/verify-license', async (request, reply) => {
    const parsed = z.object({ licenseType: z.enum(['Form20', 'Form21']), licenseText: z.string().min(5) }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const result = validateLicenseText(parsed.data.licenseText, parsed.data.licenseType);
    return reply.send({ ...result, licenseType: parsed.data.licenseType });
  });
}
