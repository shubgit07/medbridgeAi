import { config } from '../config.js';

export interface MedicineExtraction {
  brandName: string;
  genericName: string;
  dosageForm: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
}

export interface ExtractionInput {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface ExtractionResult {
  data: MedicineExtraction;
  provider: string;
}

const EXTRACTION_PROMPT = `Extract medicine label data and return only valid JSON with these keys:
brandName, genericName, dosageForm, manufacturer, batchNumber, expiryDate (YYYY-MM-DD), mrp (number).
Use null or an empty string for fields that are not visible. Do not invent a batch number or price.`;

function stripDataUrl(value: string) {
  return value.replace(/^data:[^;]+;base64,/, '');
}

function parseJsonResponse(value: string): Partial<MedicineExtraction> {
  const cleaned = value.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI response did not contain JSON');
  return JSON.parse(cleaned.slice(start, end + 1)) as Partial<MedicineExtraction>;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const full = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (full) return `${full[3]}-${full[2]}-${full[1]}`;

  const monthOnly = raw.match(/^(\d{2})[\/-](\d{4})$/);
  if (monthOnly) return `${monthOnly[2]}-${monthOnly[1]}-01`;
  return '';
}

function fallbackExtraction(text = ''): MedicineExtraction {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const expiry = text.match(/(?:EXP(?:IRY)?|USE\s*BEFORE)[\s:.-]+(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{2}[\/-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  const batch = text.match(/(?:BATCH|B\.?\s*NO|LOT)[\s:#.-]+([A-Z0-9][A-Z0-9\/-]{2,})/i);
  const mrp = text.match(/(?:MRP|M\.?R\.?P)[\s:₹Rs.]+(\d+(?:\.\d{1,2})?)/i);
  const lower = text.toLowerCase();

  return {
    brandName: lines[0] || '',
    genericName: lower.includes('paracetamol') ? 'Paracetamol' : '',
    dosageForm: lower.includes('syrup') ? 'Syrup' : lower.includes('capsule') ? 'Capsule' : lower.includes('tablet') ? 'Tablet' : '',
    manufacturer: '',
    batchNumber: batch?.[1] || '',
    expiryDate: normalizeDate(expiry?.[1]),
    mrp: mrp ? Number(mrp[1]) : 0,
  };
}

function mergeExtraction(value: Partial<MedicineExtraction>, fallback: MedicineExtraction): MedicineExtraction {
  const mrp = typeof value.mrp === 'number' ? value.mrp : Number(value.mrp);
  return {
    brandName: String(value.brandName || fallback.brandName || '').trim(),
    genericName: String(value.genericName || fallback.genericName || '').trim(),
    dosageForm: String(value.dosageForm || fallback.dosageForm || '').trim(),
    manufacturer: String(value.manufacturer || fallback.manufacturer || '').trim(),
    batchNumber: String(value.batchNumber || fallback.batchNumber || '').trim(),
    expiryDate: normalizeDate(value.expiryDate) || fallback.expiryDate,
    mrp: Number.isFinite(mrp) && mrp > 0 ? mrp : fallback.mrp,
  };
}

async function extractWithGemini(input: ExtractionInput): Promise<Partial<MedicineExtraction>> {
  const parts: Array<Record<string, unknown>> = [{ text: EXTRACTION_PROMPT }];
  if (input.imageBase64) {
    parts.unshift({
      inline_data: {
        mime_type: input.mimeType || 'image/jpeg',
        data: stripDataUrl(input.imageBase64),
      },
    });
  }
  if (input.text) parts.push({ text: `Raw OCR text:\n${input.text}` });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  return parseJsonResponse(text);
}

async function extractWithGroq(text: string): Promise<Partial<MedicineExtraction>> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\nRaw OCR text:\n${text}` }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Groq returned HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseJsonResponse(payload.choices?.[0]?.message?.content || '');
}

async function extractWithCloudflare(text: string): Promise<Partial<MedicineExtraction>> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${encodeURIComponent(config.cloudflareAiModel)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.cloudflareApiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${EXTRACTION_PROMPT}\nRaw OCR text:\n${text}` }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error(`Cloudflare AI returned HTTP ${response.status}`);
  const payload = await response.json() as { result?: { response?: string } };
  return parseJsonResponse(payload.result?.response || '');
}

/** Runs the configured providers from highest-fidelity to lowest-cost fallback. */
export async function extractMedicine(input: ExtractionInput): Promise<ExtractionResult> {
  const text = input.text?.trim() || '';
  const fallback = fallbackExtraction(text);

  if (config.geminiApiKey && (input.imageBase64 || text)) {
    try {
      return { data: mergeExtraction(await extractWithGemini(input), fallback), provider: input.imageBase64 ? 'gemini-vision' : 'gemini-text' };
    } catch (error) {
      console.warn('[Medicine extraction] Gemini tier failed', error);
    }
  }

  if (config.groqApiKey && text) {
    try {
      return { data: mergeExtraction(await extractWithGroq(text), fallback), provider: 'groq-llama-3.3' };
    } catch (error) {
      console.warn('[Medicine extraction] Groq tier failed', error);
    }
  }

  if (config.cloudflareApiToken && config.cloudflareAccountId && text) {
    try {
      return { data: mergeExtraction(await extractWithCloudflare(text), fallback), provider: 'cloudflare-workers-ai' };
    } catch (error) {
      console.warn('[Medicine extraction] Cloudflare AI tier failed', error);
    }
  }

  return { data: fallback, provider: 'regex-fallback' };
}

export function validateLicenseText(value: string, licenseType: 'Form20' | 'Form21') {
  const text = value.trim();
  const hasForm = new RegExp(`form\\s*${licenseType.slice(4)}`, 'i').test(text);
  const hasLicenseNumber = /(?:license|licence|lic\.?\s*no)\s*[:#-]?\s*[A-Z0-9\/-]{3,}/i.test(text);
  return { valid: hasForm && hasLicenseNumber, hasForm, hasLicenseNumber };
}
