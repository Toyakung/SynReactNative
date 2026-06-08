/* Express AI proxy. The browser only ever talks to this server. */
import express from "express";
import { createAnalyzeHandler, HttpError, verifyAccessCode } from "./handler.mjs";

const PORT = process.env.PORT || 8787;
const app = express();
app.use(express.json({ limit: "1mb" }));

const analyze = createAnalyzeHandler({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.TKONE_MODEL,
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.post("/api/analyze", async (req, res) => {
  try {
    verifyAccessCode(process.env.TKONE_ACCESS_CODE, req.headers["x-tkone-code"]);
    const result = await analyze(req.body);
    res.json(result);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    res.status(status).json({ error: err.message || "internal error" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`TK ONE AI proxy listening on :${PORT}`);
});
