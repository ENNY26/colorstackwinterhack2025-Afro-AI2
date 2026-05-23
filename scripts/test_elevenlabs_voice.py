#!/usr/bin/env python3
"""
Generate the same Yoruba phrase with three ElevenLabs voice_setting presets
so you can compare cloned-voice quality side by side.

Usage (from repo root):
  pip install requests python-dotenv
  python scripts/test_elevenlabs_voice.py

Requires server/.env with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID
(or ELEVENLABS_YORUBA_VOICE_ID).

Outputs: output/generated_audio/tests/<preset>.mp3
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

# Windows consoles often default to cp1252; keep Yoruba text in API payloads.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "server" / ".env")

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
TEST_PHRASE = "Ẹ kú àárọ̀, báwo ni o ṣe wà?"
OUTPUT_DIR = ROOT / "output" / "generated_audio" / "tests"

PRESETS = {
    "natural_fast": {
        "stability": 0.45,
        "similarity_boost": 0.75,
        "style": 0.0,
        "speed": 1.08,
        "use_speaker_boost": True,
    },
    "stable_clear": {
        "stability": 0.65,
        "similarity_boost": 0.70,
        "style": 0.0,
        "speed": 1.05,
        "use_speaker_boost": True,
    },
    "less_clone_artifacts": {
        "stability": 0.40,
        "similarity_boost": 0.60,
        "style": 0.0,
        "speed": 1.10,
        "use_speaker_boost": False,
    },
}


def resolve_voice_id() -> str:
    voice_id = os.getenv("ELEVENLABS_YORUBA_VOICE_ID") or os.getenv("ELEVENLABS_VOICE_ID")
    if not voice_id or "your-" in voice_id:
        print(
            "Error: set ELEVENLABS_VOICE_ID or ELEVENLABS_YORUBA_VOICE_ID in server/.env",
            file=sys.stderr,
        )
        sys.exit(1)
    return voice_id


def generate_preset(
    api_key: str,
    voice_id: str,
    preset_name: str,
    voice_settings: dict,
    model_id: str,
) -> Path:
    url = f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}"
    payload = {
        "text": TEST_PHRASE,
        "model_id": model_id,
        "voice_settings": voice_settings,
    }

    print(f"[{preset_name}] voice_settings={voice_settings}")
    print(f"[{preset_name}] text_length={len(TEST_PHRASE)} (Yoruba phrase with tone marks)")

    response = requests.post(
        url,
        json=payload,
        headers={
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key,
        },
        timeout=120,
    )

    if not response.ok:
        detail = response.text
        print(f"[{preset_name}] API error {response.status_code}: {detail}", file=sys.stderr)
        response.raise_for_status()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"{preset_name}.mp3"
    out_path.write_bytes(response.content)
    print(f"[{preset_name}] saved -> {out_path}")
    return out_path


def main() -> None:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key or "your-" in api_key:
        print("Error: set ELEVENLABS_API_KEY in server/.env", file=sys.stderr)
        sys.exit(1)

    voice_id = resolve_voice_id()
    model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")

    print(f"Voice ID: {voice_id}")
    print(f"Model: {model_id}")
    print(f"Output directory: {OUTPUT_DIR}\n")

    saved = []
    for name, settings in PRESETS.items():
        try:
            path = generate_preset(api_key, voice_id, name, settings, model_id)
            saved.append(path)
        except requests.HTTPError:
            continue
        print()

    if not saved:
        print("No files were generated. Check API key, voice ID, and quota.", file=sys.stderr)
        sys.exit(1)

    print("Done. Compare these files:")
    for path in saved:
        print(f"  - {path}")


if __name__ == "__main__":
    main()
