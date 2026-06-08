/* ───────────────────────────────────────────────────────────────────────────
   AI client. Calls the backend proxy (/api/analyze) so the Anthropic API key
   NEVER reaches the browser. Any failure — network, non-200, malformed JSON,
   or a response that doesn't match our contract — degrades gracefully to the
   deterministic built-in engine, so the UI always gets a usable result.
   ─────────────────────────────────────────────────────────────────────────── */

import type {
  AnalysisResult,
  Candidate,
  Grade,
  RankedItem,
  Requirement,
  RiskGrade,
} from "../types";
import { localAnalyze } from "../engine/analyze";
import { clamp } from "../engine/format";

export interface RunAIOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Skip the network entirely and use the deterministic built-in engine
   *  (static demo deployments with no backend). */
  forceLocal?: boolean;
}

const GRADES: Grade[] = ["A", "B", "C", "D", "F"];
const RISKS: RiskGrade[] = ["Low", "Med", "High"];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function asGrade(v: unknown, fallback: Grade): Grade {
  return GRADES.includes(v as Grade) ? (v as Grade) : fallback;
}
function asRisk(v: unknown, fallback: RiskGrade): RiskGrade {
  return RISKS.includes(v as RiskGrade) ? (v as RiskGrade) : fallback;
}

/**
 * Coerce an untrusted AI payload into a guaranteed-valid AnalysisResult.
 * Falls back to the local engine whenever the payload can't be trusted.
 * The local result is used both as a safety net and to fill any gaps.
 */
export function sanitizeResult(
  raw: unknown,
  req: Requirement,
  cands: Candidate[],
): AnalysisResult {
  const local = localAnalyze(req, cands);
  if (typeof raw !== "object" || raw === null) return local;

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.ranked)) return local;

  const validIds = new Set(cands.map((c) => c.id));
  const localById = new Map(local.ranked.map((r) => [r.id, r]));

  const ranked: RankedItem[] = (data.ranked as unknown[])
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const r = item as Record<string, unknown>;
      const id = typeof r.id === "number" ? r.id : Number(r.id);
      if (!validIds.has(id)) return null;
      // A valid id always has a local baseline (one per candidate) to repair from.
      const base = localById.get(id) as RankedItem;
      const score = Number(r.matchScore);
      return {
        id,
        matchScore: Number.isFinite(score)
          ? clamp(Math.round(score), 0, 100)
          : base.matchScore,
        investGrade: asGrade(r.investGrade, base.investGrade),
        riskGrade: asRisk(r.riskGrade, base.riskGrade),
        confidence: asGrade(r.confidence, base.confidence),
        rationale: asString(r.rationale, base.rationale),
        pros: asStringArray(r.pros),
        cons: asStringArray(r.cons),
        risks: asStringArray(r.risks),
        negotiation: asString(r.negotiation, base.negotiation),
      } satisfies RankedItem;
    })
    .filter((x): x is RankedItem => x !== null)
    .sort((a, b) => b.matchScore - a.matchScore || a.id - b.id);

  // If the AI returned nothing usable, trust the local engine entirely.
  if (ranked.length === 0) return local;

  const recoId =
    typeof data.recommendationId === "number" && validIds.has(data.recommendationId)
      ? data.recommendationId
      : ranked[0].id;

  const ownerOutreach = Array.isArray(data.ownerOutreach)
    ? (data.ownerOutreach as unknown[])
        .map((o) => {
          if (typeof o !== "object" || o === null) return null;
          const obj = o as Record<string, unknown>;
          const id = typeof obj.id === "number" ? obj.id : Number(obj.id);
          if (!validIds.has(id)) return null;
          return { id, message: asString(obj.message) };
        })
        .filter((x): x is { id: number; message: string } => x !== null)
    : local.ownerOutreach;

  return {
    ranked,
    recommendationId: recoId,
    recommendationReason: asString(
      data.recommendationReason,
      local.recommendationReason,
    ),
    customerMessage: asString(data.customerMessage, local.customerMessage),
    ownerOutreach: ownerOutreach.length ? ownerOutreach : local.ownerOutreach,
    _engine: asString(data._engine, "claude"),
  };
}

export async function runAI(
  req: Requirement,
  cands: Candidate[],
  opts: RunAIOptions = {},
): Promise<AnalysisResult> {
  if (opts.forceLocal) {
    const local = localAnalyze(req, cands);
    local._engine = "built-in engine (เดโม)";
    return local;
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? "/api/analyze";
  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ req, cands }),
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`AI proxy responded ${res.status}`);
    const data = await res.json();
    return sanitizeResult(data, req, cands);
  } catch {
    const fb = localAnalyze(req, cands);
    fb._engine = "built-in (AI ไม่พร้อมใช้งานในขณะนี้)";
    return fb;
  }
}
