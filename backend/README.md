# VeriSync AI — Backend

The VeriSync AI backend is built using Python and FastAPI. It powers the platform's claim extraction, real-time evidence retrieval, factual verification, freshness assessment and source intelligence capabilities.

It integrates Bifrost by Maxim AI with Gemini 2.5 Flash for AI-powered processing and Tavily for live web search.

## Core Responsibilities

### 1. Claim Extraction
- Receives AI-generated answers from the frontend.
- Uses the AI service to identify individual factual claims.
- Classifies claims and determines temporal sensitivity.

### 2. Web Evidence Retrieval
- Integrates with Tavily Search API.
- Retrieves relevant web sources and content.
- Requests publication-date information when available.

### 3. Claim Verification
Evaluates each extracted claim using the retrieved evidence.

Possible verdicts:
- `supported`
- `contradicted`
- `mixed`
- `insufficient_evidence`

### 4. Freshness Analysis

Evaluates the temporal relevance of information.

Possible freshness statuses:
- `current`
- `potentially_outdated`
- `outdated`
- `not_time_sensitive`
- `uncertain`

### 5. Source Intelligence

Analyzes retrieved sources and provides:

- Source authority assessment.
- Source relevance assessment.
- Evidence stance.
- Evidence explanations.
- Publication and update dates when available.
- Source limitations.
- Cross-source agreement analysis.

The service also includes fallback handling when AI source analysis is unavailable.

### 6. Verification History

- Saves verification reports in SQLite.
- Retrieves previous verification records.
- Supports the frontend's history and re-verification workflows.

## Technology Stack

| Component | Technology |
|---|---|
| Backend Framework | FastAPI |
| Language | Python |
| AI Gateway | Bifrost |
| AI Model | Gemini 2.5 Flash |
| Web Search | Tavily API |
| Database | SQLite |
| Data Validation | Pydantic |
| HTTP Requests | Requests |

## Project Structure

```text
backend/
│
├── app/
│   ├── services/
│   │   ├── bifrost_service.py
│   │   ├── tavily_service.py
│   │   ├── claim_service.py
│   │   ├── freshness_service.py
│   │   ├── verification_service.py
│   │   └── source_intelligence_service.py
│   │
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   └── schemas.py
│
├── requirements.txt
├── .env
└── verisync.db
```

## Getting Started

### Prerequisites

- Python 3.10 or later
- pip
- Tavily API key
- Configured Bifrost gateway
- Gemini 2.5 Flash model access through Bifrost

### 1. Navigate to Backend

```bash
cd backend
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Activate on Linux/macOS:

```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend directory.

Add the Tavily API key and the Bifrost configuration required by `app/config.py`.

Do not commit the `.env` file or expose API credentials publicly.

### 5. Start Bifrost

Ensure the configured Bifrost gateway is running and that Gemini 2.5 Flash is accessible through it.

The local development configuration uses:

`http://localhost:8080`

### 6. Start the FastAPI Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend server:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health check |
| POST | `/api/verify` | Verify an AI-generated answer |
| GET | `/api/history` | Retrieve verification history |
| GET | `/api/history/{record_id}` | Retrieve a specific verification record |

### Example Verification Request

**POST** `/api/verify`

```json
{
  "answer": "The Eiffel Tower was completed in 1889."
}
```

The backend extracts factual claims, retrieves web evidence, evaluates the claims, performs freshness analysis and attaches Source Intelligence assessments.

The response includes verification results and, when applicable, saved history information.

## Processing Pipeline

```text
Incoming Answer
      |
      v
Claim Extraction
      |
      v
Bifrost + Gemini
      |
      v
Claim Classification
      |
      v
Tavily Web Search
      |
      v
Evidence Retrieval
      |
      v
Claim Verification
      |
      v
Freshness Analysis
      |
      v
Source Intelligence
      |
      v
SQLite Storage
      |
      v
API Response
```

## Error Handling

- Handles missing API credentials.
- Handles Tavily request failures.
- Handles transient AI gateway errors through retry logic.
- Provides fallback source assessments when AI analysis is unavailable.
- Retains source-date information only when it is actually available.

## Important Notes

- Publication dates depend on Tavily's detection of dates on retrieved pages.
- Updated dates may not be available for every source.
- Source assessments are AI-assisted and should be interpreted alongside the underlying evidence.

## Related Repository

[VeriSync AI — Main Repository](https://github.com/Bhavi6115/VeriSyncAI)

---

**VeriSync AI Backend — Powering intelligent, evidence-assisted verification.**
