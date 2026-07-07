/** API client for the pronunciation analysis backend. */

export interface WordResult {
  word: string;
  status: "correct" | "mispronounced" | "unclear" | "missing" | "extra";
  feedback: string | null;
  start: number | null;
  end: number | null;
}

export interface AnalysisResult {
  score: number;
  transcript: string;
  words: WordResult[];
  fluency_comment: string;
  mode: string;
  word_accuracy_pct: number | null;
  fluency_score: number;
  clarity_score: number;
  duration_seconds: number;
  breakdown: Record<string, { value: number; weight: number }>;
}

export interface AnalysisError {
  error: string;
}

/**
 * Send audio to the backend for pronunciation analysis.
 */
export async function analyzePronunciation(
  audio: Blob,
  mode: "scripted" | "free_speech",
  referenceText?: string,
  clientDuration?: number,
  filename?: string
): Promise<AnalysisResult> {
  const formData = new FormData();

  // Use original filename or generate one based on blob type
  const ext = audio.type.includes("webm")
    ? "webm"
    : audio.type.includes("mp4") || audio.type.includes("m4a")
      ? "m4a"
      : audio.type.includes("wav")
        ? "wav"
        : audio.type.includes("ogg")
          ? "ogg"
          : "webm";

  formData.append("audio", audio, filename || `recording.${ext}`);
  formData.append("mode", mode);

  if (mode === "scripted" && referenceText) {
    formData.append("reference_text", referenceText);
  }

  if (clientDuration !== undefined) {
    formData.append("client_duration", clientDuration.toString());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as AnalysisError | null;
      const message =
        data?.error ||
        `Analysis failed (HTTP ${response.status}). Please try again.`;

      // Map specific status codes to user-friendly messages
      if (response.status === 413) {
        throw new Error("Audio file is too large. Please use a shorter or lower-quality recording.");
      }
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
      if (response.status === 422) {
        throw new Error(message);
      }

      throw new Error(message);
    }

    return (await response.json()) as AnalysisResult;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Analysis timed out. The server may be busy — please try again in a moment."
        );
      }
      throw error;
    }

    throw new Error("An unexpected error occurred. Please try again.");
  }
}
