const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const fallbackModel = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

app.post("/analyze", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        error: "Please provide code as a non-empty string.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in backend/.env.",
      });
    }

    const prompt = `You are a senior software engineer. Analyze the following code.
1. Find bugs
2. Explain the issue clearly
3. Suggest fixes
4. Provide corrected code

Code:\n\n${code}`;

    let response;
    try {
      response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      });
    } catch (error) {
      const isModelNotFound =
        error?.status === 404 || /not found|supported/i.test(error?.message || "");

      if (!isModelNotFound || GEMINI_MODEL === DEFAULT_GEMINI_MODEL) {
        throw error;
      }

      console.warn(
        `Configured GEMINI_MODEL "${GEMINI_MODEL}" is unavailable. Falling back to "${DEFAULT_GEMINI_MODEL}".`
      );

      response = await fallbackModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      });
    }

    const result = response.response?.text?.() || "No analysis returned.";

    return res.json({ result });
  } catch (error) {
    console.error("Analysis error:", error);

    const rawMessage = error?.message || "";
    const isQuotaError =
      error?.status === 429 || /quota exceeded|too many requests/i.test(rawMessage);

    if (isQuotaError) {
      const retryMatch = rawMessage.match(/Please retry in\s+([\d.]+)s/i);
      const retrySeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;

      return res.status(429).json({
        error:
          "Gemini API quota exceeded for this API key/project. Enable billing or use a key with available quota.",
        retryAfterSeconds: retrySeconds,
        details:
          "Open https://ai.dev/rate-limit and https://ai.google.dev/gemini-api/docs/rate-limits to verify quota and limits.",
      });
    }

    const statusCode = error?.status || 500;
    const message = rawMessage || "Something went wrong while analyzing the code.";

    return res.status(statusCode).json({
      error: message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("BugSage backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
