from typing import Literal
from pydantic import BaseModel, Field


class ClaimExtractionRequest(BaseModel):
    answer: str = Field(
        ...,
        min_length=10,
        max_length=12000,
        description="LLM-generated answer to verify"
    )


class Claim(BaseModel):
    claim: str
    category: Literal[
        "pricing",
        "software_release",
        "regulation",
        "company",
        "technology",
        "general",
        "other"
    ]
    temporal_sensitivity: Literal[
        "high",
        "medium",
        "low"
    ]
    reason: str
    search_query: str


class ClaimExtractionResponse(BaseModel):
    total_claims: int
    claims: list[Claim]