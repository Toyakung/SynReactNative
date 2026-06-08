import { describe, expect, it, vi } from "vitest";
import {
  HttpError,
  buildUserPrompt,
  createAnalyzeHandler,
  extractJson,
  validateBody,
} from "../server/handler.mjs";

const body = {
  req: { location: "อโศก", budgetMin: "1", budgetMax: "2" },
  cands: [{ id: 1, name: "A", price: "1500000" }],
};

describe("validateBody", () => {
  it("accepts a well-formed body", () => {
    expect(validateBody(body)).toEqual(body);
  });
  it("rejects bad shapes with 400s", () => {
    expect(() => validateBody(null)).toThrow(HttpError);
    expect(() => validateBody({})).toThrow(/req is required/);
    expect(() => validateBody({ req: {}, cands: [] })).toThrow(/non-empty/);
    expect(() => validateBody({ req: {}, cands: "x" })).toThrow(/non-empty/);
  });
});

describe("buildUserPrompt", () => {
  it("embeds requirement and candidate JSON", () => {
    const p = buildUserPrompt(body.req, body.cands);
    expect(p).toContain("อโศก");
    expect(p).toContain('"name":"A"');
    expect(p).toContain("ownerOutreach");
  });
});

describe("extractJson", () => {
  it("extracts the JSON object from a noisy string", () => {
    expect(extractJson('blah {"a":1} trailing')).toEqual({ a: 1 });
  });
  it("throws a 502 when no JSON object is present", () => {
    expect(() => extractJson("no json here")).toThrow(HttpError);
  });
});

describe("createAnalyzeHandler", () => {
  it("throws 503 when no API key is configured", async () => {
    const handler = createAnalyzeHandler({ fetchImpl: vi.fn() });
    await expect(handler(body)).rejects.toMatchObject({ status: 503 });
  });

  it("calls Anthropic with the key header and returns parsed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: '{"ranked":[{"id":1,"matchScore":80}]}' },
          { type: "other", text: "ignored" },
        ],
      }),
    });
    const handler = createAnalyzeHandler({ apiKey: "sk-test", fetchImpl, model: "m" });
    const out = await handler(body);
    expect(out._engine).toBe("claude");
    expect(out.ranked[0].matchScore).toBe(80);

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers["x-api-key"]).toBe("sk-test");
    expect(JSON.parse(init.body).model).toBe("m");
  });

  it("throws 502 when Anthropic responds with an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const handler = createAnalyzeHandler({ apiKey: "sk-test", fetchImpl });
    await expect(handler(body)).rejects.toMatchObject({ status: 502 });
  });

  it("tolerates a missing content array", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const handler = createAnalyzeHandler({ apiKey: "sk-test", fetchImpl });
    await expect(handler(body)).rejects.toThrow(HttpError); // no JSON to extract
  });

  it("defaults config and falls back to globalThis.fetch", async () => {
    // no-arg construction exercises the default cfg + default fetch wiring
    const noArg = createAnalyzeHandler();
    await expect(noArg(body)).rejects.toMatchObject({ status: 503 });

    const stub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", stub);
    try {
      const handler = createAnalyzeHandler({ apiKey: "sk-test" });
      await handler(body);
      expect(stub).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses the default model when none is given", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    const handler = createAnalyzeHandler({ apiKey: "sk-test", fetchImpl });
    await handler(body);
    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse(init.body).model).toBe("claude-sonnet-4-20250514");
  });
});
