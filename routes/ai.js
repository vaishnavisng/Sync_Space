const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const MODEL = "gemini-3.5-flash-lite";
const MAX_CODE_CHARS = 8000;
const MAX_QUESTION_CHARS = 2000;
const MAX_OUTPUT_CHARS = 2000;

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;
const buckets = new Map();

function withinRateLimit(key) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

function buildPrompt({ question, code, language, fileName, errorOutput }) {
  const parts = [
    "You are a coding assistant embedded in a collaborative code editor. " +
      "Answer the user's question about the code below concisely. " +
      "If they're asking about an error, explain the likely cause and how to fix it.",
    "",
    `File: ${fileName || "untitled"} (${language || "unknown language"})`,
    "```" + (language || ""),
    (code || "").slice(0, MAX_CODE_CHARS),
    "```",
  ];
  if (errorOutput) {
    parts.push("", "Most recent run output:", "```", errorOutput.slice(0, MAX_OUTPUT_CHARS), "```");
  }
  parts.push("", `Question: ${question.slice(0, MAX_QUESTION_CHARS)}`);
  return parts.join("\n");
}

router.post("/ask", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "AI doubt box is not configured on this server." });
  }
  if (!withinRateLimit(req.ip)) {
    return res.status(429).json({ error: "Too many questions — please wait a bit before asking again." });
  }

  const { question, code, language, fileName, errorOutput } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt({ question, code, language, fileName, errorOutput }),
    });
    res.json({ answer: response.text });
  } catch (err) {
    console.error("AI doubt box error:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "AI service is rate-limited right now — try again shortly." });
    }
    res.status(502).json({ error: "AI service failed to respond." });
  }
});

module.exports = router;
