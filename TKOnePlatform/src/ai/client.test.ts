import { describe, expect, it, vi } from "vitest";
import { AuthError, runAI, sanitizeResult } from "./client";
import { blankCandidate } from "../constants";
import type { Candidate, Requirement } from "../types";

const req: Requirement = {
  intent: "buy",
  ptype: "condo",
  budgetMin: "1000000",
  budgetMax: "2000000",
  location: "อโศก",
  yieldTarget: "5",
  horizon: "3 ปี",
  risk: "ปานกลาง",
  special: [],
  notes: "",
  customerName: "",
  customerContact: "",
};
const cands: Candidate[] = [
  { ...blankCandidate(1), name: "A", price: "1500000", location: "อโศก", sourceUrl: "https://x/1", sourceTier: "1" },
  { ...blankCandidate(2), name: "B", price: "1800000", location: "อโศก", sourceUrl: "https://x/2", sourceTier: "2" },
];

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("sanitizeResult", () => {
  it("falls back to local engine for non-object payloads", () => {
    expect(sanitizeResult(null, req, cands)._engine).toBe("built-in");
    expect(sanitizeResult(42, req, cands)._engine).toBe("built-in");
  });
  it("falls back when ranked is not an array", () => {
    expect(sanitizeResult({ ranked: "nope" }, req, cands)._engine).toBe("built-in");
  });
  it("filters invalid ranked entries and unknown ids", () => {
    const out = sanitizeResult(
      {
        ranked: [
          null,
          { id: 999, matchScore: 90 },
          { id: 1, matchScore: 88, investGrade: "A", riskGrade: "Low", confidence: "A", rationale: "r", pros: ["p"], cons: [], risks: [], negotiation: "n" },
        ],
      },
      req,
      cands,
    );
    expect(out.ranked).toHaveLength(1);
    expect(out.ranked[0].id).toBe(1);
    expect(out._engine).toBe("claude");
  });
  it("repairs bad fields from the local baseline", () => {
    const out = sanitizeResult(
      { ranked: [{ id: 1, matchScore: "oops", investGrade: "Z", riskGrade: "X", confidence: 7 }] },
      req,
      cands,
    );
    const item = out.ranked[0];
    expect(Number.isFinite(item.matchScore)).toBe(true);
    expect(["A", "B", "C", "D", "F"]).toContain(item.investGrade);
    expect(["Low", "Med", "High"]).toContain(item.riskGrade);
  });
  it("clamps numeric match scores into 0–100", () => {
    const out = sanitizeResult({ ranked: [{ id: 1, matchScore: 9999 }] }, req, cands);
    expect(out.ranked[0].matchScore).toBe(100);
  });
  it("falls back when every ranked entry is unusable", () => {
    const out = sanitizeResult({ ranked: [{ id: 12345 }] }, req, cands);
    expect(out._engine).toBe("built-in");
  });
  it("honours a valid recommendationId and rejects an invalid one", () => {
    const good = sanitizeResult({ ranked: [{ id: 2, matchScore: 80 }], recommendationId: 2 }, req, cands);
    expect(good.recommendationId).toBe(2);
    const bad = sanitizeResult({ ranked: [{ id: 1, matchScore: 80 }], recommendationId: 777 }, req, cands);
    expect(bad.recommendationId).toBe(1);
  });
  it("keeps valid owner outreach and falls back otherwise", () => {
    const withOutreach = sanitizeResult(
      { ranked: [{ id: 1, matchScore: 70 }], ownerOutreach: [{ id: 1, message: "hi" }, { id: 9, message: "x" }, null] },
      req,
      cands,
    );
    expect(withOutreach.ownerOutreach).toEqual([{ id: 1, message: "hi" }]);

    const emptyOutreach = sanitizeResult(
      { ranked: [{ id: 1, matchScore: 70 }], ownerOutreach: [{ id: 9, message: "x" }] },
      req,
      cands,
    );
    expect(emptyOutreach.ownerOutreach.length).toBeGreaterThan(0); // local fallback

    const noOutreach = sanitizeResult({ ranked: [{ id: 1, matchScore: 70 }] }, req, cands);
    expect(noOutreach.ownerOutreach.length).toBeGreaterThan(0);
  });
  it("coerces string ids in ranked and owner outreach", () => {
    const out = sanitizeResult(
      {
        ranked: [{ id: "1", matchScore: 75 }],
        ownerOutreach: [{ id: "1", message: "hi" }],
      },
      req,
      cands,
    );
    expect(out.ranked[0].id).toBe(1);
    expect(out.ownerOutreach).toEqual([{ id: 1, message: "hi" }]);
  });
  it("defaults engine label to claude and respects an explicit one", () => {
    expect(sanitizeResult({ ranked: [{ id: 1, matchScore: 50 }] }, req, cands)._engine).toBe("claude");
    expect(sanitizeResult({ ranked: [{ id: 1, matchScore: 50 }], _engine: "claude-x" }, req, cands)._engine).toBe("claude-x");
  });
});

describe("runAI", () => {
  it("skips the network entirely in forceLocal (demo) mode", async () => {
    const fetchImpl = vi.fn();
    const out = await runAI(req, cands, { forceLocal: true, fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(out._engine).toContain("เดโม");
    expect(out.ranked.length).toBe(cands.length);
  });
  it("returns the sanitized AI result on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({ ranked: [{ id: 1, matchScore: 91, investGrade: "A" }], _engine: "claude" }),
    );
    const out = await runAI(req, cands, { fetchImpl, endpoint: "/api/analyze" });
    expect(out._engine).toBe("claude");
    expect(out.ranked[0].matchScore).toBe(91);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
  it("falls back to the built-in engine on a non-200 response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const out = await runAI(req, cands, { fetchImpl });
    expect(out._engine).toContain("built-in");
  });
  it("uses globalThis.fetch and the default endpoint when none are supplied", async () => {
    const stub = vi.fn().mockResolvedValue(okJson({ ranked: [{ id: 1, matchScore: 60 }] }));
    vi.stubGlobal("fetch", stub);
    try {
      const out = await runAI(req, cands);
      expect(out.ranked[0].matchScore).toBe(60);
      expect(stub).toHaveBeenCalledWith("/api/analyze", expect.objectContaining({ method: "POST" }));
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("falls back to the built-in engine when fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const out = await runAI(req, cands, { fetchImpl });
    expect(out._engine).toContain("built-in");
    expect(out.ranked.length).toBe(cands.length);
  });

  it("sends the staff passcode header when provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({ ranked: [{ id: 1, matchScore: 70 }] }));
    await runAI(req, cands, { fetchImpl, accessCode: "s3cret" });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-tkone-code"]).toBe("s3cret");
  });

  it("throws AuthError on 401 instead of falling back", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
    await expect(runAI(req, cands, { fetchImpl })).rejects.toBeInstanceOf(AuthError);
  });
});
