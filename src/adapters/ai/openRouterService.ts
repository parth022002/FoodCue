/**
 * FoodCue OpenRouter Multi-Model AI Service
 * Gateway for vision/multimodal fallback when packaging labels are blurry, damaged, or unreadable by local OCR.
 */

export interface OpenRouterVisionInput {
  base64Image: string;
  mimeType?: string;
  prompt?: string;
}

export class OpenRouterService {
  private getApiKey(): string | null {
    if (typeof process !== "undefined" && (process.env?.OPENROUTER_API_KEY || process.env?.VITE_OPENROUTER_API_KEY)) {
      return process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || null;
    }
    if (typeof import.meta !== "undefined" && (import.meta.env?.VITE_OPENROUTER_API_KEY || import.meta.env?.OPENROUTER_API_KEY)) {
      return import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY || null;
    }
    return null;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return Boolean(key && !key.includes("REPLACE_ME") && key.startsWith("sk-or-v1-"));
  }

  /**
   * Multimodal vision analysis to extract ingredients and allergens from a packaging photograph
   */
  async analyzePackagingImage(input: OpenRouterVisionInput): Promise<{
    extractedText: string;
    identifiedAllergens: string[];
    isSuccessful: boolean;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { extractedText: "", identifiedAllergens: [], isSuccessful: false };
    }

    const mime = input.mimeType || "image/jpeg";
    const promptText = input.prompt || "Extract all ingredients and declared allergens from this food packaging image in plain text.";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://foodcue.vercel.app",
          "X-Title": "FoodCue"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-11b-vision-instruct:free",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${input.base64Image}` }
                }
              ]
            }
          ],
          max_tokens: 350
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        return {
          extractedText: text,
          identifiedAllergens: [],
          isSuccessful: true
        };
      }
    } catch {
      // Vision fallback error
    }

    return { extractedText: "", identifiedAllergens: [], isSuccessful: false };
  }
}

export const openRouterService = new OpenRouterService();
