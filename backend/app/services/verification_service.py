
import json
import re

from app.services.claim_service import extract_claims
from app.services.tavily_service import search_web
from app.services.bifrost_service import ask_bifrost


def verify_answer(answer: str):

    # 1. Extract claims using Gemini
    extraction = extract_claims(answer)

    if not extraction.claims:
        return {
            "success": True,
            "total_claims": 0,
            "verified_claims": []
        }

    # Limit claims to control API usage and response time
    claims = extraction.claims[:8]

    all_sources = []
    claim_evidence = []

    # 2. Search the web for each claim
    for index, claim in enumerate(claims):

        try:
            search_result = search_web(
                claim.search_query,
                max_results=5
            )

            source_indices = []

            for source in search_result.get("results", []):

                source_index = len(all_sources)

                all_sources.append({
                    "title": source.get("title"),
                    "url": source.get("url"),
                    "content": source.get("content"),
                    "relevance_score": source.get("score"),
                    "published_date": source.get("published_date")
                })

                source_indices.append(source_index)

            claim_evidence.append({
                "claim_index": index,
                "claim": claim.claim,
                "category": claim.category,
                "temporal_sensitivity": claim.temporal_sensitivity,
                "source_indices": source_indices,
                "search_error": None
            })

        except Exception as error:

            print(f"Search failed for claim {index}: {error}")

            claim_evidence.append({
                "claim_index": index,
                "claim": claim.claim,
                "category": claim.category,
                "temporal_sensitivity": claim.temporal_sensitivity,
                "source_indices": [],
                "search_error": "Web search unavailable"
            })

    # 3. Prepare evidence for Gemini
    evidence_payload = {
        "claims": claim_evidence,
        "sources": all_sources
    }

    prompt = f"""
You are the evidence evaluation engine of VeriSync AI.

Evaluate each factual claim using ONLY the supplied web evidence.

IMPORTANT RULES:
1. Never invent evidence or sources.
2. Do not treat a high search relevance score as proof.
3. Prefer official documentation and primary sources.
4. Distinguish historical facts from current information.
5. A fixed historical release date does not become outdated
   simply because a newer software version exists.
6. If evidence is insufficient, say so.
7. Do not assume a claim is false just because evidence is missing.
8. Check whether sources actually support or contradict the claim.
9. Do not confuse factual correctness with freshness.

For each claim, return:

- claim_index: Original claim index.
- verdict: supported, contradicted, mixed, insufficient_evidence.
- freshness: current, potentially_outdated, outdated,
  not_time_sensitive, uncertain.
- explanation: Brief evidence-based explanation.
- source_indices: Indices of the supplied sources used.

FRESHNESS GUIDANCE:
- current: Evidence supports a claim that remains current.
- potentially_outdated: Information may have changed, but
  available evidence does not establish that it has.
- outdated: Reliable newer evidence establishes that the
  information is no longer current.
- not_time_sensitive: Stable historical or scientific fact.
- uncertain: Evidence cannot establish freshness.

Return ONLY valid JSON in this structure:

{{
  "assessments": [
    {{
      "claim_index": 0,
      "verdict": "supported",
      "freshness": "not_time_sensitive",
      "explanation": "Official documentation confirms the claim.",
      "source_indices": [0, 1]
    }}
  ]
}}

CLAIMS AND WEB EVIDENCE:
{json.dumps(evidence_payload, ensure_ascii=False)}
"""

    # 4. Evaluate all claims in one Gemini request
    ai_response = ask_bifrost(prompt)

    cleaned = re.sub(
        r"```(?:json)?\s*|\s*```",
        "",
        ai_response.strip(),
        flags=re.IGNORECASE
    )

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("Gemini returned invalid evaluation JSON.")

    evaluation = json.loads(cleaned[start:end + 1])

    assessments = evaluation.get("assessments", [])

    # 5. Combine claims, verdicts and actual source links
    verified_claims = []

    for item in claim_evidence:

        index = item["claim_index"]

        assessment = next(
            (
                result for result in assessments
                if result.get("claim_index") == index
            ),
            None
        )

        if not assessment:
            assessment = {
                "verdict": "insufficient_evidence",
                "freshness": "uncertain",
                "explanation": "No valid assessment was returned.",
                "source_indices": []
            }

        valid_indices = [
            source_index
            for source_index in assessment.get("source_indices", [])
            if isinstance(source_index, int)
            and 0 <= source_index < len(all_sources)
            and source_index in item["source_indices"]
        ]

        verified_claims.append({
            "claim": item["claim"],
            "category": item["category"],
            "temporal_sensitivity": item["temporal_sensitivity"],
            "verdict": assessment.get(
                "verdict", "insufficient_evidence"
            ),
            "freshness": assessment.get(
                "freshness", "uncertain"
            ),
            "explanation": assessment.get(
                "explanation", "No explanation available."
            ),
            "sources": [
                all_sources[source_index]
                for source_index in valid_indices
            ],
            "search_error": item["search_error"]
        })

    return {
        "success": True,
        "total_claims": len(claims),
        "verified_claims": verified_claims
    }
