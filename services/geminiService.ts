
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResult } from "../types";

export const optimizeDockerfile = async (
  dockerfileContent: string,
  systemPrompt: string
): Promise<OptimizationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Optimize this Dockerfile:\n\n${dockerfileContent}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedDockerfile: { type: Type.STRING },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            explanation: { type: Type.STRING },
            detailedChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  optimized: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["original", "optimized", "reason"]
              }
            }
          },
          required: ["optimizedDockerfile", "improvements", "explanation", "detailedChanges"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    return JSON.parse(resultText) as OptimizationResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error?.message || "Unknown error occurred";
    throw new Error(`AI Request Failed: ${errorMessage}`);
  }
};
