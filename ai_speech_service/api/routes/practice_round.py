"""
Practice round: POST /practice-round

One learning-loop endpoint: transcribe → score pronunciation → return fixed
encouragement text for the client to show or speak (TTS elsewhere).

Flow:
    1. Save uploaded audio to a temp file.
    2. ``transcribe_audio`` — Whisper text (reuse transcription_service).
    3. ``score_pronunciation`` — similarity 0–1 + label (reuse pronunciation_service).
    4. Map score → short ``ai_response`` string (no LLM; simple rules).
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
router = APIRouter(prefix="/practice-round", tags=["practice"])


def _ai_response_for_score(score: float) -> str:
    """
    Turn numeric similarity into a fixed English line for the learning loop.

    Thresholds align with pronunciation_service feedback bands.
    """
    if score > 0.85:
        return "Excellent! Let's move forward."
    if score >= 0.6:
        return "Good job! Try repeating it once more."
    return "Let's try again. Listen carefully and repeat."


@router.post("", response_model=dict)
async def practice_round(
    audio: UploadFile = File(..., description="Learner recording"),
    expected_text: Optional[str] = Form(
        None,
        description="Target Yoruba sentence",
    ),
    expected: Optional[str] = Form(
        None,
        description="Legacy alias for expected_text",
    ),
    mode: Optional[str] = Form(
        None,
        description='Optional context: "roleplay" or "tutor" (for clients; does not change scoring yet)',
    ),
):
    """
    Full practice round: transcribe, score, return display fields + ``ai_response``.

    Form fields: ``audio``, ``expected_text`` (or ``expected``), optional ``mode``.
    """
    start = time.perf_counter()
    tmp_path = None

    if mode is not None and str(mode).strip() and str(mode).strip().lower() not in (
        "roleplay",
        "tutor",
    ):
        raise HTTPException(
            status_code=400,
            detail='mode must be "roleplay", "tutor", or omitted.',
        )

    reference = (expected_text if expected_text is not None else expected) or ""
    reference = str(reference).strip()
    if not reference:
        raise HTTPException(
            status_code=400,
            detail="expected_text is required (or legacy field 'expected').",
        )

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

        # 1) Speech → text
        trans_result = transcribe_audio(tmp_path)
        spoken_text = trans_result.get("transcription") or ""

        if trans_result.get("error"):
            logger.warning("practice-round transcription failed: %s", trans_result["error"])
            raise HTTPException(
                status_code=502,
                detail=f"Transcription failed: {trans_result['error']}",
            )

        # 2) Compare to reference (tone-stripped similarity inside pronunciation_service)
        score_result = score_pronunciation(reference, spoken_text)
        score = float(score_result["score"])
        feedback = score_result["feedback"]

        # 3) Fixed “AI” line for the learning loop
        ai_response = _ai_response_for_score(score)

        elapsed = time.perf_counter() - start
        logger.info(
            "practice-round done in %.2fs score=%.3f mode=%s",
            elapsed,
            score,
            mode or "default",
        )

        return {
            "expected": display_expected_preserve_input(reference),
            "transcribed": spoken_text,
            "score": round(score, 2),
            "feedback": feedback,
            "ai_response": ai_response,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("practice-round failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
