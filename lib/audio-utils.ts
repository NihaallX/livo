/** Audio utility functions for client-side validation. */

import { AUDIO_CONSTRAINTS } from "./constants";

/**
 * Get the duration of an audio file using Web Audio API.
 * Works for all browser-supported formats.
 */
export async function getAudioDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;
        await audioContext.close();
        resolve(duration);
      } catch {
        reject(new Error("Could not read audio file. The file may be corrupted or in an unsupported format."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate an audio file for upload.
 */
export async function validateAudioFile(
  file: File
): Promise<{ valid: boolean; duration?: number; error?: string }> {
  // Check file type
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const typeOk =
    AUDIO_CONSTRAINTS.allowedTypes.includes(file.type as never) ||
    AUDIO_CONSTRAINTS.allowedExtensions.includes(ext as never);

  if (!typeOk) {
    return {
      valid: false,
      error: `Unsupported format "${ext}". Please use MP3, WAV, WebM, M4A, OGG, or FLAC.`,
    };
  }

  // Check file size
  if (file.size > AUDIO_CONSTRAINTS.maxFileSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is 25MB.`,
    };
  }

  // Check duration
  try {
    const duration = await getAudioDuration(file);

    if (duration < AUDIO_CONSTRAINTS.minDuration) {
      return {
        valid: false,
        duration,
        error: `Audio is too short (${formatDuration(duration)}). Minimum is ${AUDIO_CONSTRAINTS.minDuration} seconds.`,
      };
    }

    if (duration > AUDIO_CONSTRAINTS.maxDuration) {
      return {
        valid: false,
        duration,
        error: `Audio is too long (${formatDuration(duration)}). Maximum is ${AUDIO_CONSTRAINTS.maxDuration} seconds.`,
      };
    }

    return { valid: true, duration };
  } catch {
    return {
      valid: false,
      error: "Could not read audio duration. The file may be corrupted.",
    };
  }
}

/**
 * Format seconds as "M:SS" display.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
