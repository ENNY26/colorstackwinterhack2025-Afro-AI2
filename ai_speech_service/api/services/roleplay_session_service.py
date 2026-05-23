"""
Yoruba roleplay turn generator (OpenAI Chat Completions).

Design:
    - One system prompt locks the assistant to Èdè Yorùbá only: no English,
      no glosses, no translations in the reply body.
    - Scenario + level are injected so tone and complexity match the setting.
    - The model returns JSON so we can split NPC line, optional correction,
      and a short “what to say next” nudge — all in Yoruba.

Requires:
    OPENAI_API_KEY in the environment (same as other stacks using OpenAI).
    Optional: OPENAI_ROLEPLAY_MODEL (default: gpt-4o-mini).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Short Yoruba scene hints (optional flavor). Unknown scenarios still work via raw string.
SCENARIO_CONTEXT: Dict[str, str] = {
    "restaurant": "O ń bá a sọ̀rọ̀ ní ibi tí a ń jẹun (bíbẹ̀, oúnjẹ).",
    "greeting": "Ìbáwísí àti ìkíni láàrin ẹnìkan.",
    "market": "Ọjà — rí à, tà à, sọ̀rọ̀ nípa owó àti ẹ̀yà.",
    "shopping": "Ríra nǹkan — owó, iye, àyípadà.",
    "travel": "Ìrìn àjò — ìbéèrè ọ̀nà, ọkọ̀, àkókò.",
}

# Difficulty: steer length and vocabulary (still 100% Yoruba output).
LEVEL_INSTRUCTIONS: Dict[str, str] = {
    "beginner": (
        "Ìpele àkọ́kọ́: má ṣe lo gbólóhùn gígùn. "
        "Lo ọ̀rọ̀ díẹ̀, sọ̀rọ̀ kúkúrú, yọrí sí àwọn tí ó rọrùn."
    ),
    "intermediate": (
        "Ìpele àárín: sọ̀rọ̀ bí ẹni tí ó ń bá ọmọ ilẹ̀ Yorùbá sọ̀rọ̀ lójoojúmọ́. "
        "Gbólóhùn àádáni, díẹ̀ díẹ̀."
    ),
    "advanced": (
        "Ìpele òkè: o le lo àṣà àti ọ̀rọ̀ tí ó le, sọ̀rọ̀ dáadáa bí ẹni tí ó mọ̀ nípa àṣà àti ètò èdè."
    ),
}


def _build_system_prompt(scenario: str, level: str) -> str:
    """
    Static instructions + dynamic scenario/level.

    The model is told explicitly: JSON values must be Yoruba only so the app
    can show corrections and next steps without English leakage.
    """
    scenario_key = scenario.strip().lower()
    scene_note = SCENARIO_CONTEXT.get(scenario_key, f"Àyè àsìkò: {scenario.strip()}.")
    level_note = LEVEL_INSTRUCTIONS.get(
        level.strip().lower(),
        LEVEL_INSTRUCTIONS["intermediate"],
    )

    return f"""Ìwọ jẹ́ olùrànlọ́wọ́ fún ẹni tí ó ń kọ́ Èdè Yorùbá nípa sọ̀rọ̀ ní àyíwò àgbáyé gidi.

ÌDÁJÚ PÁPÁ:
- Dáhùn ní Èdè Yorùbá NÍKÁN. Má ṣe lo Gẹ̀ẹ́sì rárá (kò sí ìtumọ̀, kò sí àsọ̀yé ní Gẹ̀ẹ́sì).
- Má ṣe fi Gẹ̀ẹ́sì sí inú JSON náà.

ÀYÈ ÀTI ÌPELE:
- {scene_note}
- {level_note}

ÌṣÀMÚNÁNÚ:
- "ai_response": èsì NPC ní Yorùbá kíkún fún ọ̀rọ̀ tí olùkọ́ sọ (kúkúrú, oníwò).
- "correction": tó bá ṣeé ṣe pé àṣìṣe wà nínú ọ̀rọ̀ olùkọ́, kọ ṣíṣe díẹ̀ ní Yorùbá; bí kò bá sí àṣìṣe, fi null síbẹ̀.
- "next_prompt": ìbéèrè tàbí àkíyèsí kúkúrú ní Yorùbá tí ó ń sọ fún olùkọ́ ohun tí ó lè sọ lẹ́yìn náà.

Ó ṣe pàtàkì pé àwọn náà máa dínkù, kí ó máa rí bí sọ̀rọ̀ lójoojúmọ́."""


def _user_message(user_input: str) -> str:
    return (
        "Olùkọ́ sọ̀rọ̀ yìí (fún ọ láti dáhùn sí i):\n"
        f"{user_input.strip()}\n\n"
        "Dápadà pẹ̀lú JSON nìkan — àwọn kíí: ai_response, correction (null tàbí ọ̀rọ̀), "
        "next_prompt. Gbogbo àwọn náà ní Yorùbá (correction le jẹ́ null)."
    )


def generate_roleplay_turn(
    user_input: str,
    scenario: str,
    level: str,
) -> Dict[str, Any]:
    """
    Call OpenAI and return a dict with ai_response, correction, next_prompt.

    Raises:
        RuntimeError: missing key or API failure.
        ValueError: invalid JSON from model.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or api_key.startswith("your-"):
        raise RuntimeError("OPENAI_API_KEY is not set or is a placeholder.")

    try:
        from openai import OpenAI
    except ImportError as e:
        raise RuntimeError(
            "The 'openai' package is required. Install with: pip install openai"
        ) from e

    model = os.environ.get("OPENAI_ROLEPLAY_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    system_prompt = _build_system_prompt(scenario, level)
    user_msg = _user_message(user_input)

    # JSON mode reduces parsing errors; content must still be Yoruba per system prompt.
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.65,
        max_tokens=600,
    )

    raw = completion.choices[0].message.content
    if not raw:
        raise RuntimeError("Empty response from OpenAI.")

    data = json.loads(raw)

    ai_response = (data.get("ai_response") or "").strip()
    next_prompt = (data.get("next_prompt") or "").strip()
    correction_raw = data.get("correction")

    correction: Optional[str]
    if correction_raw is None or correction_raw == "":
        correction = None
    else:
        correction = str(correction_raw).strip() or None

    if not ai_response or not next_prompt:
        logger.warning("roleplay JSON missing fields: %s", raw[:500])
        raise ValueError("Model response missing ai_response or next_prompt.")

    return {
        "ai_response": ai_response,
        "correction": correction,
        "next_prompt": next_prompt,
    }
