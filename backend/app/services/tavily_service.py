import requests

from app.config import TAVILY_API_KEY


TAVILY_URL = "https://api.tavily.com/search"


def search_web(query: str, max_results: int = 5):

    if not TAVILY_API_KEY:
        raise ValueError("TAVILY_API_KEY is missing in .env")

    headers = {
        "Authorization": f"Bearer {TAVILY_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "search_depth": "advanced",
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False
    }

    try:
        response = requests.post(
            TAVILY_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        response.raise_for_status()

        data = response.json()

        return {
            "query": query,
            "results": [
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "content": item.get("content"),
                    "score": item.get("score"),
                    "published_date": item.get("published_date")
                }
                for item in data.get("results", [])
            ]
        }

    except requests.exceptions.HTTPError as error:
        raise RuntimeError(
            f"Tavily HTTP error: {response.status_code} - "
            f"{response.text[:1000]}"
        ) from error

    except requests.exceptions.RequestException as error:
        raise RuntimeError(
            f"Could not connect to Tavily: {error}"
        ) from error