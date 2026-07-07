"""LLM judgment service — uses Groq LLaMA for pronunciation feedback."""

import httpx
import json
import os
from typing import Any

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"
TIMEOUT = 45


SCRIPTED_SYSTEM_PROMPT = """You are an expert English pronunciation coach. Analyze speech transcription quality by comparing it to a reference sentence.

You receive:
1. The reference sentence the speaker was asked to read
2. The actual transcript from speech-to-text
3. Word alignment data showing hits, substitutions, deletions, and insertions

Your job: For each word in the transcript, classify it and provide helpful feedback for language learners.

Return ONLY valid JSON with this exact structure:
{
  "words": [
    {
      "word": "the",
      "status": "correct",
      "feedback": null
    },
    {
      "word": "queek",
      "status": "mispronounced",
      "feedback": "Should be 'quick' — the short /ɪ/ vowel sounds like /iː/. Try saying 'kwɪk' with a shorter vowel."
    }
  ],
  "fluency_score": 75,
  "fluency_comment": "Your pacing is good but some consonant clusters need work. Focus on...",
  "clarity_score": 80
}

Status values: "correct", "mispronounced", "unclear", "missing", "extra"
- correct: word matches reference and sounds natural
- mispronounced: word was spoken but differs from reference (substitution)
- unclear: word is mumbled or garbled in the transcript
- missing: reference word was not spoken (deletion)
- extra: word spoken but not in reference (insertion)

For feedback, give specific, actionable pronunciation tips a language learner would find helpful. Mention specific sounds using IPA when relevant. Keep each feedback to 1-2 sentences.

fluency_score (0-100): Overall smoothness, rhythm, natural pacing
clarity_score (0-100): How clear and understandable the speech is"""


FREE_SPEECH_SYSTEM_PROMPT = """You are an expert English pronunciation coach analyzing free-form speech.

You receive a transcript from speech-to-text. There is no reference text — the speaker was talking freely.

Analyze the transcript for:
- Word clarity and pronunciation quality
- Fluency and natural rhythm
- Any words that appear garbled or unclear in the transcript (these likely indicate pronunciation issues)

Return ONLY valid JSON with this exact structure:
{
  "words": [
    {
      "word": "hello",
      "status": "correct",
      "feedback": null
    },
    {
      "word": "somethng",
      "status": "unclear",
      "feedback": "This word appears garbled — it may indicate unclear pronunciation. Try speaking more slowly and enunciating each syllable."
    }
  ],
  "fluency_score": 75,
  "fluency_comment": "Your speech flows naturally with good pacing. Some words could be more clearly articulated...",
  "clarity_score": 80
}

Status values: "correct", "unclear", "mispronounced"
- correct: word sounds clear and natural
- unclear: word appears garbled or incomplete in transcript
- mispronounced: common English word that appears misspelled in transcript, suggesting pronunciation error

fluency_score (0-100): Overall smoothness, rhythm, natural pacing
clarity_score (0-100): How clear and understandable the speech is"""


def get_pronunciation_judgment(
    transcript: str,
    words_with_timestamps: list[dict],
    mode: str,
    reference_text: str | None = None,
    alignment_data: dict | None = None,
) -> dict[str, Any]:
    """
    Call Groq LLaMA to get pronunciation judgment and feedback.

    Returns structured JSON with per-word status, feedback, and scores.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    if mode == "scripted" and reference_text and alignment_data:
        system_prompt = SCRIPTED_SYSTEM_PROMPT
        user_content = (
            f"Reference sentence: \"{reference_text}\"\n\n"
            f"Actual transcript: \"{transcript}\"\n\n"
            f"Word alignment data:\n{json.dumps(alignment_data.get('alignments', []), indent=2)}\n\n"
            f"Word Error Rate: {alignment_data.get('wer', 0):.1%}\n\n"
            f"Analyze each word and provide pronunciation feedback."
        )
    else:
        system_prompt = FREE_SPEECH_SYSTEM_PROMPT
        user_content = (
            f"Transcript: \"{transcript}\"\n\n"
            f"Word timestamps: {json.dumps(words_with_timestamps[:50])}\n\n"
            f"Analyze the pronunciation quality and clarity of this free speech."
        )

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 4096,
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            GROQ_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if resp.status_code == 429:
            raise ValueError(
                "Rate limit reached on feedback model. Please wait a moment."
            )
        resp.raise_for_status()

    result = resp.json()
    content = result["choices"][0]["message"]["content"]

    try:
        judgment = json.loads(content)
    except json.JSONDecodeError:
        raise ValueError("Failed to parse pronunciation feedback from LLM.")

    # Validate expected fields
    if "words" not in judgment:
        judgment["words"] = []
    if "fluency_score" not in judgment:
        judgment["fluency_score"] = 50
    if "clarity_score" not in judgment:
        judgment["clarity_score"] = 50
    if "fluency_comment" not in judgment:
        judgment["fluency_comment"] = "Analysis complete."

    # Clamp scores
    judgment["fluency_score"] = max(0, min(100, int(judgment["fluency_score"])))
    judgment["clarity_score"] = max(0, min(100, int(judgment["clarity_score"])))

    return judgment
