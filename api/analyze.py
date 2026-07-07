"""
POST /api/analyze — Main pronunciation analysis endpoint.

Accepts multipart/form-data with:
  - audio: audio file (required)
  - mode: "scripted" | "free_speech" (required)
  - reference_text: string (required if mode=scripted)
  - client_duration: float (optional, for cross-check)

Returns JSON with score, annotated transcript, and per-word feedback.
"""

from flask import Flask, request, jsonify
import traceback

# Import pipeline services
from api._lib.transcription import transcribe_audio
from api._lib.alignment import align_words
from api._lib.judgment import get_pronunciation_judgment
from api._lib.scoring import compute_score

app = Flask(__name__)

# Constants
MIN_DURATION = 30.0
MAX_DURATION = 45.0
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB (Groq free tier limit)
ALLOWED_EXTENSIONS = {"mp3", "wav", "webm", "m4a", "ogg", "flac", "mp4", "mpeg"}


@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        # ---- 1. Validate request ----
        if "audio" not in request.files:
            return _error("No audio file provided.", 400)

        audio_file = request.files["audio"]
        mode = request.form.get("mode", "").strip()
        reference_text = request.form.get("reference_text", "").strip()
        client_duration = request.form.get("client_duration")

        if mode not in ("scripted", "free_speech"):
            return _error(
                'Invalid mode. Must be "scripted" or "free_speech".', 400
            )

        if mode == "scripted" and not reference_text:
            return _error(
                "Reference text is required for scripted mode.", 400
            )

        # Validate file extension
        filename = audio_file.filename or "audio.webm"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return _error(
                f"Unsupported audio format '.{ext}'. "
                f"Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
                400,
            )

        # Read audio bytes
        audio_bytes = audio_file.read()
        if not audio_bytes:
            return _error("Audio file is empty.", 400)

        if len(audio_bytes) > MAX_FILE_SIZE:
            return _error(
                f"Audio file is too large ({len(audio_bytes) // (1024*1024)}MB). "
                f"Maximum size is 25MB.",
                413,
            )

        # Client-side duration pre-check (advisory, not authoritative)
        if client_duration:
            try:
                cd = float(client_duration)
                if cd < MIN_DURATION - 1 or cd > MAX_DURATION + 1:
                    return _error(
                        f"Audio duration ({cd:.1f}s) is outside the "
                        f"required {MIN_DURATION:.0f}–{MAX_DURATION:.0f} second range.",
                        422,
                    )
            except ValueError:
                pass  # Ignore malformed client_duration

        # ---- 2. Transcribe via Groq Whisper ----
        try:
            transcription = transcribe_audio(audio_bytes, filename)
        except ValueError as e:
            return _error(str(e), 422)
        except Exception as e:
            return _error(f"Transcription failed: {str(e)}", 502)

        # Server-side duration validation (authoritative — from Groq)
        duration = transcription["duration"]
        if duration < MIN_DURATION - 2:  # 2s tolerance for codec differences
            return _error(
                f"Audio is too short ({duration:.1f}s). "
                f"Minimum duration is {MIN_DURATION:.0f} seconds.",
                422,
            )
        if duration > MAX_DURATION + 2:
            return _error(
                f"Audio is too long ({duration:.1f}s). "
                f"Maximum duration is {MAX_DURATION:.0f} seconds.",
                422,
            )

        transcript_text = transcription["text"]
        words_with_ts = transcription["words"]

        # ---- 3. Align (scripted mode only) ----
        alignment_data = None
        if mode == "scripted" and reference_text:
            try:
                alignment_data = align_words(reference_text, transcript_text)
            except Exception as e:
                # Non-fatal: proceed without alignment
                alignment_data = {"wer": 0.5, "word_count": 0, "alignments": []}

        # ---- 4. LLM Judgment ----
        try:
            judgment = get_pronunciation_judgment(
                transcript=transcript_text,
                words_with_timestamps=words_with_ts,
                mode=mode,
                reference_text=reference_text if mode == "scripted" else None,
                alignment_data=alignment_data,
            )
        except ValueError as e:
            return _error(str(e), 502)
        except Exception as e:
            return _error(f"Feedback generation failed: {str(e)}", 502)

        # ---- 5. Compute score ----
        score_data = compute_score(mode, alignment_data, judgment)

        # ---- 6. Merge word data (timestamps + judgment) ----
        final_words = _merge_word_data(words_with_ts, judgment.get("words", []))

        # ---- 7. Build response ----
        response = {
            "score": score_data["score"],
            "transcript": transcript_text,
            "words": final_words,
            "fluency_comment": judgment.get("fluency_comment", ""),
            "mode": mode,
            "word_accuracy_pct": score_data.get("word_accuracy_pct"),
            "fluency_score": score_data["fluency_score"],
            "clarity_score": score_data["clarity_score"],
            "duration_seconds": round(duration, 1),
            "breakdown": score_data.get("breakdown", {}),
        }

        return jsonify(response), 200

    except Exception as e:
        traceback.print_exc()
        return _error(
            "An unexpected error occurred during analysis. Please try again.",
            500,
        )


def _merge_word_data(
    timestamped_words: list[dict], judgment_words: list[dict]
) -> list[dict]:
    """Merge timestamp data with LLM judgment data."""
    merged = []

    # Use judgment words as primary (they have status + feedback)
    for i, jw in enumerate(judgment_words):
        word_entry = {
            "word": jw.get("word", ""),
            "status": jw.get("status", "correct"),
            "feedback": jw.get("feedback"),
            "start": None,
            "end": None,
        }

        # Try to match with timestamped word by index
        if i < len(timestamped_words):
            tw = timestamped_words[i]
            word_entry["start"] = tw.get("start")
            word_entry["end"] = tw.get("end")
            # Use the timestamped word text if judgment word is empty
            if not word_entry["word"]:
                word_entry["word"] = tw.get("word", "")

        merged.append(word_entry)

    # If there are more timestamped words than judgment words, add them
    if len(timestamped_words) > len(judgment_words):
        for tw in timestamped_words[len(judgment_words):]:
            merged.append(
                {
                    "word": tw.get("word", ""),
                    "status": "correct",
                    "feedback": None,
                    "start": tw.get("start"),
                    "end": tw.get("end"),
                }
            )

    return merged


def _error(message: str, status_code: int):
    """Return a JSON error response."""
    return jsonify({"error": message}), status_code
