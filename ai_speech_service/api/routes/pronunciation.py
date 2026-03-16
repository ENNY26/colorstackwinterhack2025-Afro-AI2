"""
Pronunciation route: POST /score-pronunciation

Accepts an audio file and the expected sentence. Transcribes the audio with
Whisper, then compares the result to the expected text and returns a score 0–100.
"""

import logging
import os
import time
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from api.services.transcription_service import transcribe_audio
from api.services.pronunciation_service import score_pronunciation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/score-pronunciation", tags=["pronunciation"])


@router.post("", response_model=dict)
async def score_pronunciation_endpoint(
    expected: str = Form(..., description="The sentence the user was supposed to say"),
    audio: UploadFile = File(...),
):
    """
    Score user pronunciation: transcribe audio, then compare to expected text.

    Request: multipart/form-data with "expected" (text) and "audio" (file).
    Response: {"expected": "...", "spoken": "...", "score": 0-100}
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

        trans_result = transcribe_audio(tmp_path)
        spoken_text = trans_result.get("transcription") or ""
        if trans_result.get("error"):
            logger.warning("Transcription error in score-pronunciation: %s", trans_result["error"])

        score_result = score_pronunciation(expected, spoken_text)
        score = score_result["score"]
        elapsed = time.perf_counter() - start
        logger.info("Score-pronunciation completed in %.2fs, score=%d", elapsed, score)

        return {
            "expected": expected,
            "spoken": spoken_text,
            "score": score,
        }
    except Exception as e:
        logger.exception("Score pronunciation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
