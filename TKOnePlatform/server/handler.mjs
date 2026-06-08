/* ───────────────────────────────────────────────────────────────────────────
   Backend AI proxy handler (transport-agnostic, dependency-injected).
   Keeps the Anthropic API key server-side. Returns a plain object the Express
   layer serializes. Throws typed errors the layer maps to HTTP status codes.
   ─────────────────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT =
  "คุณคือนักวิเคราะห์อสังหาฯ ระดับองค์กรของ TK One. วิเคราะห์เฉพาะทรัพย์ที่ให้มา " +
  "(เป็นข้อมูลที่พนักงานตรวจสอบแล้ว) ห้ามสร้างทรัพย์ ราคา หรือข้อเท็จจริงที่ไม่ได้ให้มา " +
  "ถ้าข้อมูลไม่พอให้ลด confidence และระบุชัดเจน. ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น " +
  "ภาษาไทยสำหรับเนื้อหาทั้งหมด.";

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
    `ให้ JSON รูปแบบ:\n` +
    `{"ranked":[{"id","matchScore":0-100,"investGrade":"A-F","riskGrade":"Low/Med/High",` +
    `"confidence":"A-F","rationale","pros":[],"cons":[],"risks":[],"negotiation"}],` +
    `"recommendationId","recommendationReason","customerMessage","ownerOutreach":[{"id","message"}]}\n` +
    `เกณฑ์ matchScore: ความตรงความต้องการ ราคาในงบ ผลตอบแทนเทียบเป้า ทำเล ความเสี่ยง. ` +
    `customerMessage = ข้อความสุภาพถึงลูกค้าสรุปตัวเลือก. ` +
    `ownerOutreach = ข้อความถึงเจ้าของทรัพย์/เอเจนต์เพื่อสอบถามสถานะและนัดชม.`
  );
}

/** Extract the first balanced JSON object from a model text response. */
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new HttpError(502, "AI response did not contain JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
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
 * @param {{ apiKey?: string, model?: string, fetchImpl?: typeof fetch }} cfg
 */
export function createAnalyzeHandler(cfg = {}) {
  const model = cfg.model || "claude-sonnet-4-20250514";
  const fetchImpl = cfg.fetchImpl || globalThis.fetch;

  return async function analyze(body) {
    const { req, cands } = validateBody(body);
    if (!cfg.apiKey) {
      throw new HttpError(503, "AI not configured (missing ANTHROPIC_API_KEY)");
    }

    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(req, cands) }],
      }),
    });

    if (!res.ok) {
      throw new HttpError(502, `Anthropic API responded ${res.status}`);
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJson(text);
    parsed._engine = "claude";
    return parsed;
  };
}
