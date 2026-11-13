VERISYNC AI — STUDIO RESULTS + RE-VERIFY & COMPARE UPDATE

Files included:
  frontend/src/app/page.tsx
  frontend/src/app/globals.css

Apply the update:
1. Extract this ZIP.
2. In your existing VeriSync project, replace:
   frontend/src/app/page.tsx
   frontend/src/app/globals.css
3. Keep your existing .env.local, package.json, backend, Bifrost and Tavily setup.
4. From PowerShell:

   cd D:\VeriSync-AI\frontend
   npm run dev

What changed:
- After a successful verification, the Studio remains open and scrolls to a
  Latest Verification section underneath the input.
- The Studio section shows the trust/freshness summary, supported/stale counts,
  expandable claim details, explanations and clickable evidence sources.
- The latest Studio report has a Re-verify & compare action.
- Saved reports have a Re-verify & compare action in the full report view.
- Re-verification sends the saved original answer to the existing POST /api/verify
  endpoint. This invokes the existing backend Bifrost/Gemini and Tavily workflow.
- Each re-verification is saved as a new history report; the earlier report is
  kept and linked as the comparison baseline.
- The comparison displays before/after trust and freshness scores, changed claim
  verdicts/freshness, newly detected claims, claims not extracted again, new source
  URLs, and changed source titles/dates/evidence snippets.
- Mobile responsive styles are included for the Studio results and comparison.

Notes:
- No backend files or API contracts were changed.
- Reports continue to be stored in browser localStorage, as in the existing app.
- Claim matching uses normalized claim text. A claim not extracted in a later run
  is labelled separately and is not automatically treated as false.
- Trust/freshness scores are indicative heuristics, not calibrated probabilities.

Validation performed:
- TSX transpilation passed.
- Isolated TypeScript check with framework declarations passed.
- CSS parser validation passed.
- A full Next.js build was not run because the complete local project and its
  installed dependencies are not present in this workspace.
