#!/usr/bin/env python3
"""
build_lesson_phrases.py

Reads the cleaned sentences from output/yoruba_sentences.txt and converts
them into a JSON list saved as output/lesson_phrases.json.

The JSON is a simple array of strings, one per phrase, for use in
language-learning exercises, TTS, and pronunciation practice.
Run this after extract_sentences.py and clean_sentences.py.

Run from project root:
    python processing/build_lesson_phrases.py
"""

import json
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_TXT = os.path.join(PROJECT_ROOT, "output", "yoruba_sentences.txt")
OUTPUT_JSON = os.path.join(PROJECT_ROOT, "output", "lesson_phrases.json")


def main():
    if not os.path.isfile(INPUT_TXT):
        print(f"Run extract_sentences.py and clean_sentences.py first. Missing: {INPUT_TXT}")
        sys.exit(1)

    print("Reading cleaned sentences...")
    with open(INPUT_TXT, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f if ln.strip()]

    # Output is a JSON list of strings: ["Ẹ káàrọ̀", "Báwo ni", ...]
    phrases = lines

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(phrases, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(phrases)} phrases to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
