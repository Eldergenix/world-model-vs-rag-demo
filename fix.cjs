const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const retryFunction = `
      const generateWithRetry = async (modelName, contents, config, maxRetries = 3) => {
        let attempt = 0;
        let lastError;
        while (attempt < maxRetries) {
          try {
            return await ai.models.generateContentStream({
              model: modelName,
              contents,
              config,
            });
          } catch (error) {
            lastError = error;
            const message = error.message || "";
            if (message.includes("429") || message.includes("Too Many Requests") || message.includes("Quota exceeded") || message.includes("RESOURCE_EXHAUSTED")) {
              attempt++;
              console.log(\`Rate limit hit for \${modelName}, retrying attempt \${attempt}...\`);
              await new Promise(r => setTimeout(r, 2000 * attempt));
            } else {
              throw error;
            }
          }
        }
        throw lastError;
      };
`;

code = code.replace(/if \(mode === "world"\) \{/, retryFunction + '\n      if (mode === "world") {');
code = code.replace(/await ai\.models\.generateContentStream\(\{[\s\S]*?model: "gemini-3\.5-flash",[\s\S]*?contents: messages,[\s\S]*?config: \{[\s\S]*?systemInstruction:[\s\S]*?'You are a helpful, human-like World Model AI[\s\S]*?\}\n\s*\}\)/, `await generateWithRetry("gemini-3.5-flash", messages, {\n            systemInstruction:\n              'You are a helpful, human-like World Model AI specializing in social interactions and logistics. You understand practical connections between multiple users (e.g., travel times, schedules, dynamics). Synthesize these variables to provide practical, actionable advice. Keep your responses natural, conversational, helpful, and concise. Avoid long drawn-out explanations. CRITICAL: DO NOT use markdown asterisks (* or **) for formatting. Use plain text formatting. ALWAYS append a JSON block with your accuracy/confidence score and performance optimization metrics at the very end of your response, formatted EXACTLY like this: \`\`\`json\\n{ "ui_type": "accuracy", "score": 98, "reasoning": "High confidence. Fast TTFT achieved via Context Caching.", "ttft_ms": 112, "cache_hit": true }\\n\`\`\` When appropriate, embed rich UI elements by outputting JSON blocks formatted EXACTLY like this: \`\`\`json\\n{ "ui_type": "chart", "type": "bar", "title": "...", "data": [{"name": "...", "value": 10}] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "table", "headers": ["A"], "rows": [["1"]] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "calendar", "events": [{"time": "...", "title": "...", "desc": "..."}] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "route", "origin": "...", "destination": "...", "waypoints": ["..."], "time": "..." }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "map", "locations": [{"lat": 0, "lng": 0, "label": "..."}] }\\n\`\`\`',\n          })`);

code = code.replace(/await ai\.models\.generateContentStream\(\{[\s\S]*?model: "gemini-3\.5-flash",[\s\S]*?contents: messages,[\s\S]*?config: \{[\s\S]*?systemInstruction:[\s\S]*?'You are a helpful, human-like RAG[\s\S]*?\}\n\s*\}\)/, `await generateWithRetry("gemini-3.5-flash", messages, {\n            systemInstruction:\n              'You are a helpful, human-like RAG (Retrieval-Augmented Generation) AI. You rely on explicit facts retrieved from a database. Try to personalize your responses based on these facts. If a query requires resolving complex logistical conflicts or synthesizing unprovided details, attempt to do so but explicitly reflect your lower confidence in your accuracy score. Keep your answers conversational, concise, and direct. Avoid long drawn-out responses. CRITICAL: DO NOT use markdown asterisks (* or **) for formatting. Use plain text formatting. ALWAYS append a JSON block with your accuracy/confidence score at the very end of your response, formatted EXACTLY like this: \`\`\`json\\n{ "ui_type": "accuracy", "score": 65, "reasoning": "Lower confidence due to missing context for complex synthesis." }\\n\`\`\` When appropriate, embed rich UI elements by outputting JSON blocks formatted EXACTLY like this: \`\`\`json\\n{ "ui_type": "chart", "type": "bar", "title": "...", "data": [{"name": "...", "value": 10}] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "table", "headers": ["A"], "rows": [["1"]] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "calendar", "events": [{"time": "...", "title": "...", "desc": "..."}] }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "route", "origin": "...", "destination": "...", "waypoints": ["..."], "time": "..." }\\n\`\`\` or \`\`\`json\\n{ "ui_type": "map", "locations": [{"lat": 0, "lng": 0, "label": "..."}] }\\n\`\`\`',\n          })`);

// error formatting
code = code.replace(/res\.write\(\n\s*\`data: \$\{JSON\.stringify\(\{ error: \(error as Error\)\.message \}\)\}\\n\\n\`,\n\s*\);/, `let errorMessage = (error as Error).message;
      
      try {
        if (errorMessage.includes('{')) {
          const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
          if (parsed.error?.code === 429) {
             errorMessage = "Rate limit exceeded. Please try again in a moment.";
          } else if (parsed.error?.message) {
             errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Fallback to original message
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
         errorMessage = "Rate limit exceeded. Please try again in a moment.";
      }
      
      res.write(\`data: \${JSON.stringify({ error: errorMessage })}\\n\\n\`);`);

fs.writeFileSync('server.ts', code);
