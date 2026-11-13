# VeriSync AI — Backend

The backend service powering VeriSync AI, an AI-powered answer verification platform that extracts factual claims, retrieves live web evidence, evaluates claim accuracy, and identifies potentially outdated information.

Built using Python and FastAPI, with Gemini accessed through Bifrost and Tavily for live web search.

## Overview

The VeriSync AI backend processes AI-generated answers through a multi-stage verification pipeline.

1. Receives an AI-generated answer from the frontend.
2. Uses Gemini through Bifrost to extract individual factual claims.
3. Retrieves relevant web evidence using Tavily.
4. Evaluates each claim against the retrieved evidence.
5. Assigns a verification verdict and freshness classification.
6. Returns structured results to the frontend.

## Features

- **Automatic Claim Extraction:** Identifies individual factual claims from AI-generated responses.
- **AI-Powered Evaluation:** Uses Gemini 2.5 Flash through Bifrost to assess claims.
- **Live Web Search:** Retrieves supporting information using Tavily.
- **Claim-Level Verification:** Classifies claims as supported, contradicted, mixed, or insufficient evidence.
- **Freshness Analysis:** Identifies whether information is current, potentially outdated, outdated, not time-sensitive, or uncertain.
- **Evidence Retrieval:** Provides source titles, URLs, content, relevance scores, and publication dates when available.
- **Error Handling:** Handles API failures and transient AI service errors with retry logic.
- **REST API:** Provides endpoints for frontend integration and testing.

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| FastAPI | REST API framework |
| Gemini 2.5 Flash | Claim extraction and evidence evaluation |
| Bifrost | AI gateway and model access |
| Tavily | Live web search |
| Pydantic | Request and response validation |
| Uvicorn | ASGI server |
| Python-dotenv | Environment configuration |

## Architecture

```text
             FRONTEND
                 |
                 v
          FastAPI Backend
                 |
                 v
          Claim Extraction
                 |
          Bifrost + Gemini
                 |
                 v
          Extracted Claims
                 |
                 v
           Tavily Search
                 |
                 v
           Web Evidence
                 |
                 v
        Evidence Evaluation
                 |
          Bifrost + Gemini
                 |
                 v
       Verdict + Freshness
                 |
                 v
        Structured Response
                 |
                 v
              FRONTEND
```

## Project Structure

```text
backend/
├── app/
│   ├── services/
│   │   ├── bifrost_service.py
│   │   ├── claim_service.py
│   │   ├── tavily_service.py
│   │   └── verification_service.py
│   ├── config.py
│   ├── schemas.py
│   └── main.py
├── .env
├── requirements.txt
└── README.md
```

*The structure above describes the main application components; additional project files may also be present.*

## Getting Started

### Prerequisites

- Python 3.10 or later
- pip
- Node.js for running the frontend separately
- Bifrost configured with a Gemini provider
- Tavily API key

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/VeriSync-AI.git
```

### 2. Navigate to Backend

```bash
cd VeriSync-AI/backend
```

### 3. Create a Virtual Environment

**Windows PowerShell:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
TAVILY_API_KEY=your_tavily_api_key

BIFROST_BASE_URL=http://localhost:8080
BIFROST_MODEL=gemini-2.5-flash
BIFROST_API_KEY=your_bifrost_virtual_key

BACKEND_PORT=8000
FRONTEND_ORIGIN=http://localhost:3000
```

**Important:** Never commit your actual `.env` file or expose API keys publicly.

### 6. Start Bifrost

Start your Bifrost gateway and ensure that the Gemini provider and virtual key are configured correctly.

The default local dashboard is:

http://localhost:8080

### 7. Run the Backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:

http://127.0.0.1:8000

## API Documentation

FastAPI automatically generates interactive API documentation.

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome information |
| GET | `/health` | Health check |
| POST | `/api/verify` | Verify an AI-generated answer |
| POST | `/api/extract-claims` | Extract factual claims |
| GET/POST | `/api/test-ai` | AI integration test |
| GET/POST | `/api/test-search` | Web search integration test |

*Refer to the live Swagger documentation for the exact request methods and schemas supported by your running backend.*

## Verification Request

**Endpoint:** `POST /api/verify`

Example request:

```json
{
  "answer": "Python 3.12 was released in October 2023."
}
```

The backend extracts the factual claim, retrieves web evidence, and evaluates its accuracy.

## Verification Results

Each verified claim can include:

- Original claim
- Claim category
- Temporal sensitivity
- Verification verdict
- Freshness classification
- Explanation
- Supporting web sources
- Source relevance score
- Publication date, when available
- Search error information, when applicable

### Supported Verdicts

| Verdict | Meaning |
|---|---|
| `supported` | Evidence supports the claim |
| `contradicted` | Evidence contradicts the claim |
| `mixed` | Evidence provides conflicting information |
| `insufficient_evidence` | Available evidence is insufficient |

### Freshness Classifications

| Status | Meaning |
|---|---|
| `current` | Information appears current |
| `potentially_outdated` | Information may have changed |
| `outdated` | Information is no longer current |
| `not_time_sensitive` | Stable information |
| `uncertain` | Freshness cannot be determined confidently |

## Integration with Frontend

The backend communicates with the Next.js frontend running at:

http://localhost:3000

CORS is configured using the frontend origin specified in the environment configuration.

## Error Handling

The backend includes handling for transient AI service errors, including rate limits and temporary service unavailability.

Retry logic helps improve reliability when external AI services experience temporary failures.

## Part of VeriSync AI

The backend powers the VeriSync AI platform alongside its Next.js frontend.

**VeriSync AI — Verify Facts. Track Freshness. Build Trust.**
