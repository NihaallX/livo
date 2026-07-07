"""Scoring service — computes composite pronunciation score."""

from typing import Any


def compute_score(
    mode: str,
    alignment_data: dict | None,
    judgment: dict[str, Any],
) -> dict[str, Any]:
    """
    Compute a composite pronunciation score (0-100).

    Scripted mode: 60% word accuracy + 25% fluency + 15% clarity
    Free speech:   60% fluency + 40% clarity (no word accuracy available)
    """
    fluency = judgment.get("fluency_score", 50)
    clarity = judgment.get("clarity_score", 50)

    if mode == "scripted" and alignment_data:
        wer = alignment_data.get("wer", 0.0)
        word_accuracy_pct = max(0, (1.0 - wer)) * 100

        score = (
            word_accuracy_pct * 0.60
            + fluency * 0.25
            + clarity * 0.15
        )

        return {
            "score": round(max(0, min(100, score))),
            "word_accuracy_pct": round(word_accuracy_pct, 1),
            "fluency_score": fluency,
            "clarity_score": clarity,
            "breakdown": {
                "word_accuracy": {"value": round(word_accuracy_pct, 1), "weight": 0.60},
                "fluency": {"value": fluency, "weight": 0.25},
                "clarity": {"value": clarity, "weight": 0.15},
            },
        }
    else:
        # Free speech — no reference to compare against
        score = fluency * 0.60 + clarity * 0.40

        return {
            "score": round(max(0, min(100, score))),
            "word_accuracy_pct": None,
            "fluency_score": fluency,
            "clarity_score": clarity,
            "breakdown": {
                "fluency": {"value": fluency, "weight": 0.60},
                "clarity": {"value": clarity, "weight": 0.40},
            },
        }
