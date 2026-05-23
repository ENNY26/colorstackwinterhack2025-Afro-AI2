"""
Pronunciation route: POST /score-pronunciation

Accepts an audio file and the expected sentence. Transcribes the audio with
Whisper, then compares the result to the expected text and returns a score
in [0, 1] plus feedback.
"""

import logging
import os
import time
from tempfile import NamedTemporaryFile
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.services.pronunciation_service import display_expected_preserve_input, score_pronunciation
from api.services.transcription_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/score-pronunciation", tags=["pronunciation"])


@router.post("", response_model=dict)
async def score_pronunciation_endpoint(
    audio: UploadFile = File(..., description="Recording of the user speaking"),
    expected_text: Optional[str] = Form(
        None,
        description="The Yoruba sentence the user was supposed to say",
    ),
    expected: Optional[str] = Form(
        None,
        description="Legacy alias for expected_text (same meaning)",
    ),
):
    """
    Score pronunciation: transcribe audio, compare to expected text.

    Request: multipart/form-data with ``audio`` (file) and ``expected_text`` (string).
    Older clients may send ``expected`` instead of ``expected_text``.

    Response::

        {
          "expected": "...",
          "transcribed": "...",
          "score": 0.82,
          "feedback": "..."
        }

    ``expected`` / ``transcribed`` are the original strings for display.
    ``score`` is similarity on tone-stripped normalized text, in [0, 1].
    """
    start = time.perf_counter()
    tmp_path = None

    reference = (expected_text if expected_text is not None else expected) or ""
    reference = str(reference).strip()
    if not reference:
        raise HTTPException(
            status_code=400,
            detail="expected_text is required and cannot be empty (or use legacy field 'expected').",
        )

    if not audio:
        raise HTTPException(status_code=400, detail="audio file is required.")

    suffix = os.path.splitext(audio.filename or "")[1] or ".mp3"
    if not suffix.startswith("."):
        suffix = "." + suffix

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")
            tmp.write(content)
            tmp_path = tmp.name

        trans_result = transcribe_audio(tmp_path)
        spoken_text = trans_result.get("transcription") or ""

        if trans_result.get("error"):
            logger.warning("Transcription error in score-pronunciation: %s", trans_result["error"])
            raise HTTPException(
                status_code=502,
                detail=f"Transcription failed: {trans_result['error']}",
            )

        score_result = score_pronunciation(reference, spoken_text)
        elapsed = time.perf_counter() - start
        logger.info(
            "Score-pronunciation completed in %.2fs, score=%.3f",
            elapsed,
            score_result["score"],
        )

        return {
            "expected": display_expected_preserve_input(reference),
            "transcribed": spoken_text,
            "score": round(float(score_result["score"]), 2),
            "feedback": score_result["feedback"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Score pronunciation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
