"""Word alignment service — compares transcript to reference using jiwer."""

import jiwer
from typing import Any


def align_words(reference: str, transcript: str) -> dict[str, Any]:
    """
    Align transcript words against reference text using jiwer.

    Returns:
        {
            "wer": 0.142,  # word error rate
            "word_count": 9,
            "alignments": [
                {"ref": "the", "hyp": "the", "type": "hit"},
                {"ref": "quick", "hyp": "queek", "type": "substitution"},
                {"ref": "brown", "hyp": None, "type": "deletion"},
                {"ref": None, "hyp": "uh", "type": "insertion"},
                ...
            ]
        }
    """
    ref_clean = _normalize(reference)
    hyp_clean = _normalize(transcript)

    if not ref_clean:
        return {"wer": 0.0, "word_count": 0, "alignments": []}

    # Compute WER
    wer = jiwer.wer(ref_clean, hyp_clean)

    # Get detailed word-level alignment
    output = jiwer.process_words(ref_clean, hyp_clean)

    alignments = []
    for chunk in output.alignments[0]:  # first (only) sentence pair
        if chunk.type == "equal":
            for i in range(chunk.ref_end_idx - chunk.ref_start_idx):
                ref_idx = chunk.ref_start_idx + i
                hyp_idx = chunk.hyp_start_idx + i
                alignments.append(
                    {
                        "ref": output.references[0][ref_idx],
                        "hyp": output.hypotheses[0][hyp_idx],
                        "type": "hit",
                    }
                )
        elif chunk.type == "substitute":
            for i in range(chunk.ref_end_idx - chunk.ref_start_idx):
                ref_idx = chunk.ref_start_idx + i
                hyp_idx = chunk.hyp_start_idx + i
                ref_word = output.references[0][ref_idx]
                hyp_word = (
                    output.hypotheses[0][hyp_idx]
                    if hyp_idx < len(output.hypotheses[0])
                    else None
                )
                alignments.append(
                    {
                        "ref": ref_word,
                        "hyp": hyp_word,
                        "type": "substitution",
                    }
                )
        elif chunk.type == "delete":
            for i in range(chunk.ref_end_idx - chunk.ref_start_idx):
                ref_idx = chunk.ref_start_idx + i
                alignments.append(
                    {
                        "ref": output.references[0][ref_idx],
                        "hyp": None,
                        "type": "deletion",
                    }
                )
        elif chunk.type == "insert":
            for i in range(chunk.hyp_end_idx - chunk.hyp_start_idx):
                hyp_idx = chunk.hyp_start_idx + i
                alignments.append(
                    {
                        "ref": None,
                        "hyp": output.hypotheses[0][hyp_idx],
                        "type": "insertion",
                    }
                )

    ref_words = ref_clean.split()
    return {
        "wer": round(wer, 4),
        "word_count": len(ref_words),
        "alignments": alignments,
    }


def _normalize(text: str) -> str:
    """Lowercase and strip punctuation for fair comparison."""
    text = text.lower().strip()
    # Remove common punctuation
    for ch in ".,;:!?\"'()-":
        text = text.replace(ch, "")
    # Collapse whitespace
    return " ".join(text.split())
