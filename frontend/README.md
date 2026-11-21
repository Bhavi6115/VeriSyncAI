# VeriSync AI — Frontend

The frontend of VeriSync AI is an interactive verification dashboard built using Next.js, React.js and TypeScript.

It provides users with a centralized workspace to submit AI-generated answers, inspect claim-level verification results, explore source intelligence, and compare historical verification reports.

## Features

- **Overview Dashboard:** Introduction to VeriSync AI and its verification capabilities.
- **Verification Studio:** Submit AI-generated answers for claim extraction and verification.
- **Claim-Level Results:** View individual claims, verdicts, explanations and supporting evidence.
- **Source Intelligence Workspace:** Explore detailed source authority, relevance, evidence stance, publication dates, limitations and cross-source agreement.
- **Verification History:** Revisit previously analyzed responses.
- **Re-Verify & Compare:** Compare previous verification results with newly generated results.
- **Responsive Interface:** Designed for desktop and mobile screens.

## Technology Stack

- Next.js
- React.js
- TypeScript
- Tailwind CSS
- CSS
- REST API integration

## Project Structure

```text
frontend/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   └── components/
│       ├── SourceCard.tsx
│       ├── EvidenceAgreement.tsx
│       ├── SourceIntelligence.tsx
│       └── SourceIntelligence.css
│
├── public/
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- A running VeriSync AI backend

### 1. Navigate to the Frontend

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open:

`http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

To start the production server after building:

```bash
npm run start
```

## Backend Connection

The frontend communicates with the FastAPI backend through REST API requests.

Default local backend:

`http://127.0.0.1:8000`

Make sure the backend is running and the API endpoint configuration used by the frontend points to the correct backend address.

## Main User Workflow

1. Open the VeriSync AI dashboard.
2. Navigate to Verification Studio.
3. Paste an AI-generated answer.
4. Start verification.
5. Explore claim-level results and evidence.
6. Open the Source Intelligence workspace for detailed source assessments.
7. Access previous reports through History.
8. Re-verify and compare results when needed.

## Related Repository

[VeriSync AI — Main Repository](https://github.com/Bhavi6115/VeriSyncAI)

---

**VeriSync AI Frontend — An intuitive interface for intelligent information verification.**