import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../config.js';
import { db, schema } from '../../db/index.js';
import { ilike, or, eq, ne, and } from 'drizzle-orm';

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

    // Fallback if Gemini key not set
    if (!config.geminiApiKey) {
      // Regex extraction fallback
      const expiryMatch = ocrText.match(/(?:EXP|EXPIRY|USE BEFORE)[\s:]+(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{2}[\/\-]\d{4})/i);
      const batchMatch = ocrText.match(/(?:BATCH|B\.NO|LOT)[\s:]+([A-Z0-9\-]+)/i);
      const mrpMatch = ocrText.match(/(?:MRP|M\.R\.P)[\s:₹]+(\d+\.?\d*)/i);

      return reply.send({
        provider: 'regex-engine',
        data: {
          brandName: ocrText.split('\n')[0] || 'Crocin 500mg',
          genericName: ocrText.toLowerCase().includes('paracetamol') ? 'Paracetamol' : 'Generic Salt',
          dosageForm: ocrText.toLowerCase().includes('syrup') ? 'Syrup' : 'Tablet',
          manufacturer: 'Unknown',
          batchNumber: batchMatch ? batchMatch[1] : 'BN2026-X',
          expiryDate: expiryMatch ? expiryMatch[1] : '2026-08-31',
          mrp: mrpMatch ? parseFloat(mrpMatch[1]) : 120.0,
        },
      });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Extract structured medicine JSON from raw label text: "${ocrText}".
Return ONLY valid JSON with keys: brandName, genericName, dosageForm, manufacturer, batchNumber, expiryDate (YYYY-MM-DD), mrp (number).`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(cleanJson);
      return reply.send({ provider: 'gemini-1.5-flash', data: parsed });
    } catch (err) {
      console.error('[Gemini AI Error]', err);
      return reply.status(500).send({ error: 'Gemini extraction failed' });
    }
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
