import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../config.js';
import { db, schema } from '../../db/index.js';
import { ilike, or, eq, ne, and } from 'drizzle-orm';
import { extractMedicine } from '../../services/medicineExtraction.js';

export async function aiRoutes(fastify: FastifyInstance) {
  // POST /ai/seller-insight - Groq API LPU Sub-Second Seller Advice Generator
  fastify.post('/seller-insight', async (request, reply) => {
    const bodySchema = z.object({
      brandName: z.string(),
      daysToExpiry: z.number(),
      mrp: z.number(),
      askingPrice: z.number(),
      discountPct: z.number(),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const { brandName, daysToExpiry, mrp, askingPrice, discountPct } = parse.data;

    // Fallback if Groq API key is not provided in env
    if (!config.groqApiKey) {
      return reply.send({
        insight: `[Rule-based AI] With ${daysToExpiry} days left on ${brandName} at ${discountPct}% off (MRP: ₹${mrp}, Asking: ₹${askingPrice}), consider increasing discount to 50%+ if unsold within 5 days to prevent dead-stock write-off.`,
        provider: 'rule-engine',
      });
    }

    try {
      const prompt = `You are an expert Indian B2B pharmacy inventory optimization AI assistant.
Provide a concise, 2-sentence actionable recommendation for a pharmacy seller who is listing:
- Drug: ${brandName}
- Days to Expiry: ${daysToExpiry} days
- MRP: ₹${mrp}
- Current Asking Price: ₹${askingPrice} (${discountPct}% discount)

Give advice on whether this price is optimal to clear the stock before expiry without write-off.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.3,
        }),
      });

      if (!response.ok) throw new Error(`Groq returned HTTP ${response.status}`);
      const data = await response.json();
      const insight = data.choices?.[0]?.message?.content || 'Consider increasing discount as expiry approaches.';

      return reply.send({ insight, provider: 'groq-lpu-llama-3.3-70b' });
    } catch (err) {
      console.error('[Groq AI Error]', err);
      return reply.send({
        insight: `Recommend listing ${brandName} with dynamic pricing floor as expiry approaches.`,
        provider: 'fallback',
      });
    }
  });

  // POST /ai/ocr-label - Google Gemini Multimodal Medicine Label Extractor
  fastify.post('/ocr-label', async (request, reply) => {
    const bodySchema = z.object({
      ocrText: z.string().min(5),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Valid OCR text string required' });
    }

    const { ocrText } = parse.data;

    const result = await extractMedicine({ text: ocrText });
    return reply.send({ provider: result.provider, data: result.data });
  });

  // POST /ai/substitutes - Generic Salt Brand Substitute Recommender
  fastify.post('/substitutes', async (request, reply) => {
    const bodySchema = z.object({
      drugId: z.string().uuid(),
    });

    const parse = bodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'drugId required' });
    }

    const targetDrug = await db.query.drugs.findFirst({
      where: eq(schema.drugs.id, parse.data.drugId),
    });

    if (!targetDrug) {
      return reply.status(404).send({ error: 'Drug not found' });
    }

    // Find other brands with identical generic salt name
    const substitutes = await db.query.drugs.findMany({
      where: and(
        ilike(schema.drugs.saltName, `%${targetDrug.saltName}%`),
        ne(schema.drugs.id, targetDrug.id)
      ),
      limit: 10,
    });

    return reply.send({
      targetDrug,
      substitutes,
      recommendationNote: `Found ${substitutes.length} brand substitute(s) containing generic salt '${targetDrug.saltName}'.`,
    });
  });
}
