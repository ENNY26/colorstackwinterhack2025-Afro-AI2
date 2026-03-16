"""
TTS route: POST /generate-audio

Accepts JSON with "text" and returns the generated audio file (e.g. for
playback in the MERN app when the user wants to hear a phrase).
"""

import logging
import os
import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from api.services.tts_service import generate_audio, get_tts_unavailable_reason

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate-audio", tags=["tts"])


class GenerateAudioBody(BaseModel):
    text: str = ""


@router.post("")
async def generate_audio_endpoint(body: GenerateAudioBody):
    """
    Generate speech audio for the given text and return the audio file.

    Request body: {"text": "Ẹ káàrọ̀"}
    Response: audio/wav file.
    """
    start = time.perf_counter()
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing or empty 'text' in request body.")

    file_path = generate_audio(text)
    if not file_path or not os.path.isfile(file_path):
        reason = get_tts_unavailable_reason()
        if reason:
            raise HTTPException(status_code=503, detail=reason)
        raise HTTPException(status_code=500, detail="TTS failed to generate audio.")

    elapsed = time.perf_counter() - start
    logger.info("Generate-audio completed in %.2fs for text length=%d", elapsed, len(text))

    return FileResponse(
        file_path,
        media_type="audio/wav",
        filename=os.path.basename(file_path),
    )
