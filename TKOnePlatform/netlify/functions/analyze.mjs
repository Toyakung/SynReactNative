/* Netlify Function: POST /api/analyze → Claude (via the shared handler).
   The Anthropic API key lives ONLY in Netlify env vars — never in the browser.
   Maps the request/response to Netlify's function shape and reuses the same
   createAnalyzeHandler used by the local Express server. */

import { createAnalyzeHandler, HttpError } from "../../server/handler.mjs";

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

/** Wrap an analyze(body) function into a Netlify handler. Exported for tests. */
export function createNetlifyHandler(analyzeFn) {
  return async function handler(event) {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "method not allowed" });
    }
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "invalid JSON body" });
    }
    try {
      const result = await analyzeFn(body);
      return json(200, result);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json(status, { error: err?.message || "internal error" });
    }
  };
}

// Default handler wired to env-based config (used in production on Netlify).
export const handler = createNetlifyHandler(
  createAnalyzeHandler({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.TKONE_MODEL,
  }),
);
