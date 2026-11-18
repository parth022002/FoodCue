/**
 * FoodCue Groq High-Speed AI Service
 * Supports hands-free kitchen voice intake (Whisper) and high-speed text analysis.
 */

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GroqService {
  private getApiKey(): string | null {
    if (typeof process !== "undefined" && (process.env?.GROQ_API_KEY || process.env?.VITE_GROQ_API_KEY)) {
      return process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || null;
    }
    if (typeof import.meta !== "undefined" && (import.meta.env?.VITE_GROQ_API_KEY || import.meta.env?.GROQ_API_KEY)) {
      return import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || null;
    }
    return null;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return Boolean(key && !key.includes("REPLACE_ME") && key.startsWith("gsk_"));
  }

  /**
   * High-speed text completion (e.g. for conversational kitchen queries or recipe advice)
   */
  async chatCompletion(
    messages: GroqChatMessage[],
    options: { model?: string; maxTokens?: number } = {}
  ): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: options.model || "openai/gpt-oss-20b",
          messages,
          max_tokens: options.maxTokens || 250,
          temperature: 0.2
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      }
    } catch {
      // Graceful fallback to deterministic local rules
    }

    return null;
  }

  /**
   * Transcribes kitchen voice audio to text using Whisper Large v3 Turbo
   */
  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "kitchen_audio.webm");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "en");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData,
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        const data = await res.json();
        return data.text || null;
      }
    } catch {
      // Audio transcription error
    }

    return null;
  }
}

export const groqService = new GroqService();
