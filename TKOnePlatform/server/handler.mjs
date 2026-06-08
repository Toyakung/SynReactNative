/* ───────────────────────────────────────────────────────────────────────────
   Backend AI proxy handler — uses the official Anthropic SDK.
   Keeps the API key server-side. Structured Outputs (output_config.format)
   guarantees the model returns JSON matching our contract, so the frontend
   never has to repair malformed AI output. A dependency-injected client keeps
   the handler unit-testable without network access.
   ─────────────────────────────────────────────────────────────────────────── */

import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";

const SYSTEM_PROMPT =
  "คุณคือนักวิเคราะห์อสังหาฯ ระดับองค์กรของ TK One. วิเคราะห์เฉพาะทรัพย์ที่ให้มา " +
  "(เป็นข้อมูลที่พนักงานตรวจสอบแล้ว) ห้ามสร้างทรัพย์ ราคา หรือข้อเท็จจริงที่ไม่ได้ให้มา " +
  "ถ้าข้อมูลไม่พอให้ลด confidence และระบุชัดเจน. ภาษาไทยสำหรับเนื้อหาทั้งหมด. " +
  "เกณฑ์ matchScore (0-100): ความตรงความต้องการ ราคาในงบ ผลตอบแทนเทียบเป้า ทำเล ความเสี่ยง. " +
  "customerMessage = ข้อความสุภาพถึงลูกค้าสรุปตัวเลือก. " +
  "ownerOutreach = ข้อความถึงเจ้าของทรัพย์/เอเจนต์เพื่อสอบถามสถานะและนัดชม (3 อันดับแรก).";

// JSON Schema enforced on the model via Structured Outputs. The response is
// guaranteed to parse and to carry valid grade enums.
const RANKED_ITEM = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "number" },
    matchScore: { type: "integer" },
    investGrade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
    riskGrade: { type: "string", enum: ["Low", "Med", "High"] },
    confidence: { type: "string", enum: ["A", "B", "C", "D", "F"] },
    rationale: { type: "string" },
    pros: { type: "array", items: { type: "string" } },
    cons: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    negotiation: { type: "string" },
  },
  required: [
    "id", "matchScore", "investGrade", "riskGrade", "confidence",
    "rationale", "pros", "cons", "risks", "negotiation",
  ],
};

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ranked: { type: "array", items: RANKED_ITEM },
    recommendationId: { type: "number" },
    recommendationReason: { type: "string" },
    customerMessage: { type: "string" },
    ownerOutreach: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { id: { type: "number" }, message: { type: "string" } },
        required: ["id", "message"],
      },
    },
  },
  required: [
    "ranked", "recommendationId", "recommendationReason",
    "customerMessage", "ownerOutreach",
  ],
};

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function buildUserPrompt(req, cands) {
  return (
    `ความต้องการลูกค้า:\n${JSON.stringify(req)}\n\n` +
    `ทรัพย์ที่พนักงานหามา (ตรวจสอบแล้ว):\n${JSON.stringify(cands)}\n\n` +
    `วิเคราะห์และจัดอันดับทรัพย์ทั้งหมด แล้วตอบตาม schema ที่กำหนด.`
  );
}

/** Extract the first balanced JSON object from a model text response.
 *  With Structured Outputs the text is already pure JSON; this stays as a
 *  defensive fallback. */
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new HttpError(502, "AI response did not contain JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Staff access gate. If `expected` is empty/unset the gate is disabled (open).
 * Otherwise the provided code must match exactly (constant-time) or this
 * throws HttpError(401). Keeps the staff passcode off the client and out of git.
 */
export function verifyAccessCode(expected, provided) {
  if (!expected) return; // gate disabled
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(provided ?? ""));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) throw new HttpError(401, "รหัสพนักงานไม่ถูกต้องหรือยังไม่ได้ใส่");
}

export function validateBody(body) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "body must be an object");
  }
  const { req, cands } = body;
  if (!req || typeof req !== "object") {
    throw new HttpError(400, "req is required");
  }
  if (!Array.isArray(cands) || cands.length === 0) {
    throw new HttpError(400, "cands must be a non-empty array");
  }
  return { req, cands };
}

/**
 * Build the analyze handler.
 * @param {{ apiKey?: string, model?: string, client?: Anthropic }} cfg
 *   Pass `client` to inject a mock in tests; otherwise an Anthropic client is
 *   created from `apiKey`.
 */
export function createAnalyzeHandler(cfg = {}) {
  const model = cfg.model || "claude-opus-4-8";
  const client = cfg.client || (cfg.apiKey ? new Anthropic({ apiKey: cfg.apiKey }) : null);

  return async function analyze(body) {
    const { req, cands } = validateBody(body);
    if (!client) {
      throw new HttpError(503, "AI not configured (missing ANTHROPIC_API_KEY)");
    }

    let message;
    try {
      message = await client.messages.create({
        model,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(req, cands) }],
        output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
      });
    } catch (err) {
      const status = typeof err?.status === "number" ? err.status : 502;
      throw new HttpError(status, `Anthropic API error: ${err?.message || "unknown"}`);
    }

    const text = (message.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJson(text);
    parsed._engine = "claude";
    return parsed;
  };
}
