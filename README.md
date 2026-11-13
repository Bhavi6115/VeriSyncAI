# VeriSync AI

### Verify Facts. Track Freshness. Build Trust.

**VeriSync AI** is an AI-powered answer verification and freshness monitoring platform designed to evaluate the reliability of AI-generated responses.

It transforms AI-generated answers into individual factual claims, verifies them against live web evidence, identifies potentially outdated information, and provides detailed verification reports with supporting sources.

Instead of simply trusting an AI-generated answer, VeriSync helps users understand **what is accurate, what is questionable, and what may have changed over time.**

---

## Overview

AI-generated responses can contain inaccurate, misleading, or outdated information. VeriSync AI addresses this challenge through an automated, multi-stage verification workflow.

Users can submit an AI-generated answer and receive a detailed analysis of its factual claims, including individual verdicts, explanations, evidence sources, and information freshness.

The platform also allows users to revisit previous verifications and re-verify answers to understand how their reliability changes over time.

## Key Features

### 1. AI-Powered Claim Extraction
Automatically breaks down AI-generated responses into individual factual claims using Gemini 2.5 Flash.

### 2. Live Web Evidence Retrieval
Uses Tavily to retrieve relevant web information and supporting sources for individual claims.

### 3. Claim-Level Verification
Evaluates individual claims and classifies them into:

- **Supported** – Evidence supports the claim.
- **Contradicted** – Evidence contradicts the claim.
- **Mixed** – Evidence contains conflicting information.
- **Insufficient Evidence** – Available evidence is not sufficient to reach a conclusion.

### 4. Information Freshness Detection
Identifies the temporal sensitivity of information and classifies its freshness:

- Current
- Potentially Outdated
- Outdated
- Not Time-Sensitive
- Uncertain

### 5. Evidence-Based Explanations
Provides explanations alongside supporting evidence, source links, relevance scores, and publication dates when available.

### 6. Verification History
Maintains previously completed verification reports so users can revisit their results.

### 7. Re-Verify & Compare
Re-evaluates previously submitted answers and compares the latest results with earlier verification reports.

Users can inspect:

- Previous and latest verification scores.
- Claims whose verdicts have changed.
- Newly detected factual claims.
- Updated evidence and sources.
- Differences between verification runs.

This helps users understand how the reliability of information evolves over time.

---

## How It Works

```text
       AI-GENERATED ANSWER
                |
                v
        CLAIM EXTRACTION
        Gemini via Bifrost
                |
                v
        INDIVIDUAL CLAIMS
                |
                v
        LIVE WEB SEARCH
             Tavily
                |
                v
         WEB EVIDENCE
                |
                v
       EVIDENCE EVALUATION
        Gemini via Bifrost
                |
                v
      VERDICT + FRESHNESS
                |
                v
       VERIFICATION REPORT
                |
                v
       HISTORY & COMPARISON
```

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React.js | User interface |
| TypeScript | Type-safe frontend development |
| Tailwind CSS | Styling |
| Python | Backend development |
| FastAPI | REST API |
| Gemini 2.5 Flash | Claim extraction and evidence evaluation |
| Bifrost by Maxim AI | AI gateway and model integration |
| Tavily | Live web search and evidence retrieval |
| Uvicorn | Backend server |

---

## Project Structure

```text
VeriSync-AI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   └── app/
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── app/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── schemas.py
│   │   └── main.py
│   ├── requirements.txt
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- Python 3.10 or later
- Git
- Bifrost with a configured Gemini provider
- Tavily API key

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/VeriSync-AI.git
cd VeriSync-AI
```

### 2. Set Up the Backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend directory:

```env
TAVILY_API_KEY=your_tavily_api_key

BIFROST_BASE_URL=http://localhost:8080
BIFROST_MODEL=gemini-2.5-flash
BIFROST_API_KEY=your_bifrost_virtual_key

BACKEND_PORT=8000
FRONTEND_ORIGIN=http://localhost:3000
```

Start your Bifrost gateway and ensure Gemini is configured.

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create `.env.local` inside the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Frontend:

http://localhost:3000

**Note:** Keep the backend, Bifrost gateway, and frontend running when using the complete application.

---

## Why VeriSync AI?

Traditional AI interactions often encourage users to accept generated responses without independently examining their factual accuracy.

VeriSync introduces an additional verification layer between AI-generated information and the people who use it.

Its focus is not only on evaluating individual claims, but also on identifying information that may become outdated and allowing users to compare verification results over time.

## Future Enhancements

- Source credibility and reliability scoring.
- Cross-source agreement and disagreement analysis.
- Historical claim tracking and truth timelines.
- Downloadable PDF verification reports.
- Browser extension for direct AI answer verification.
- Integrations with multiple AI platforms.
- Developer API for third-party applications.
- Multilingual verification support.

## Documentation

- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)

## Project Vision

VeriSync AI aims to make AI-generated information more transparent, traceable, and reliable by bringing factual verification and information freshness analysis into one accessible platform.



*Verify Facts. Track Freshness. Build Trust.*

</p>
