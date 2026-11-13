import random
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

from app.config import BIFROST_BASE_URL, BIFROST_MODEL, BIFROST_API_KEY


RETRYABLE_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3
REQUEST_TIMEOUT = 90


def _retry_delay(response, attempt: int) -> float:
    """Use Retry-After when supplied; otherwise use short exponential backoff."""
    retry_after = response.headers.get("Retry-After") if response is not None else None

    if retry_after:
        try:
            return min(max(float(retry_after), 1.0), 20.0)
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(retry_after)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                seconds = (retry_at - datetime.now(timezone.utc)).total_seconds()
                return min(max(seconds, 1.0), 20.0)
            except (TypeError, ValueError, OverflowError):
                pass

    # attempt 1 -> about 2 seconds; attempt 2 -> about 4 seconds.
    return min((2 ** attempt) + random.uniform(0.0, 0.5), 12.0)


def ask_bifrost(prompt: str) -> str:
    if not BIFROST_API_KEY:
        raise ValueError("BIFROST_API_KEY is missing")

    url = f"{BIFROST_BASE_URL.rstrip('/')}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "x-bf-vk": BIFROST_API_KEY,
    }
    payload = {
        "model": BIFROST_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "stream": False,
    }

    last_error = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = None

        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=REQUEST_TIMEOUT,
            )

            if response.status_code in RETRYABLE_STATUS_CODES:
                error_detail = response.text[:1000]
                last_error = RuntimeError(
                    f"Bifrost HTTP Error: {response.status_code} - {error_detail}"
                )

                if attempt < MAX_ATTEMPTS:
                    delay = _retry_delay(response, attempt)
                    print(
                        f"Bifrost returned HTTP {response.status_code}. "
                        f"Retrying attempt {attempt + 1}/{MAX_ATTEMPTS} "
                        f"in {delay:.1f}s..."
                    )
                    time.sleep(delay)
                    continue

                raise last_error

            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("Bifrost returned an empty model response")

            return content

        except requests.exceptions.HTTPError as error:
            status_code = response.status_code if response is not None else "unknown"
            detail = response.text[:1000] if response is not None else str(error)
            raise RuntimeError(
                f"Bifrost HTTP Error: {status_code} - {detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            last_error = RuntimeError(f"Could not connect to Bifrost: {error}")

            if attempt < MAX_ATTEMPTS:
                delay = min((2 ** attempt) + random.uniform(0.0, 0.5), 12.0)
                print(
                    f"Bifrost connection failed. Retrying attempt "
                    f"{attempt + 1}/{MAX_ATTEMPTS} in {delay:.1f}s..."
                )
                time.sleep(delay)
                continue

            raise last_error from error

        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise RuntimeError(
                "Unexpected or invalid response received from Bifrost"
            ) from error

    raise last_error or RuntimeError("Bifrost request failed after retries")
