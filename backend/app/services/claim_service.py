import json
import re

from app.services.bifrost_service import ask_bifrost
from app.schemas import ClaimExtractionResponse


def extract_claims(answer: str) -> ClaimExtractionResponse:

    prompt = f"""
You are the claim extraction engine of VeriSync AI.

Your task is to identify independently verifiable factual claims
from the supplied answer.

RULES:
1. Extract only factual claims that can be checked using evidence.
2. Split compound statements into separate claims where appropriate.
3. Preserve the original meaning of every claim.
4. Do not invent facts or add information.
5. Ignore greetings, opinions, and purely subjective statements.
6. Identify the category of each claim.
7. Estimate how quickly the claim can become outdated.

CATEGORY OPTIONS:
- pricing
- software_release
- regulation
- company
- technology
- general
- other

TEMPORAL SENSITIVITY:
- high: Prices, current versions, availability, live statistics.
- medium: Company information, technology updates, policies.
- low: Historical facts and stable general knowledge.

For every claim, provide:
- claim: Exact factual statement.
- category: One category from the options.
- temporal_sensitivity: high, medium, or low.
- reason: Brief explanation of the sensitivity.
- search_query: A concise web search query to verify it.

Return ONLY valid JSON in this exact structure:

{{
  "total_claims": 2,
  "claims": [
    {{
      "claim": "Example factual statement.",
      "category": "general",
      "temporal_sensitivity": "low",
      "reason": "This is a relatively stable historical fact.",
      "search_query": "Verify example factual statement"
    }}
  ]
}}

If there are no verifiable factual claims, return:
{{"total_claims": 0, "claims": []}}

ANSWER TO ANALYZE:
{answer}
"""

    response = ask_bifrost(prompt)

    # Remove Markdown code fences if Gemini includes them.
    cleaned_response = re.sub(
        r"```(?:json)?\s*|\s*```",
        "",
        response.strip(),
        flags=re.IGNORECASE
    )

    # Extract the JSON object.
    start = cleaned_response.find("{")
    end = cleaned_response.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("Gemini did not return valid JSON.")

    json_text = cleaned_response[start:end + 1]

    try:
        parsed_data = json.loads(json_text)
    except json.JSONDecodeError as error:
        raise ValueError("Could not parse Gemini's JSON response.") from error

    result = ClaimExtractionResponse.parse_obj(parsed_data)

    # Ensure the total matches the actual extracted claims.
    result.total_claims = len(result.claims)

    return result