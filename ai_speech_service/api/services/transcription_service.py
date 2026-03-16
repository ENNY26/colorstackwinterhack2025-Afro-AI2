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

logger = logging.getLogger(__name__)

# Model is loaded once and reused (lazy load on first use)
_whisper_model = None

# Default: "base" is a good tradeoff between speed and accuracy.
# Options: "tiny", "base", "small", "medium", "large", "large-v2", "large-v3"
WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")


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
        result = model.transcribe(file_path, fp16=False, language=None)
        text = (result.get("text") or "").strip()
        logger.info("Transcription result: %s", text[:100] + "..." if len(text) > 100 else text)
        return {"transcription": text}
    except Exception as e:
        logger.exception("Transcription failed: %s", e)
        return {"transcription": "", "error": str(e)}
