"""
Text-to-speech service using Coqui TTS.

Coqui TTS turns text into spoken audio. We load a model once and reuse it.
The default model is English (LJSpeech); for Yoruba you can switch to a
multilingual model (e.g. your_tts) when available. Generated files are
saved under output/generated_audio/ so the API can return them.

Usage:
    from api.services.tts_service import generate_audio
    path = generate_audio("Ẹ káàrọ̀")
    # Returns path to generated .wav file.
"""

import logging
import os
import time
import uuid

logger = logging.getLogger(__name__)

# Output directory for generated audio (relative to project root).
# Set AI_SPEECH_OUTPUT_DIR or use default.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GENERATED_AUDIO_DIR = os.environ.get(
    "AI_SPEECH_GENERATED_AUDIO_DIR",
    os.path.join(PROJECT_ROOT, "output", "generated_audio"),
)

# Model: default is English; for Yoruba, use a multilingual model when available.
# Example: "tts_models/multilingual/multi-dataset/your_tts"
TTS_MODEL_NAME = os.environ.get("TTS_MODEL", "tts_models/en/ljspeech/tacotron2-DDC")

_tts_model = None
_tts_unavailable_reason = None  # Set if TTS package is not installed (e.g. Python 3.12)


def _get_tts():
    """Load Coqui TTS model once and cache it. Returns None if TTS is not installed."""
    global _tts_model, _tts_unavailable_reason
    if _tts_unavailable_reason is not None:
        return None
    if _tts_model is not None:
        return _tts_model
    try:
        from TTS.api import TTS
        logger.info("Loading Coqui TTS model '%s' (first use)...", TTS_MODEL_NAME)
        _tts_model = TTS(model_name=TTS_MODEL_NAME, progress_bar=False, gpu=False)
        logger.info("Coqui TTS model loaded.")
        return _tts_model
    except ImportError as e:
        _tts_unavailable_reason = (
            "Coqui TTS is not installed (it requires Python 3.9–3.11). "
            "Use a venv with Python 3.10 or 3.11 and: pip install TTS>=0.22.0"
        )
        logger.warning("%s", _tts_unavailable_reason)
        return None
    except Exception as e:
        logger.exception("Failed to load Coqui TTS model: %s", e)
        raise


def get_tts_unavailable_reason() -> str | None:
    """If TTS is not available (e.g. not installed on Python 3.12), return the reason; else None."""
    _get_tts()  # Ensure we've tried to load so _tts_unavailable_reason may be set
    return _tts_unavailable_reason


def generate_audio(text: str) -> str:
    """
    Generate speech audio for the given text and return the path to the saved file.

    Args:
        text: Text to speak (e.g. Yoruba sentence).

    Returns:
        Absolute path to the generated .wav file.
        Raises or returns empty string on failure (caller can check).
    """
    if not text or not text.strip():
        logger.warning("TTS called with empty text.")
        return ""

    os.makedirs(GENERATED_AUDIO_DIR, exist_ok=True)
    filename = f"tts_{uuid.uuid4().hex[:12]}.wav"
    file_path = os.path.join(GENERATED_AUDIO_DIR, filename)

    try:
        tts = _get_tts()
        if tts is None:
            logger.warning("TTS skipped: %s", _tts_unavailable_reason)
            return ""
        tts.tts_to_file(text=text.strip(), file_path=file_path)
        logger.info("Generated TTS audio: %s", file_path)
        return file_path
    except Exception as e:
        logger.exception("TTS generation failed: %s", e)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        return ""
