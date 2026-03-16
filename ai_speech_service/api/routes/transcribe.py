"""
Transcribe route: POST /transcribe

Accepts an audio file, runs Whisper transcription, and returns the recognized text.
Used by the MERN app when the user records themselves speaking.
"""

import logging
import os
import time
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, UploadFile, HTTPException

from api.services.transcription_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transcribe", tags=["transcription"])


@router.post("", response_model=dict)
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe uploaded audio to text using Whisper.

    Request: multipart/form-data with an "audio" file (e.g. .mp3, .wav).
    Response: {"transcription": "recognized text"}
    """
    start = time.perf_counter()
    tmp_path = None
    suffix = os.path.splitext(audio.filename or "")[1] or ".mp3"
    if not suffix.startswith("."):
        suffix = "." + suffix

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        result = transcribe_audio(tmp_path)
        elapsed = time.perf_counter() - start
        logger.info("Transcribe request completed in %.2fs, result length=%d", elapsed, len(result.get("transcription", "")))

        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return {"transcription": result["transcription"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Transcribe failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
