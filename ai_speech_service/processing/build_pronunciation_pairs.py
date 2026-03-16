#!/usr/bin/env python3
"""
build_pronunciation_pairs.py

Reads dataset/validated.tsv and builds a CSV of (audio_path, sentence) pairs.
Each row has:
  - audio_path: path like dataset/clips/common_voice_yo_12345.mp3
  - sentence: the Yoruba text for that clip

Used later for pronunciation scoring and TTS alignment. Empty sentences are removed.

Run from project root:
    python processing/build_pronunciation_pairs.py
"""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    import pandas as pd
except ImportError:
    print("Install dependencies: pip install pandas")
    sys.exit(1)

DATASET_TSV = os.path.join(PROJECT_ROOT, "dataset", "validated.tsv")
SAMPLE_TSV = os.path.join(PROJECT_ROOT, "dataset", "sample_validated.tsv")
OUTPUT_CSV = os.path.join(PROJECT_ROOT, "output", "pronunciation_pairs.csv")


def build_pairs(tsv_path: str, output_path: str) -> int:
    """
    Read TSV, extract path and sentence, build audio_path (dataset/clips/...),
    drop empty sentences, save CSV with header: audio_path,sentence
    """
    if not os.path.isfile(tsv_path):
        if os.path.isfile(SAMPLE_TSV):
            tsv_path = SAMPLE_TSV
            print("Using sample dataset. For full data, put validated.tsv in dataset/.")
        else:
            raise FileNotFoundError(
                f"Dataset not found: {tsv_path}. Place validated.tsv in dataset/, or keep sample_validated.tsv for a quick test."
            )

    print("Reading validated.tsv...")
    df = pd.read_csv(tsv_path, sep="\t", encoding="utf-8")

    for col in ("path", "sentence"):
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {tsv_path}. Columns: {list(df.columns)}")

    # Build audio_path: always dataset/clips/<filename> (use / for portability)
    def full_audio_path(row_path: str) -> str:
        name = str(row_path).strip()
        if not name:
            return ""
        if name.startswith("clips/"):
            rel = os.path.join("dataset", name)
        elif name.startswith("dataset"):
            rel = name
        else:
            rel = os.path.join("dataset", "clips", name)
        return rel.replace("\\", "/")

    df["audio_path"] = df["path"].apply(full_audio_path)
    df["sentence"] = df["sentence"].astype(str).str.strip()

    # Remove rows where sentence is empty
    before = len(df)
    df = df[df["sentence"].str.len() > 0][["audio_path", "sentence"]]
    after = len(df)
    if before > after:
        print(f"Removed {before - after} rows with empty sentences.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8")

    return len(df)


def main():
    print("Building pronunciation pairs...")
    count = build_pairs(DATASET_TSV, OUTPUT_CSV)
    print(f"Wrote {count} pairs to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
