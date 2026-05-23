"""
Roleplay session: POST /roleplay-session

JSON body drives one turn of a Yoruba-only scenario conversation via OpenAI.
Transcription is handled elsewhere; this endpoint expects text (user_input).
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.services.roleplay_session_service import generate_roleplay_turn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roleplay-session", tags=["roleplay"])


class RoleplaySessionRequest(BaseModel):
    """One turn of roleplay: what the learner said + scene + difficulty."""

    user_input: str = Field(..., min_length=1, description="Learner's line (Yoruba or mixed; model responds in Yoruba)")
    scenario: str = Field(
        ...,
        min_length=1,
        description='Scene id or label, e.g. "restaurant", "greeting", "market"',
    )
    level: str = Field(
        ...,
        description='One of: "beginner", "intermediate", "advanced"',
    )


class RoleplaySessionResponse(BaseModel):
    ai_response: str
    correction: Optional[str] = None
    next_prompt: str


_LEVELS = frozenset({"beginner", "intermediate", "advanced"})


@router.post("", response_model=RoleplaySessionResponse)
def roleplay_session(body: RoleplaySessionRequest) -> RoleplaySessionResponse:
    """
    Simulate one NPC turn in Yoruba: reply, optional correction, next prompt.

    All three string fields from the model are intended to be **Yoruba only**
    (enforced in the system prompt in ``roleplay_session_service``).
    """
    level_norm = body.level.strip().lower()
    if level_norm not in _LEVELS:
        raise HTTPException(
            status_code=400,
            detail='level must be one of: "beginner", "intermediate", "advanced".',
        )

    try:
        result = generate_roleplay_turn(
            user_input=body.user_input,
            scenario=body.scenario,
            level=level_norm,
        )
        return RoleplaySessionResponse(**result)
    except ValueError as e:
        logger.warning("roleplay parse error: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e
    except RuntimeError as e:
        logger.warning("roleplay runtime: %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("roleplay-session failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
