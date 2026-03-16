# AfroLingo AI Speech Service

Python dataset processing pipeline for Yoruba (Mozilla Common Voice) and a minimal FastAPI service for future speech/pronunciation features.

## Setup

**Run all commands from the `ai_speech_service` folder** (not the AfroLingo repo root), so that `requirements.txt` and `python processing/...` work.

1. Put Mozilla Common Voice Yoruba data under `dataset/`:
   - `dataset/validated.tsv`
   - `dataset/clips/` (MP3 files)

2. Create a virtualenv and install deps:

   ```bash
   cd ai_speech_service
   python -m venv venv
   venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

   If you are in the repo root (`AfroLingo`), run `cd ai_speech_service` first; otherwise `pip install -r requirements.txt` will fail with "No such file or directory".

## Processing (run from project root: `ai_speech_service/`)

Recommended order:

```bash
python processing/extract_sentences.py
python processing/clean_sentences.py
python processing/build_pronunciation_pairs.py
python processing/build_lesson_phrases.py
```

- **extract_sentences.py** — Reads `dataset/validated.tsv`, writes `output/yoruba_sentences.txt`.
- **clean_sentences.py** — Normalizes and deduplicates sentences in `output/yoruba_sentences.txt`.
- **build_pronunciation_pairs.py** — Builds `output/pronunciation_pairs.csv` (audio_path, sentence).
- **build_lesson_phrases.py** — Builds `output/lesson_phrases.json` from cleaned sentences.

## API (AI speech layer)

Run from project root (`ai_speech_service/`):

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. |
| POST | `/transcribe` | Upload audio file → returns `{"transcription": "..."}` (Whisper). |
| POST | `/score-pronunciation` | Form: `expected` (text) + `audio` (file) → returns `{expected, spoken, score}` (0–100). |
| POST | `/generate-audio` | JSON `{"text": "Ẹ káàrọ̀"}` → returns generated WAV file (Coqui TTS). |

**Project layout:**

- `api/main.py` — App entry, CORS, request-time logging.
- `api/routes/` — `transcribe.py`, `pronunciation.py`, `tts.py`.
- `api/services/` — `transcription_service.py` (Whisper), `pronunciation_service.py` (difflib), `tts_service.py` (Coqui TTS).

Optional env: `WHISPER_MODEL` (default `base`), `TTS_MODEL` (default LJSpeech), `AI_SPEECH_GENERATED_AUDIO_DIR`.

**Note (TTS and Python 3.12):** Coqui TTS supports Python 3.9–3.11 only. On Python 3.12, `pip install -r requirements.txt` works (TTS is not installed), but `pip install TTS` will fail with "No matching distribution found". Use the app without TTS (transcribe and score-pronunciation work; `POST /generate-audio` returns 503), or use a separate virtualenv with Python 3.10 or 3.11 and run `pip install TTS>=0.22.0` there to enable TTS.

## Config

- `config/phonetic_rules.json` — Yoruba grapheme-to-phonetic hints for TTS/pronunciation.

## Outputs

| File | Description |
|------|-------------|
| `output/yoruba_sentences.txt` | One Yoruba sentence per line (cleaned). |
| `output/pronunciation_pairs.csv` | `audio_path,sentence` for reference audio. |
| `output/lesson_phrases.json` | Phrases list for lessons/exercises. |
