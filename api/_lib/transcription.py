"""Groq Whisper STT service — transcribes audio with word-level timestamps."""

import httpx
import os
from typing import Any

GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODEL = "whisper-large-v3-turbo"
TIMEOUT = 45  # seconds


def transcribe_audio(audio_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Send audio to Groq Whisper and return transcript with word timestamps.

    Returns:
        {
            "text": "full transcript",
            "duration": 34.2,
            "words": [{"word": "the", "start": 0.0, "end": 0.3}, ...]
        }

    Raises:
        ValueError: If transcription fails or returns empty.
        httpx.HTTPStatusError: On API errors.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    # Determine content type from filename
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    content_types = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "webm": "audio/webm",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
        "flac": "audio/flac",
        "mp4": "audio/mp4",
    }
    content_type = content_types.get(ext, "audio/webm")

    files = {
        "file": (filename, audio_bytes, content_type),
    }
    data = {
        "model": MODEL,
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "language": "en",
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files=files,
            data=data,
        )

        if resp.status_code == 413:
            raise ValueError("Audio file is too large. Maximum size is 25MB.")
        if resp.status_code == 429:
            raise ValueError(
                "Rate limit reached. Please wait a moment and try again."
            )
        resp.raise_for_status()

    result = resp.json()
    text = result.get("text", "").strip()
    if not text:
        raise ValueError(
            "Transcription returned empty. The audio may not contain "
            "recognizable English speech."
        )

    words = []
    for w in result.get("words", []):
        words.append(
            {
                "word": w.get("word", "").strip(),
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
            }
        )

    duration = result.get("duration", 0.0)
    # Fallback: estimate duration from last word timestamp
    if not duration and words:
        duration = words[-1]["end"]

    return {"text": text, "duration": duration, "words": words}
