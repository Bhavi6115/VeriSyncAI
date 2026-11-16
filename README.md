# VeriSync AI
### Intelligent Stale-Answer Detection & Real-Time Claim Verification

VeriSync AI is an AI-powered verification platform designed to detect outdated, inaccurate, or potentially misleading information in AI-generated responses.

It extracts factual claims, searches for supporting evidence from live web sources, evaluates claim accuracy and freshness, and provides detailed source intelligence to help users understand whether information can still be trusted.

Built for the **Global AI Hackathon 2026**, under the theme of AI Agents & Intelligent Systems.

---

## Overview

AI-generated answers can sound convincing even when their information is outdated or inaccurate. VeriSync AI addresses this challenge through an intelligent verification pipeline that evaluates individual factual claims instead of treating an entire response as one statement.

Users can submit an AI-generated answer and receive claim-level verification results, relevant web evidence, freshness assessments, and detailed source evaluations.

## Key Features

### 1. Intelligent Claim Extraction
- Extracts individual factual claims from AI-generated responses.
- Categorizes claims based on their subject.
- Identifies temporal sensitivity to prioritize information that may become outdated.

### 2. Real-Time Evidence Retrieval
- Uses Tavily for live web search.
- Retrieves relevant sources and supporting content.
- Collects publication-date information when available.

### 3. Claim Verification
Each extracted claim is evaluated and assigned a verdict:

- Supported
- Contradicted
- Mixed
- Insufficient Evidence

### 4. Freshness Detection
Evaluates whether information is:
- Current
- Potentially Outdated
- Outdated
- Not Time-Sensitive
- Uncertain

### 5. Source Intelligence
Provides detailed source-level analysis, including:
- Source authority and trustworthiness assessment.
- Source relevance to the verified claim.
- Supporting or contradicting evidence stance.
- Publication and update-date information when available.
- Source limitations.
- Cross-source agreement and disagreement analysis.

### 6. Verification History
- Stores previous verification results.
- Allows users to revisit earlier reports.
- Maintains access to previously analyzed claims and evidence.

### 7. Re-Verify & Compare
- Re-verifies previously analyzed responses.
- Compares previous and latest verification results.
- Highlights verdict changes and newly detected claims.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React.js, TypeScript |
| Styling | CSS, Tailwind CSS |
| Backend | Python, FastAPI |
| AI Model | Gemini 2.5 Flash |
| AI Gateway | Bifrost by Maxim AI |
| Web Search | Tavily API |
| Database | SQLite |
| API Communication | REST APIs |

## System Architecture

```text
       User
        |
        v
  Next.js Frontend
        |
        v
   FastAPI Backend
        |
        v
  Claim Extraction
        |
        v
  Bifrost + Gemini
        |
        v
  Individual Claims
        |
        v
    Tavily Search
        |
        v
   Live Web Evidence
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
 SQLite Verification History
        |
        v
   Results Dashboard
```

## Project Structure

```text
VeriSync-AI/
│
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── bifrost_service.py
│   │   │   ├── tavily_service.py
│   │   │   ├── claim_service.py
│   │   │   ├── freshness_service.py
│   │   │   ├── verification_service.py
│   │   │   └── source_intelligence_service.py
│   │   │
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── schemas.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   │
│   │   └── components/
│   │       ├── SourceCard.tsx
│   │       ├── EvidenceAgreement.tsx
│   │       ├── SourceIntelligence.tsx
│   │       └── SourceIntelligence.css
│   │
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js and npm
- A Tavily API key
- A configured Bifrost gateway and Gemini model access

### 1. Clone the Repository

```bash
git clone https://github.com/Bhavi6115/VeriSyncAI.git
cd VeriSyncAI
```

### 2. Set Up the Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend directory and configure the required Tavily and Bifrost credentials and settings according to `app/config.py`.

### 3. Start the Backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 4. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

### 5. Start the Frontend

```bash
npm run dev
```

Frontend:

`http://localhost:3000`

Ensure the frontend is configured to communicate with the running backend.

---

## How It Works

1. The user submits an AI-generated response.
2. The AI extraction service identifies individual factual claims.
3. Tavily searches the web for relevant evidence.
4. The verification service evaluates each claim against retrieved evidence.
5. Freshness analysis identifies potentially outdated information.
6. Source Intelligence evaluates the credibility, relevance, stance and agreement of retrieved sources.
7. Results are saved in verification history for future reference and comparison.

## Important Notes

- Publication and update dates depend on information available from the retrieved sources.
- Source authority and evidence assessments are AI-generated evaluations, not guarantees of truth.
- VeriSync AI supports informed verification and should not be treated as an infallible source of factual certainty.

## Security

Never commit API keys, `.env` files, virtual environments, or other sensitive configuration files.

## Project

**VeriSync AI — Making AI-generated information easier to verify, evaluate, and trust.**
