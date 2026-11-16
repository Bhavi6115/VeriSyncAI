
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGIN
from app.schemas import (
    ClaimExtractionRequest,
    ClaimExtractionResponse,
)

from app.database import (
    init_db,
    save_verification,
    get_all_verifications,
    get_verification_by_id,
    delete_verification,
    clear_verification_history,
)

from app.services.bifrost_service import ask_bifrost
from app.services.claim_service import extract_claims
from app.services.tavily_service import search_web
from app.services.verification_service import verify_answer
from app.services.source_intelligence_service import analyze_sources


# ------------------------------------------
# DATABASE INITIALIZATION
# ------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("VeriSync AI database initialized successfully!")
    yield


# ------------------------------------------
# FASTAPI APPLICATION
# ------------------------------------------

app = FastAPI(
    title="VeriSync AI API",
    description="AI-powered answer freshness verification system",
    version="1.0.0",
    lifespan=lifespan,
)


# ------------------------------------------
# CORS CONFIGURATION
# ------------------------------------------

allowed_origins = [
    FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://169.254.113.180:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------
# SOURCE INTELLIGENCE INTEGRATION
# ------------------------------------------

def attach_source_intelligence(result: dict) -> dict:
    """
    Adds Source Intelligence analysis to every verified claim.

    Existing verification verdicts and freshness results
    are preserved without modification.
    """

    verified_claims = result.get("verified_claims", [])

    if not isinstance(verified_claims, list):
        return result

    analyzed_count = 0
    claims_with_sources = 0

    for index, claim_result in enumerate(verified_claims, start=1):

        if not isinstance(claim_result, dict):
            continue

        claim_text = claim_result.get("claim", "")
        sources = claim_result.get("sources", [])

        if isinstance(sources, list) and sources:
            claims_with_sources += 1

        try:
            intelligence = analyze_sources(
                claim=claim_text,
                sources=sources,
            )

            claim_result["source_intelligence"] = intelligence

            if intelligence.get("analysis_status") == "completed":
                analyzed_count += 1

        except Exception as error:
            print(
                f"Source Intelligence error for claim {index}: {error}"
            )

            claim_result["source_intelligence"] = {
                "analysis_status": "unavailable",
                "claim": claim_text,
                "sources": [],
                "cross_source_summary": {
                    "total_sources": 0,
                    "supporting_sources": 0,
                    "contradicting_sources": 0,
                    "mixed_sources": 0,
                    "mentioning_sources": 0,
                    "insufficient_evidence_sources": 0,
                    "distinct_domains": 0,
                    "supporting_domains": 0,
                    "contradicting_domains": 0,
                    "agreement_status": "inconclusive",
                    "cross_domain_support": False,
                },
                "summary": (
                    "Source Intelligence could not be completed. "
                    "The original verification results are preserved."
                ),
            }

    result["source_intelligence_summary"] = {
        "total_claims": len(verified_claims),
        "claims_with_sources": claims_with_sources,
        "claims_analyzed": analyzed_count,
    }

    return result


# ------------------------------------------
# HOME
# ------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to VeriSync AI",
        "status": "running",
        "version": "1.0.0",
    }


# ------------------------------------------
# HEALTH CHECK
# ------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "VeriSync AI",
    }


# ------------------------------------------
# TEST BIFROST + GEMINI
# ------------------------------------------

@app.get("/api/test-ai")
def test_ai():
    try:
        result = ask_bifrost(
            "Reply with exactly: Gemini connection successful!"
        )

        return {
            "success": True,
            "provider": "Bifrost",
            "model": "gemini-2.5-flash",
            "response": result,
        }

    except Exception as error:
        print(f"AI connection error: {error}")

        raise HTTPException(
            status_code=502,
            detail="AI provider connection failed. Check backend logs.",
        )


# ------------------------------------------
# TEST TAVILY SEARCH
# ------------------------------------------

@app.get("/api/test-search")
def test_search(
    query: str = Query(
        default="Python 3.12 release date",
        min_length=3,
        max_length=400,
    )
):
    try:
        result = search_web(query)

        return {
            "success": True,
            "provider": "Tavily",
            "total_results": len(result["results"]),
            "data": result,
        }

    except Exception as error:
        print(f"Tavily search error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Tavily search failed. Check backend logs.",
        )


# ------------------------------------------
# EXTRACT FACTUAL CLAIMS
# ------------------------------------------

@app.post(
    "/api/extract-claims",
    response_model=ClaimExtractionResponse,
)
def extract_answer_claims(request: ClaimExtractionRequest):
    try:
        return extract_claims(request.answer)

    except Exception as error:
        print(f"Claim extraction error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Claim extraction failed. Check backend logs.",
        )


# ------------------------------------------
# VERIFY ANSWER + SOURCE INTELLIGENCE
# ------------------------------------------

@app.post("/api/verify")
def verify_generated_answer(request: ClaimExtractionRequest):
    try:
        # Step 1: Run existing VeriSync verification.
        result = verify_answer(request.answer)

        # Step 2: Enrich verified claims with Source Intelligence.
        result = attach_source_intelligence(result)

        # Step 3: Save the complete enriched result to SQLite.
        saved_record = save_verification(
            answer=request.answer,
            result=result,
        )

        return {
            **result,
            "history_id": saved_record["id"],
            "created_at": saved_record["created_at"],
        }

    except Exception as error:
        print(f"Verification error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Verification failed. Check backend logs.",
        )


# ------------------------------------------
# GET ALL VERIFICATION HISTORY
# ------------------------------------------

@app.get("/api/history")
def get_history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        records = get_all_verifications(
            limit=limit,
            offset=offset,
        )

        return {
            "success": True,
            "total": len(records),
            "history": records,
        }

    except Exception as error:
        print(f"History retrieval error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not load verification history.",
        )


# ------------------------------------------
# GET SINGLE VERIFICATION
# ------------------------------------------

@app.get("/api/history/{record_id}")
def get_history_item(record_id: int):
    try:
        record = get_verification_by_id(record_id)

        if record is None:
            raise HTTPException(
                status_code=404,
                detail="Verification record not found.",
            )

        return {
            "success": True,
            "record": record,
        }

    except HTTPException:
        raise

    except Exception as error:
        print(f"Record retrieval error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not retrieve verification record.",
        )


# ------------------------------------------
# DELETE SINGLE VERIFICATION
# ------------------------------------------

@app.delete("/api/history/{record_id}")
def delete_history_item(record_id: int):
    try:
        deleted = delete_verification(record_id)

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Verification record not found.",
            )

        return {
            "success": True,
            "message": "Verification deleted successfully.",
        }

    except HTTPException:
        raise

    except Exception as error:
        print(f"Delete error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not delete verification.",
        )


# ------------------------------------------
# CLEAR COMPLETE VERIFICATION HISTORY
# ------------------------------------------

@app.delete("/api/history")
def clear_history():
    try:
        clear_verification_history()

        return {
            "success": True,
            "message": "Verification history cleared successfully.",
        }

    except Exception as error:
        print(f"Clear history error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Could not clear verification history.",
        )


print("VeriSync AI API configuration loaded.")
