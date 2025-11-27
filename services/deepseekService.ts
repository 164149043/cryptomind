
import { AgentRole, Kline, Language, UserPosition } from "../types";
import { createAgentPrompt, formatDataForPrompt } from "./prompts";

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runDeepSeekAgent = async (
  role: AgentRole,
  marketData: Kline[],
  language: Language,
  symbol: string,
  upstreamReports: Record<string, string> = {},
  userApiKey?: string,
  temperature: number = 0.7,
  extraContext?: string,
  userPosition?: UserPosition | null
): Promise<string> => {
  // Prioritize user-provided key from UI, then environment variable
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error("DeepSeek API Key missing. Please enter it in the header input.");
  }

  const dataStr = formatDataForPrompt(marketData);

  // Format upstream reports for managers
  let reportsStr = "";
  Object.entries(upstreamReports).forEach(([r, content]) => {
    reportsStr += `--- Report from ${r} ---\n${content}\n`;
  });

  const prompt = createAgentPrompt(role, dataStr, language, symbol, reportsStr, extraContext, userPosition);

  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Switched from 'deepseek-reasoner' to 'deepseek-chat'
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat", 
          messages: [
            { role: "system", content: "You are a professional crypto trading assistant." },
            { role: "user", content: prompt }
          ],
          stream: false,
          temperature: temperature,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API Error: ${response.status} - ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("DeepSeek returned empty response");
      }

      return content;
    } catch (error) {
      console.warn(`DeepSeek Agent ${role} failed attempt ${attempt + 1}/3:`, error);
      lastError = error;
      if (attempt < 2) {
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }

  console.error(`All attempts failed for agent ${role}:`, lastError);
  throw lastError;
};
