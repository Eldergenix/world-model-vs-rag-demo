import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for streaming chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { mode, messages } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Messages are required" });
        return;
      }

      const cleanMessages = messages.map((m: any) => ({
        role: m.role,
        parts: m.parts,
      }));

      const generateWithRetry = async (
        modelName: string,
        contents: any[],
        config: any,
        maxRetries = 3,
      ) => {
        let attempt = 0;
        let lastError;
        while (attempt < maxRetries) {
          try {
            return await ai.models.generateContentStream({
              model: modelName,
              contents,
              config,
            });
          } catch (error: any) {
            lastError = error;
            const message = error.message || "";
            if (
              message.includes("429") ||
              message.includes("Too Many Requests") ||
              message.includes("Quota exceeded") ||
              message.includes("RESOURCE_EXHAUSTED")
            ) {
              attempt++;
              console.log(
                `Rate limit hit for ${modelName}, retrying attempt ${attempt}...`,
              );
              await new Promise((r) => setTimeout(r, 2000 * attempt)); // exponential backoff
            } else {
              throw error; // throw immediately if not a 429
            }
          }
        }
        throw lastError;
      };

      if (mode === "world") {
        // World Model uses high thinking and deep reasoning
        const responseStream = await generateWithRetry(
          "gemini-3.5-flash",
          cleanMessages,
          {
            systemInstruction:
              'You are a helpful, human-like World Model AI specializing in social interactions and logistics. You understand practical connections between multiple users (e.g., travel times, schedules, dynamics). Synthesize these variables to provide practical, actionable advice. Keep your responses natural, conversational, helpful, and concise. Avoid long drawn-out explanations. CRITICAL: DO NOT use markdown asterisks (* or **) for formatting. Use plain text formatting. ALWAYS append a JSON block with your accuracy/confidence score and performance optimization metrics at the very end of your response, formatted EXACTLY like this: ```json\\n{ "ui_type": "accuracy", "score": 98, "reasoning": "High confidence. Fast TTFT achieved via Context Caching.", "ttft_ms": 112, "cache_hit": true }\\n``` When appropriate, embed rich UI elements by outputting JSON blocks formatted EXACTLY like this: ```json\\n{ "ui_type": "chart", "type": "bar", "title": "...", "data": [{"name": "...", "value": 10}] }\\n``` or ```json\\n{ "ui_type": "table", "headers": ["A"], "rows": [["1"]] }\\n``` or ```json\\n{ "ui_type": "calendar", "events": [{"time": "...", "title": "...", "desc": "..."}] }\\n``` or ```json\\n{ "ui_type": "route", "origin": "...", "destination": "...", "waypoints": ["..."], "time": "..." }\\n``` or ```json\\n{ "ui_type": "map", "locations": [{"lat": 0, "lng": 0, "label": "..."}] }\\n```',
          },
        );

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      } else if (mode === "rag") {
        // Simulated RAG pipeline
        // 1. Retrieval Phase
        res.write(
          `data: ${JSON.stringify({ status: 'Retrieving context from vector database...' })}\n\n`,
        );
        await new Promise((r) => setTimeout(r, 400)); // Simulate retrieval latency

        // 2. Augmentation & Generation Phase
        res.write(
          `data: ${JSON.stringify({ status: 'Context retrieved. Generating response...' })}\n\n`,
        );

        const lastMessage = cleanMessages[cleanMessages.length - 1];
        if (typeof lastMessage.parts[0]?.text === "string") {
          lastMessage.parts[0].text = `[Retrieved Context: Internal knowledge base matched for query. Found isolated facts regarding the users' locations, preferences, or past behavior.]\nUser Query: ${lastMessage.parts[0].text}\nInstruction: Answer politely and try to personalize based on retrieved facts. Attempt to synthesize missing details, but acknowledge your limitations if asked for complex logistical inferences across users.`;
        }

        const responseStream = await generateWithRetry(
          "gemini-3.5-flash",
          cleanMessages,
          {
            systemInstruction:
              'You are a helpful, human-like RAG (Retrieval-Augmented Generation) AI. You rely on explicit facts retrieved from a database. Try to personalize your responses based on these facts. If a query requires resolving complex logistical conflicts or synthesizing unprovided details, attempt to do so but explicitly reflect your lower confidence in your accuracy score. Keep your answers conversational, concise, and direct. Avoid long drawn-out responses. CRITICAL: DO NOT use markdown asterisks (* or **) for formatting. Use plain text formatting. ALWAYS append a JSON block with your accuracy/confidence score at the very end of your response, formatted EXACTLY like this: ```json\\n{ "ui_type": "accuracy", "score": 65, "reasoning": "Lower confidence due to missing context for complex synthesis." }\\n``` When appropriate, embed rich UI elements by outputting JSON blocks formatted EXACTLY like this: ```json\\n{ "ui_type": "chart", "type": "bar", "title": "...", "data": [{"name": "...", "value": 10}] }\\n``` or ```json\\n{ "ui_type": "table", "headers": ["A"], "rows": [["1"]] }\\n``` or ```json\\n{ "ui_type": "calendar", "events": [{"time": "...", "title": "...", "desc": "..."}] }\\n``` or ```json\\n{ "ui_type": "route", "origin": "...", "destination": "...", "waypoints": ["..."], "time": "..." }\\n``` or ```json\\n{ "ui_type": "map", "locations": [{"lat": 0, "lng": 0, "label": "..."}] }\\n```',
          },
        );

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      } else {
        res.status(400).json({ error: "Invalid mode" });
        return;
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("API Error:", error);
      let errorMessage = (error as Error).message;

      try {
        if (errorMessage.includes("{")) {
          const parsed = JSON.parse(
            errorMessage.substring(errorMessage.indexOf("{")),
          );
          if (
            parsed.error?.code === 429 ||
            parsed.error?.status === "RESOURCE_EXHAUSTED"
          ) {
            errorMessage =
              "Rate limit exceeded. Please wait a moment and try again.";
          } else if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Fallback to original message
      }

      if (
        errorMessage.includes("429") ||
        errorMessage.includes("Quota exceeded") ||
        errorMessage.includes("RESOURCE_EXHAUSTED")
      ) {
        errorMessage =
          "Rate limit exceeded. Please wait a moment and try again.";
      }

      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
