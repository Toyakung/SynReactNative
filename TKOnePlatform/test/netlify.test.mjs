import { describe, expect, it, vi } from "vitest";
import { createNetlifyHandler } from "../netlify/functions/analyze.mjs";
import { HttpError } from "../server/handler.mjs";

const post = (body) => ({ httpMethod: "POST", body });

describe("createNetlifyHandler", () => {
  it("returns 200 with the analysis result", async () => {
    const analyze = vi.fn().mockResolvedValue({ ranked: [], _engine: "claude" });
    const handler = createNetlifyHandler(analyze);
    const res = await handler(post(JSON.stringify({ req: {}, cands: [{ id: 1 }] })));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)._engine).toBe("claude");
  });

  it("rejects non-POST with 405", async () => {
    const handler = createNetlifyHandler(vi.fn());
    const res = await handler({ httpMethod: "GET" });
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 for invalid JSON", async () => {
    const handler = createNetlifyHandler(vi.fn());
    const res = await handler(post("{not json"));
    expect(res.statusCode).toBe(400);
  });

  it("maps HttpError status (e.g. 503 when AI not configured)", async () => {
    const analyze = vi.fn().mockRejectedValue(new HttpError(503, "no key"));
    const handler = createNetlifyHandler(analyze);
    const res = await handler(post("{}"));
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toBe("no key");
  });

  it("maps unexpected errors to 500", async () => {
    const analyze = vi.fn().mockRejectedValue(new Error("boom"));
    const handler = createNetlifyHandler(analyze);
    const res = await handler(post("{}"));
    expect(res.statusCode).toBe(500);
  });
});
