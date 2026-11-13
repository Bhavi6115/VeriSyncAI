# VeriSync AI — Frontend

A modern, interactive web interface for verifying AI-generated answers, analyzing factual claims, tracking information freshness, and comparing verification results over time.

## Overview

VeriSync AI helps users evaluate the reliability of AI-generated responses by breaking answers into individual factual claims and presenting their verification results with supporting web evidence.

The frontend provides an intuitive dashboard where users can submit answers, inspect claim-level results, explore evidence sources, maintain verification history, and re-verify previous answers.

## Features

- **AI Answer Verification:** Submit AI-generated answers for factual analysis.
- **Claim Extraction:** Automatically identify individual factual claims.
- **Claim-Level Results:** View supported, contradicted, mixed, and insufficient-evidence verdicts.
- **Evidence & Sources:** Explore supporting information retrieved from the web.
- **Freshness Classification:** Identify potentially outdated and time-sensitive information.
- **Verification Studio:** Analyze verification results through an interactive interface.
- **Verification History:** Access previously completed verification reports.
- **Re-Verify & Compare:** Run verification again and compare previous and latest results, including verdict changes, newly detected claims, scores, and updated evidence.
- **Responsive Design:** Optimized for desktop and mobile screens.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React.js | UI development |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| Local Storage | Verification history persistence |
| FastAPI | Backend communication |

## Project Structure

```text
frontend/
├── public/
├── src/
│   └── app/
│       ├── page.tsx
│       ├── layout.tsx
│       └── globals.css
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js (LTS recommended)
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/VeriSync-AI.git
```

### 2. Navigate to the Frontend

```bash
cd VeriSync-AI/frontend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the frontend directory.

Configure the backend URL according to your local setup:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Do not add private API keys to frontend environment variables.

### 5. Start the Development Server

```bash
npm run dev
```

Open your browser at:

http://localhost:3000

## Backend Integration

The frontend communicates with the VeriSync AI FastAPI backend for:

- Claim extraction
- Live evidence retrieval
- AI-powered claim evaluation
- Freshness classification
- Re-verification

Ensure the backend is running before submitting verification requests.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run lint` | Run lint checks, if configured |

## Re-Verify & Compare

One of VeriSync AI's key capabilities is its re-verification workflow.

Users can re-evaluate a previously submitted answer and inspect differences between verification runs, including:

- Changes in verification scores.
- Claims whose verdicts have changed.
- Newly detected factual claims.
- Updated supporting evidence and sources.

This helps users understand how the reliability of AI-generated information evolves over time.

## Part of VeriSync AI

This frontend is part of the larger VeriSync AI project, which combines a Next.js frontend with a Python FastAPI backend, Bifrost-powered Gemini integration, and Tavily web search.

---

**VeriSync AI — Verify Facts. Track Freshness. Build Trust.**
