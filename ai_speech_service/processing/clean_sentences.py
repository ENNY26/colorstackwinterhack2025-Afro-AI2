#!/usr/bin/env python3
"""
clean_sentences.py

Cleans and normalizes Yoruba sentences from output/yoruba_sentences.txt:
  - Removes duplicate sentences
  - Normalizes whitespace (collapse multiple spaces, strip)
  - Removes leading/trailing spaces
  - Preserves Yoruba tone marks (ẹ, ọ, ṣ, à, é, etc.)
  - Ensures UTF-8 encoding

Overwrites the cleaned result back to output/yoruba_sentences.txt.
Run this after extract_sentences.py.

Run from project root:
    python processing/clean_sentences.py
"""

import os
import re
import sys

# Project root: one level up from processing/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

INPUT_TXT = os.path.join(PROJECT_ROOT, "output", "yoruba_sentences.txt")
OUTPUT_TXT = os.path.join(PROJECT_ROOT, "output", "yoruba_sentences.txt")


def normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces/newlines to a single space, strip leading/trailing."""
    if not isinstance(text, str):
        text = str(text)
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_sentences(input_path: str, output_path: str) -> tuple[int, int]:
    """
    Read one sentence per line, normalize whitespace, remove duplicates, write UTF-8.
    Yoruba diacritics (tone marks) are preserved; we do not alter Unicode normalization.
    Returns (count_before, count_after).
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(
            f"Input not found: {input_path}. Run extract_sentences.py first."
        )

    with open(input_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    count_before = 0
    seen = set()
    cleaned = []

    for raw in lines:
        line = normalize_whitespace(raw)
        if not line:
            continue
        count_before += 1
        if line in seen:
            continue
        seen.add(line)
        cleaned.append(line)

    count_after = len(cleaned)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for line in cleaned:
            f.write(line + "\n")

    return count_before, count_after


def main():
    print("Cleaning sentences...")
    count_before, count_after = clean_sentences(INPUT_TXT, OUTPUT_TXT)
    duplicates_removed = count_before - count_after
    if duplicates_removed > 0:
        print(f"Removed duplicates: {duplicates_removed}")
    print(f"Sentences before cleaning: {count_before}")
    print(f"Final sentence count: {count_after}")
    print(f"Wrote cleaned sentences to {OUTPUT_TXT}")


if __name__ == "__main__":
    main()
