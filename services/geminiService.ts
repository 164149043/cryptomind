
import { GoogleGenAI, Type } from "@google/genai";
import { AgentRole, Kline, Language, UserPosition } from "../types";
import { createAgentPrompt, formatDataForPrompt } from "./prompts";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runGeminiAgent = async (
  role: AgentRole, 
  marketData: Kline[], 
  language: Language,
  symbol: string,
  upstreamReports: Record<string, string> = {},
  temperature: number = 0.7,
  extraContext?: string,
  userPosition?: UserPosition | null
): Promise<string> => {
  const ai = getAI();
  const modelId = 'gemini-2.5-flash'; 
  
  const dataStr = formatDataForPrompt(marketData);
  
  // Format upstream reports for managers
  let reportsStr = "";
  Object.entries(upstreamReports).forEach(([r, content]) => {
    reportsStr += `--- Report from ${r} ---\n${content}\n`;
  });

  const prompt = createAgentPrompt(role, dataStr, language, symbol, reportsStr, extraContext, userPosition);

  let responseSchema: any = undefined;
  let responseMimeType: string | undefined = undefined;

  // CEO outputs JSON
  if (role === AgentRole.CEO) {
    responseMimeType = "application/json";
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["LONG", "SHORT", "WAIT"] },
        confidence: { type: Type.NUMBER },
        entryPrice: { type: Type.STRING },
        stopLoss: { type: Type.STRING },
        takeProfit: { type: Type.STRING },
        reasoning: { type: Type.STRING }
      },
      required: ["action", "confidence", "entryPrice", "stopLoss", "takeProfit", "reasoning"]
    };
  }

  // Retry logic with exponential backoff
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType,
          responseSchema,
          temperature: temperature
        }
      });

      const text = response.text;
      return text || "No analysis generated.";
    } catch (error: any) {
      console.warn(`Agent ${role} failed attempt ${attempt + 1}/3:`, error);
      lastError = error;
      
      // Don't retry on certain fatal errors if we could detect them, 
      // but 500/RPC errors are usually retriable.
      if (attempt < 2) {
        const backoffTime = 1000 * Math.pow(2, attempt); // 1s, 2s
        await delay(backoffTime);
      }
    }
  }

  console.error(`All attempts failed for agent ${role}. Last error:`, lastError);
  throw lastError;
};
