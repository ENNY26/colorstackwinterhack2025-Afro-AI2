"""
Transcription service using OpenAI Whisper.

Whisper is a neural ASR (automatic speech recognition) model that turns
audio into text. It supports many languages, including Yoruba. We load
the model once at startup so repeated transcriptions are fast.

Usage:
    from api.services.transcription_service import transcribe_audio
    result = transcribe_audio("/path/to/audio.mp3")
    # {"transcription": "Ẹ káàrọ̀"}
"""

import logging
import os
import unicodedata
from difflib import get_close_matches

logger = logging.getLogger(__name__)

# Model is loaded once and reused (lazy load on first use)
_whisper_model = None

# Default: "base" is a good tradeoff between speed and accuracy.
# Options: "tiny", "base", "small", "medium", "large", "large-v2", "large-v3"
WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")

# Optional override for language, e.g. "yo" for Yoruba.
WHISPER_LANGUAGE = os.environ.get("WHISPER_LANGUAGE")


def _get_model():
    """Load Whisper model once and cache it."""
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            logger.info("Loading Whisper model '%s' (first use)...", WHISPER_MODEL_NAME)
            _whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
            logger.info("Whisper model loaded.")
        except Exception as e:
            logger.exception("Failed to load Whisper model: %s", e)
            raise
    return _whisper_model


def transcribe_audio(file_path: str) -> dict:
    """
    Transcribe an audio file to text using Whisper.

    Args:
        file_path: Path to the audio file (e.g. .mp3, .wav).

    Returns:
        {"transcription": "recognized text"} or {"transcription": "", "error": "..."} on failure.
    """
    if not file_path or not os.path.isfile(file_path):
        return {"transcription": "", "error": f"File not found: {file_path}"}

    try:
        model = _get_model()

        def _clean_text(s: str) -> str:
            if not s:
                return ""
            # NFC so composed diacritics stay valid for Yoruba and other scripts.
            s = unicodedata.normalize("NFC", s).strip()
            # Do NOT strip to ASCII — that removed Japanese/Kana garbage and also
            # wiped valid text when Whisper mis-detected language. Keep all letters/
            # marks/numbers/punctuation; drop only non-printing control chars.
            out = []
            for ch in s:
                cat = unicodedata.category(ch)
                if cat[0] == "C" and ch not in "\t\n\r":
                    continue
                out.append(ch)
            return "".join(out).strip()

        yoruba_vocab = [
            "oba",
            "obasanjo",
            "sanjo",
            "meta",
            "okan",
            "ojo",
            "eni",
            "ati",
            "ni",
            "fun",
            "gba",
            "wa",
            "lo",
            "mo",
            "re",
        ]

        def correct_word(word: str) -> str:
            matches = get_close_matches(word, yoruba_vocab, n=1, cutoff=0.6)
            return matches[0] if matches else word

        def _truncate(s: str, max_len: int = 200) -> str:
            return s if len(s) <= max_len else s[:max_len] + "..."

        # Single Whisper pass:
        #  - default: auto language detection
        #  - optional override via WHISPER_LANGUAGE (e.g. "yo")
        # Prefer explicit WHISPER_LANGUAGE (e.g. yo for Yoruba) to reduce wrong-script hallucinations.
        lang = WHISPER_LANGUAGE or None
        result = model.transcribe(file_path, fp16=False, language=lang, temperature=0)
        raw_text = (result.get("text") or "")
        cleaned_text = _clean_text(raw_text)
        words = cleaned_text.split()
        corrected_words = [correct_word(w) for w in words]
        final_text = " ".join(corrected_words)

        logger.info("Whisper raw transcription: %s", _truncate(raw_text))
        logger.info("Whisper cleaned transcription: %s", _truncate(cleaned_text))
        logger.info("Whisper phonetic-corrected transcription: %s", _truncate(final_text))

        if not final_text:
            # Optional: helpful message when we failed to get any text.
            return {
                "transcription": "",
                "error": "Transcription is empty. Please ensure the audio is clear and try again.",
            }

        return {"transcription": final_text}
    except Exception as e:
        logger.exception("Transcription failed: %s", e)
        return {"transcription": "", "error": str(e)}
