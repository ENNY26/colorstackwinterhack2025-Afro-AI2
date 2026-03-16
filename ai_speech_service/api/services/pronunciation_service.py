"""
Pronunciation scoring service.

Compares what the user was supposed to say (expected_sentence) with what
we heard from speech-to-text (spoken_sentence). We normalize both strings
(whitespace, punctuation) but keep Yoruba tone marks (ẹ, ọ, ṣ, etc.) so
that accent differences are reflected in the score.

Scoring uses difflib.SequenceMatcher: it returns a ratio between 0 and 1
based on how similar two strings are. We scale that to 0–100 for a
percentage score. This is simple and beginner-friendly; later you can
replace it with a phoneme-based or acoustic model.

Usage:
    from api.services.pronunciation_service import score_pronunciation
    result = score_pronunciation("Ẹ káàrọ̀", "E kaaro")
    # {"score": 82, "expected_normalized": "...", "spoken_normalized": "..."}
"""

import logging
import re
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

# Remove common punctuation for comparison; keep letters, numbers, and Yoruba chars.
# We preserve Unicode letters (including ẹ, ọ, ṣ, à, etc.) and only strip punctuation.
PUNCTUATION_PATTERN = re.compile(r"[^\w\s]", re.UNICODE)


def _normalize(s: str) -> str:
    """Normalize whitespace and remove punctuation; preserve Yoruba tone marks."""
    if not s or not isinstance(s, str):
        return ""
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    s = PUNCTUATION_PATTERN.sub("", s)
    return s.strip().lower()


def score_pronunciation(expected_sentence: str, spoken_sentence: str) -> dict:
    """
    Compare expected vs spoken text and return a similarity score 0–100.

    Args:
        expected_sentence: What the user was supposed to say (e.g. from lesson).
        spoken_sentence: What we got from transcribing the user's audio.

    Returns:
        {
            "score": 0-100,
            "expected_normalized": normalized expected text,
            "spoken_normalized": normalized spoken text,
        }
    """
    expected_norm = _normalize(expected_sentence)
    spoken_norm = _normalize(spoken_sentence)

    if not expected_norm:
        logger.warning("Empty expected sentence; score set to 0.")
        return {
            "score": 0,
            "expected_normalized": expected_norm,
            "spoken_normalized": spoken_norm,
        }

    if not spoken_norm:
        return {
            "score": 0,
            "expected_normalized": expected_norm,
            "spoken_normalized": spoken_norm,
        }

    # SequenceMatcher.ratio() is in [0, 1]; scale to 0–100.
    matcher = SequenceMatcher(None, expected_norm, spoken_norm)
    ratio = matcher.ratio()
    score = round(ratio * 100)

    logger.info("Pronunciation score: %d (expected=%s, spoken=%s)", score, expected_norm[:50], spoken_norm[:50])
    return {
        "score": score,
        "expected_normalized": expected_norm,
        "spoken_normalized": spoken_norm,
    }
