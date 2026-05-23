"""
AfroLingo AI Speech Service — FastAPI app for transcription, pronunciation scoring, and TTS.

Endpoints:
  - POST /transcribe          — Upload audio, get recognized text (Whisper).
  - POST /score-pronunciation — Upload audio + expected sentence, get score 0–1 and feedback.
  - POST /generate-audio      — Send JSON {"text": "..."}, get generated audio file.
  - POST /practice-round      — Transcribe + pronunciation score + fixed learning-loop message.
  - POST /roleplay-session    — Yoruba-only roleplay turn (OpenAI JSON).

Run from project root (ai_speech_service/):
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.routes import transcribe as transcribe_router
from api.routes import pronunciation as pronunciation_router
from api.routes import practice_round as practice_round_router
from api.routes import roleplay_session as roleplay_session_router
from api.routes import tts as tts_router

# Configure logging: level INFO, log request processing time and key results.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AfroLingo Speech Service",
    description="Pronunciation and speech pipeline for Yoruba: Whisper transcription, pronunciation scoring, Coqui TTS.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request_time(request: Request, call_next):
    """Log request processing time for every request."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    logger.info("Request %s %s completed in %.2fs", request.method, request.url.path, elapsed)
    return response


# Mount route modules under the paths expected by the MERN app.
app.include_router(transcribe_router.router)
app.include_router(pronunciation_router.router)
app.include_router(practice_round_router.router)
app.include_router(roleplay_session_router.router)
app.include_router(tts_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai_speech_service"}
