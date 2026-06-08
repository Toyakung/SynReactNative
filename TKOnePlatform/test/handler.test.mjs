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

// A fake Anthropic client whose messages.create returns a canned response.
const fakeClient = (text) => ({
  messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text }] }) },
});

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
    expect(p).toContain("ทรัพย์ที่พนักงานหามา");
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
  it("throws 503 when no client/API key is configured", async () => {
    const handler = createAnalyzeHandler();
    await expect(handler(body)).rejects.toMatchObject({ status: 503 });
  });

  it("calls the SDK with structured output config and returns parsed JSON", async () => {
    const client = fakeClient('{"ranked":[{"id":1,"matchScore":80}]}');
    const handler = createAnalyzeHandler({ client, model: "m" });
    const out = await handler(body);
    expect(out._engine).toBe("claude");
    expect(out.ranked[0].matchScore).toBe(80);

    const params = client.messages.create.mock.calls[0][0];
    expect(params.model).toBe("m");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.system).toContain("TK One");
  });

  it("defaults to claude-opus-4-8 when no model is given", async () => {
    const client = fakeClient("{}");
    const handler = createAnalyzeHandler({ client });
    await handler(body);
    expect(client.messages.create.mock.calls[0][0].model).toBe("claude-opus-4-8");
  });

  it("wraps SDK errors as HttpError, preserving the status when present", async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 })) } };
    const handler = createAnalyzeHandler({ client });
    await expect(handler(body)).rejects.toMatchObject({ status: 429 });

    const noStatus = { messages: { create: vi.fn().mockRejectedValue(new Error("boom")) } };
    await expect(createAnalyzeHandler({ client: noStatus })(body)).rejects.toMatchObject({ status: 502 });
  });

  it("throws when the response carries no JSON text", async () => {
    const client = { messages: { create: vi.fn().mockResolvedValue({}) } };
    const handler = createAnalyzeHandler({ client });
    await expect(handler(body)).rejects.toThrow(HttpError);
  });
});
