"""
Pronunciation scoring service.

Compares the reference sentence with Whisper’s transcription using a simple
string similarity (SequenceMatcher). To avoid over-penalizing learners when
Whisper omits tone marks or uses different Unicode for the same sounds, we
**strip tone marks with unicodedata** and compare those normalized strings.

Why SequenceMatcher?
    Standard library, good for short phrases: ratio in [0, 1] from matching
    subsequences. Not acoustic scoring — just “how close does the text look?”.

Display vs scoring:
    The API returns the **original** expected line and raw transcription for
    the UI. Scoring uses **tone-stripped, lowercased** forms only.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Precomposed Yoruba letters (underdot etc.) → plain Latin base before NFD.
# Whisper often outputs e/o/s without dots; mapping avoids false mismatches.
_YORUBA_PRECOMPOSED_TO_BASE = str.maketrans(
    {
        "Ẹ": "e",
        "ẹ": "e",
        "Ọ": "o",
        "ọ": "o",
        "Ṣ": "s",
        "ṣ": "s",
    }
)


def remove_yoruba_tone_marks(text: str) -> str:
    """
    Normalize Yoruba (and similar Latin) text for pronunciation comparison by
    removing tone / diacritic marks using unicodedata.

    Steps:
        1. NFC — stable composed characters.
        2. Lowercase, trim, collapse whitespace (fair word boundaries).
        3. Map ẹ/ọ/ṣ-style letters to e/o/s so dotted letters match plain ones.
        4. NFD — split base letters from combining marks (accents, tones).
        5. Drop all characters with category Mn (nonspacing marks).
        6. NFC again for a stable string.

    This keeps the underlying letters and word order; tones no longer affect score.
    """
    if not text or not isinstance(text, str):
        return ""

    text = unicodedata.normalize("NFC", text).strip().lower()
    text = re.sub(r"\s+", " ", text)
    text = text.translate(_YORUBA_PRECOMPOSED_TO_BASE)

    decomposed = unicodedata.normalize("NFD", text)
    without_marks = "".join(
        ch for ch in decomposed if unicodedata.category(ch) != "Mn"
    )
    return unicodedata.normalize("NFC", without_marks).strip()


def feedback_for_score(score: float) -> str:
    """
    Map primary similarity (0–1) to a short label.

    Because the score already ignores tones, the middle band means “decent
    textual match” — we still use the copy you asked for for that band.
    """
    if score > 0.85:
        return "Excellent"
    if score >= 0.6:
        return "Good but tones may be missing"
    return "Needs improvement"


def score_pronunciation(expected: str, transcribed: str) -> Dict[str, Any]:
    """
    Compare expected vs transcribed using tone-stripped normalization only.

    Returns:
        score: float in [0, 1] (primary)
        feedback: str
    """
    exp_for_score = remove_yoruba_tone_marks(expected)
    act_for_score = remove_yoruba_tone_marks(transcribed)

    if not exp_for_score:
        return {
            "score": 0.0,
            "feedback": "Missing reference sentence.",
        }

    if not act_for_score:
        return {
            "score": 0.0,
            "feedback": "No speech recognized. Try again with clearer audio.",
        }

    # Primary score: identical logic as before, but inputs are tone-free.
    matcher = SequenceMatcher(None, exp_for_score, act_for_score)
    score = round(matcher.ratio(), 4)
    feedback = feedback_for_score(score)

    logger.info(
        "Pronunciation (tone-stripped): score=%.3f len_exp=%d len_act=%d",
        score,
        len(exp_for_score),
        len(act_for_score),
    )

    return {
        "score": score,
        "feedback": feedback,
    }


def display_expected_preserve_input(raw_expected: str) -> str:
    """NFC + trim for JSON display; keeps caller’s tone marks and casing."""
    if not raw_expected:
        return ""
    return unicodedata.normalize("NFC", raw_expected).strip()
