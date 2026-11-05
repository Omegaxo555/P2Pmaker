import type { AIResponsePayload } from '@/types/analytics';

export function parseAIResponse(rawResponse: string): {
  narrative: string;
  parsedJson: AIResponsePayload | null;
} {
  const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = rawResponse.match(jsonRegex);

  if (!match) {
    return {
      narrative: rawResponse.trim(),
      parsedJson: null,
    };
  }

  const jsonString = match[1].trim();
  const narrative = rawResponse.replace(jsonRegex, '').trim();

  try {
    const parsed = JSON.parse(jsonString) as AIResponsePayload;
    return {
      narrative,
      parsedJson: parsed,
    };
  } catch (error) {
    console.error('[Parser] Error parseando JSON de Gemini:', error);
    return {
      narrative,
      parsedJson: null,
    };
  }
}

