#!/usr/bin/env python3
"""
extract_sentences.py

Reads Mozilla Common Voice validated.tsv, extracts the 'sentence' column,
drops empty rows, and writes one sentence per line to output/yoruba_sentences.txt.

Run from project root:
    python processing/extract_sentences.py

Expects: dataset/validated.tsv
Creates: output/yoruba_sentences.txt
"""

import os
import sys

# Allow running from project root or from processing/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    import pandas as pd
except ImportError:
    print("Install dependencies: pip install pandas")
    sys.exit(1)

# Paths relative to project root
DATASET_TSV = os.path.join(PROJECT_ROOT, "dataset", "validated.tsv")
SAMPLE_TSV = os.path.join(PROJECT_ROOT, "dataset", "sample_validated.tsv")
OUTPUT_TXT = os.path.join(PROJECT_ROOT, "output", "yoruba_sentences.txt")


def extract_sentences(tsv_path: str, output_path: str) -> int:
    """
    Read TSV, extract sentence column, drop empties, write one sentence per line.
    Returns number of sentences written.
    """
    if not os.path.isfile(tsv_path):
        if os.path.isfile(SAMPLE_TSV):
            tsv_path = SAMPLE_TSV
            print("Using sample dataset. For full data, download Mozilla Common Voice Yoruba and put validated.tsv in dataset/.")
        else:
            raise FileNotFoundError(
                f"Dataset not found: {tsv_path}. Place validated.tsv in dataset/, or keep sample_validated.tsv for a quick test."
            )

    df = pd.read_csv(tsv_path, sep="\t", encoding="utf-8")
    if "sentence" not in df.columns:
        raise ValueError(f"Expected 'sentence' column in {tsv_path}. Columns: {list(df.columns)}")

    # Drop rows where sentence is missing or empty
    sentences = df["sentence"].astype(str).str.strip()
    sentences = sentences[sentences.str.len() > 0]
    sentences = sentences.drop_duplicates()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for line in sentences:
            f.write(line + "\n")

    return len(sentences)


def main():
    print("Extracting sentences from validated.tsv...")
    count = extract_sentences(DATASET_TSV, OUTPUT_TXT)
    print(f"Wrote {count} sentences to {OUTPUT_TXT}")


if __name__ == "__main__":
    main()
