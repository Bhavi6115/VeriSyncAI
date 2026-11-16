"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Fingerprint,
  Globe2,
  History,
  Layers3,
  LoaderCircle,
  Menu,
  Network,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { jsPDF } from "jspdf";
import SourceIntelligence, { type SourceIntelligenceData } from "../components/SourceIntelligence";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "verisync-verification-history";

type Verdict = "supported" | "contradicted" | "mixed" | "insufficient_evidence" | string;
 type Freshness = "current" | "potentially_outdated" | "outdated" | "not_time_sensitive" | "uncertain" | string;
 type Section = "overview" | "studio" | "results" | "source-intelligence" | "history" | "about";
 type Filter = "all" | "supported" | "contradicted" | "outdated";
 type SortOrder = "newest" | "oldest" | "trust";
 type BackendStatus = "checking" | "online" | "offline";

type Source = {
  title?: string;
  url?: string | null;
  content?: string;
  published_date?: string | null;
};

type Claim = {
  claim: string;
  category?: string;
  temporal_sensitivity?: string;
  verdict: Verdict;
  freshness: Freshness;
  explanation?: string;
  sources?: Source[];
  source_intelligence?: SourceIntelligenceData;
  search_error?: string | null;
};

type Report = {
  id: string;
  answer: string;
  created_at: string;
  total_claims: number;
  verified_claims: Claim[];
  verification_type?: "initial" | "reverification";
  comparison_base_id?: string;
};

type ComparisonChange = {
  type: "changed" | "new" | "not_repeated" | "unchanged";
  previous?: Claim;
  current?: Claim;
  scoreDelta?: number;
};

type SourceUpdate = {
  previous: Source;
  current: Source;
};

type ReportComparison = {
  previous: Report;
  current: Report;
  previousScores: ReturnType<typeof getReportScores>;
  currentScores: ReturnType<typeof getReportScores>;
  trustDelta: number;
  freshnessDelta: number;
  changes: ComparisonChange[];
  newSources: Source[];
  updatedSources: SourceUpdate[];
};

const SAMPLE_ANSWER =
  "Python 3.12 was released in October 2023. React 19 was released in 2024. The latest iPhone costs $799. The Earth revolves around the Sun.";

function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function freshnessScore(value: string): number {
  switch (value) {
    case "current":
    case "not_time_sensitive":
      return 100;
    case "potentially_outdated":
      return 60;
    case "outdated":
      return 20;
    case "uncertain":
      return 45;
    default:
      return 35;
  }
}

function verdictScore(value: string): number {
  switch (value) {
    case "supported":
      return 100;
    case "mixed":
      return 55;
    case "contradicted":
      return 0;
    default:
      return 35;
  }
}

function getReportScores(claims: Claim[]) {
  if (!claims.length) {
    return { freshness: 0, trust: 0, supported: 0, contradicted: 0, outdated: 0 };
  }

  const freshness =
    claims.reduce((sum, claim) => sum + freshnessScore(claim.freshness), 0) / claims.length;
  const trust =
    claims.reduce(
      (sum, claim) =>
        sum + freshnessScore(claim.freshness) * 0.4 + verdictScore(claim.verdict) * 0.6,
      0,
    ) / claims.length;

  return {
    freshness: Math.round(freshness),
    trust: Math.round(trust),
    supported: claims.filter((claim) => claim.verdict === "supported").length,
    contradicted: claims.filter((claim) => claim.verdict === "contradicted").length,
    outdated: claims.filter(
      (claim) =>
        claim.freshness === "outdated" || claim.freshness === "potentially_outdated",
    ).length,
  };
}

function verdictLabel(value: string): string {
  switch (value) {
    case "supported":
      return "Supported";
    case "contradicted":
      return "Contradicted";
    case "mixed":
      return "Mixed evidence";
    case "insufficient_evidence":
      return "Insufficient evidence";
    default:
      return "Unverified";
  }
}

function freshnessLabel(value: string): string {
  switch (value) {
    case "current":
      return "Current";
    case "not_time_sensitive":
      return "Not time-sensitive";
    case "potentially_outdated":
      return "Potentially outdated";
    case "outdated":
      return "Outdated";
    case "uncertain":
      return "Uncertain";
    default:
      return "Unknown";
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeReport(data: unknown, answer: string): Report {
  const response = data as { verified_claims?: Claim[] } | null;
  const claims = Array.isArray(response?.verified_claims) ? response.verified_claims : [];
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    answer,
    created_at: new Date().toISOString(),
    total_claims: claims.length,
    verified_claims: claims,
  };
}

function normalizeClaimText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getClaimQualityScore(claim: Claim): number {
  return freshnessScore(claim.freshness) * 0.4 + verdictScore(claim.verdict) * 0.6;
}

function compareReports(previous: Report, current: Report): ReportComparison {
  const usedCurrent = new Set<number>();
  const changes: ComparisonChange[] = [];

  previous.verified_claims.forEach((oldClaim) => {
    const oldKey = normalizeClaimText(oldClaim.claim);
    const matchIndex = current.verified_claims.findIndex(
      (newClaim, index) => !usedCurrent.has(index) && normalizeClaimText(newClaim.claim) === oldKey,
    );

    if (matchIndex === -1) {
      changes.push({ type: "not_repeated", previous: oldClaim });
      return;
    }

    usedCurrent.add(matchIndex);
    const newClaim = current.verified_claims[matchIndex];
    const changed =
      oldClaim.verdict !== newClaim.verdict || oldClaim.freshness !== newClaim.freshness;

    changes.push({
      type: changed ? "changed" : "unchanged",
      previous: oldClaim,
      current: newClaim,
      scoreDelta: Math.round(getClaimQualityScore(newClaim) - getClaimQualityScore(oldClaim)),
    });
  });

  current.verified_claims.forEach((newClaim, index) => {
    if (!usedCurrent.has(index)) changes.push({ type: "new", current: newClaim });
  });

  const previousSourcesByUrl = new Map<string, Source>();
  previous.verified_claims
    .flatMap((claim) => claim.sources ?? [])
    .forEach((source) => {
      const url = safeUrl(source.url);
      if (url && !previousSourcesByUrl.has(url)) previousSourcesByUrl.set(url, source);
    });

  const seenCurrentUrls = new Set<string>();
  const newSources: Source[] = [];
  const updatedSources: SourceUpdate[] = [];
  current.verified_claims
    .flatMap((claim) => claim.sources ?? [])
    .forEach((source) => {
      const url = safeUrl(source.url);
      if (!url || seenCurrentUrls.has(url)) return;
      seenCurrentUrls.add(url);

      const oldSource = previousSourcesByUrl.get(url);
      if (!oldSource) {
        newSources.push(source);
        return;
      }

      const normalizeEvidence = (value?: string | null) => (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const evidenceChanged =
        normalizeEvidence(oldSource.title) !== normalizeEvidence(source.title) ||
        normalizeEvidence(oldSource.published_date) !== normalizeEvidence(source.published_date) ||
        normalizeEvidence(oldSource.content) !== normalizeEvidence(source.content);
      if (evidenceChanged) updatedSources.push({ previous: oldSource, current: source });
    });

  const previousScores = getReportScores(previous.verified_claims);
  const currentScores = getReportScores(current.verified_claims);

  return {
    previous,
    current,
    previousScores,
    currentScores,
    trustDelta: currentScores.trust - previousScores.trust,
    freshnessDelta: currentScores.freshness - previousScores.freshness,
    changes,
    newSources,
    updatedSources,
  };
}

function comparisonChangeTitle(change: ComparisonChange): string {
  if (change.type === "new") return "Newly detected claim";
  if (change.type === "not_repeated") return "Not extracted in this run";
  if (!change.previous || !change.current) return "Claim status";

  const previousWasStale = ["outdated", "potentially_outdated"].includes(change.previous.freshness);
  const currentIsStale = ["outdated", "potentially_outdated"].includes(change.current.freshness);
  if (change.current.verdict === "supported" && change.previous.verdict !== "supported") return "Now supported";
  if (change.current.verdict === "contradicted" && change.previous.verdict !== "contradicted") return "Now contradicted";
  if (currentIsStale && !previousWasStale) return "Became outdated";
  if (previousWasStale && !currentIsStale) return "Freshness improved";
  return "Verification status changed";
}

function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function reportAsText(report: Report): string {
  const scores = getReportScores(report.verified_claims);
  const claimLines = report.verified_claims.map((claim, index) => {
    const sourceLines = (claim.sources ?? []).map(
      (source) => `Source: ${source.title || "Untitled source"} — ${source.url || "URL unavailable"}`,
    );
    return [
      `${index + 1}. ${claim.claim}`,
      `Verdict: ${verdictLabel(claim.verdict)}`,
      `Freshness: ${freshnessLabel(claim.freshness)}`,
      `Explanation: ${claim.explanation || "No explanation provided."}`,
      ...sourceLines,
    ].join("\n");
  });

  return [
    "VERISYNC AI — VERIFICATION REPORT",
    `Generated: ${formatDate(report.created_at)}`,
    `Claims analysed: ${report.total_claims}`,
    `Trust score: ${scores.trust}/100`,
    `Freshness score: ${scores.freshness}/100`,
    "",
    "ORIGINAL ANSWER",
    report.answer,
    "",
    "CLAIM ANALYSIS",
    ...claimLines,
    "",
    "Scores are indicative heuristics, not probabilities of truth.",
    "Generated using VeriSync AI.",
  ].join("\n");
}

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [sourceReportId, setSourceReportId] = useState("");
  const [expandedClaims, setExpandedClaims] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);
  const [reverifyError, setReverifyError] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<Filter>("all");
  const [historySort, setHistorySort] = useState<SortOrder>("newest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setReports(parsed as Report[]);
      }
    } catch (loadError) {
      console.error("Could not load verification history:", loadError);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (storageError) {
      console.error("Could not save verification history:", storageError);
      setError("Browser storage is unavailable. Your latest report may not persist.");
    }
  }, [reports, hydrated]);

  const checkBackend = useCallback(async () => {
    setBackendStatus("checking");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      setBackendStatus(response.ok ? "online" : "offline");
    } catch {
      setBackendStatus("offline");
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void checkBackend();
    const interval = window.setInterval(() => void checkBackend(), 30000);
    return () => window.clearInterval(interval);
  }, [checkBackend]);

  const latestReport = reports[0] ?? null;
  const sourceIntelligenceReport = reports.find((report) => report.id === sourceReportId) ?? latestReport;
  const latestScores = latestReport
    ? getReportScores(latestReport.verified_claims)
    : getReportScores([]);
  const totalClaims = reports.reduce(
    (sum, report) => sum + report.verified_claims.length,
    0,
  );

  const filteredReports = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const filtered = reports.filter((report) => {
      const matchesSearch = !query || report.answer.toLowerCase().includes(query);
      const claims = report.verified_claims;
      const matchesFilter =
        historyFilter === "all" ||
        (historyFilter === "supported" &&
          claims.some((claim) => claim.verdict === "supported")) ||
        (historyFilter === "contradicted" &&
          claims.some((claim) => claim.verdict === "contradicted")) ||
        (historyFilter === "outdated" &&
          claims.some(
            (claim) =>
              claim.freshness === "outdated" ||
              claim.freshness === "potentially_outdated",
          ));
      return matchesSearch && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      if (historySort === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (historySort === "trust") {
        return (
          getReportScores(b.verified_claims).trust -
          getReportScores(a.verified_claims).trust
        );
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reports, historySearch, historyFilter, historySort]);

  const activeComparisonBase = activeReport?.comparison_base_id
    ? reports.find((report) => report.id === activeReport.comparison_base_id) ?? null
    : null;
  const activeComparison = activeReport && activeComparisonBase
    ? compareReports(activeComparisonBase, activeReport)
    : null;
  const latestComparisonBase = latestReport?.comparison_base_id
    ? reports.find((report) => report.id === latestReport.comparison_base_id) ?? null
    : null;
  const latestComparison = latestReport && latestComparisonBase
    ? compareReports(latestComparisonBase, latestReport)
    : null;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function navigate(section: Section) {
    setActiveSection(section);
    setMobileMenu(false);
    if (section !== "results") {
      setActiveReport(null);
      setExpandedClaims([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollOverviewSection(sectionId: string) {
    setMobileMenu(false);
    if (activeSection !== "overview" && activeSection !== "about") {
      setActiveSection("about");
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }
    setActiveSection("about");
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function verifyAnswer() {
    const trimmed = answer.trim();
    if (trimmed.length < 10) {
      setError("Please enter an answer containing at least 10 characters.");
      return;
    }

    setIsVerifying(true);
    setError("");
    setReverifyError("");
    setExpandedClaims([]);
    setActiveReport(null);

    try {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: trimmed }),
      });

      if (!response.ok) {
        let detail = "Verification failed. Please try again.";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string") detail = body.detail;
        } catch {
          // Use the fallback error message.
        }
        throw new Error(detail);
      }

      const data: unknown = await response.json();
      if ((data as { success?: boolean })?.success === false) {
        throw new Error("The verification service could not complete this request.");
      }

      const report = makeReport(data, trimmed);
      report.verification_type = "initial";
      setReports((previous) => [report, ...previous]);
      setSourceReportId(report.id);
      setActiveReport(null);
      setActiveSection("studio");
      showToast("Verification complete. Your claim details are shown below.");
      window.setTimeout(() => {
        document.getElementById("studio-latest-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Something went wrong while verifying this answer.",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function reverifyReport(report: Report) {
    if (isReverifying) return;

    setIsReverifying(true);
    setReverifyError("");

    try {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: report.answer }),
      });

      if (!response.ok) {
        let detail = "Fresh verification failed. Please try again.";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string") detail = body.detail;
        } catch {
          // Keep the fallback message when the response is not JSON.
        }
        throw new Error(detail);
      }

      const data: unknown = await response.json();
      if ((data as { success?: boolean })?.success === false) {
        throw new Error("The verification service could not complete this request.");
      }

      const refreshedReport = makeReport(data, report.answer);
      refreshedReport.verification_type = "reverification";
      refreshedReport.comparison_base_id = report.id;

      setReports((previous) => [refreshedReport, ...previous]);
      setSourceReportId(refreshedReport.id);
      setActiveReport(refreshedReport);
      setAnswer(report.answer);
      setExpandedClaims([]);
      setActiveSection("results");
      setMobileMenu(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Fresh verification complete. Your comparison is ready.");
    } catch (verificationError) {
      const message = verificationError instanceof Error
        ? verificationError.message
        : "Something went wrong while re-verifying this report.";
      setReverifyError(message);
      showToast("Re-verification could not be completed.");
    } finally {
      setIsReverifying(false);
    }
  }

  function openReport(report: Report) {
    setActiveReport(report);
    setExpandedClaims([]);
    setActiveSection("results");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openLatestReport() {
    if (!latestReport) {
      navigate("history");
      return;
    }
    openReport(latestReport);
  }

  function deleteReport(id: string) {
    if (!window.confirm("Delete this verification report from this browser?")) return;
    setReports((previous) => previous.filter((report) => report.id !== id));
    if (activeReport?.id === id) {
      setActiveReport(null);
      setActiveSection("history");
    }
    showToast("Report deleted.");
  }

  function clearHistory() {
    if (!reports.length) return;
    if (
      !window.confirm(
        "Delete all locally saved verification reports? This action cannot be undone.",
      )
    ) {
      return;
    }
    setReports([]);
    setActiveReport(null);
    setActiveSection("history");
    showToast("History cleared.");
  }

  async function copyText(value: string, successMessage = "Copied to clipboard.") {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch {
      showToast("Copy failed. Check your browser clipboard permissions.");
    }
  }

  function toggleClaim(index: number) {
    setExpandedClaims((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index],
    );
  }

  function printReport() {
    if (!activeReport) return;
    // Expand every claim before opening print preview so the evidence is included.
    setExpandedClaims(activeReport.verified_claims.map((_, index) => index));
    window.setTimeout(() => window.print(), 180);
  }

  function downloadPdf(report: Report) {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 17;
    const contentWidth = pageWidth - margin * 2;
    const footerY = pageHeight - 12;
    const bodyBottom = footerY - 8;
    let y = 20;

    const drawRunningHeader = () => {
      doc.setFillColor(12, 16, 27);
      doc.rect(0, 0, pageWidth, 13, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(230, 235, 244);
      doc.text("VERISYNC AI  /  VERIFICATION INTELLIGENCE", margin, 8.5);
    };

    const addPage = () => {
      doc.addPage();
      drawRunningHeader();
      y = 21;
    };

    const ensureSpace = (height: number) => {
      if (y + height > bodyBottom) addPage();
    };

    const addParagraph = (
      rawText: string,
      options: {
        size?: number;
        bold?: boolean;
        color?: [number, number, number];
        indent?: number;
        gap?: number;
      } = {},
    ) => {
      const size = options.size ?? 9.3;
      const indent = options.indent ?? 0;
      const text = String(rawText || "—").replace(/\s+/g, " ").trim();
      doc.setFont("helvetica", options.bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, contentWidth - indent) as string[];
      const lineHeight = size * 0.43 + 1.15;

      for (const line of lines) {
        ensureSpace(lineHeight + 0.5);
        doc.setTextColor(...(options.color ?? [48, 56, 72]));
        doc.text(line, margin + indent, y);
        y += lineHeight;
      }
      y += options.gap ?? 2;
    };

    const addSectionTitle = (title: string) => {
      ensureSpace(12);
      y += 2;
      doc.setFillColor(239, 236, 252);
      doc.roundedRect(margin, y - 4.5, contentWidth, 8, 1.4, 1.4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(91, 67, 164);
      doc.text(title.toUpperCase(), margin + 3, y + 0.7);
      y += 9;
    };

    const addClickableUrl = (url: string) => {
      const safe = safeUrl(url);
      if (!safe) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.4);
      const lines = doc.splitTextToSize(safe, contentWidth - 13) as string[];
      const lineHeight = 3.8;
      for (const line of lines) {
        ensureSpace(lineHeight + 1);
        doc.setTextColor(43, 104, 183);
        doc.text(line, margin + 6, y);
        const width = Math.min(contentWidth - 13, doc.getTextWidth(line) + 1);
        doc.link(margin + 6, y - 2.7, width, 3.5, { url: safe });
        y += lineHeight;
      }
      y += 1;
    };

    // Cover / first page header.
    doc.setFillColor(12, 16, 27);
    doc.rect(0, 0, pageWidth, 48, "F");
    doc.setFillColor(139, 111, 218);
    doc.roundedRect(margin, 12, 10, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.setTextColor(255, 255, 255);
    doc.text("VeriSync AI", margin + 15, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(200, 207, 221);
    doc.text("ANSWER FRESHNESS & EVIDENCE REPORT", margin + 15, 26);
    doc.setFontSize(7.5);
    doc.text(`Generated ${formatDate(report.created_at)}`, margin + 15, 34);
    y = 58;

    const scores = getReportScores(report.verified_claims);
    addSectionTitle("Verification summary");

    const metricGap = 3;
    const metricWidth = (contentWidth - metricGap * 2) / 3;
    const metrics = [
      ["TRUST SCORE", `${scores.trust}/100`],
      ["FRESHNESS", `${scores.freshness}/100`],
      ["CLAIMS ANALYSED", `${report.total_claims}`],
    ];
    metrics.forEach(([label, value], index) => {
      const x = margin + index * (metricWidth + metricGap);
      doc.setFillColor(246, 247, 251);
      doc.roundedRect(x, y, metricWidth, 18, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(112, 119, 135);
      doc.text(label, x + 3, y + 6);
      doc.setFontSize(13);
      doc.setTextColor(30, 37, 53);
      doc.text(value, x + 3, y + 13.5);
    });
    y += 23;
    addParagraph(
      `Supported: ${scores.supported}     Contradicted: ${scores.contradicted}     Outdated / potentially outdated: ${scores.outdated}`,
      { size: 8.2, color: [80, 88, 103], gap: 3 },
    );

    addSectionTitle("Original answer");
    addParagraph(report.answer, { size: 9.2, color: [48, 56, 72], gap: 4 });

    addSectionTitle("Claim-by-claim analysis");
    if (!report.verified_claims.length) {
      addParagraph("No factual claims were returned for this answer.", { size: 9.2 });
    }

    report.verified_claims.forEach((claim, index) => {
      ensureSpace(24);
      y += 1;
      addParagraph(`${index + 1}. ${claim.claim}`, {
        size: 10,
        bold: true,
        color: [29, 37, 55],
        gap: 1.5,
      });
      const verdictColor: [number, number, number] =
        claim.verdict === "supported"
          ? [39, 132, 88]
          : claim.verdict === "contradicted"
            ? [184, 65, 76]
            : [151, 109, 43];
      addParagraph(
        `Verdict: ${verdictLabel(claim.verdict)}     |     Freshness: ${freshnessLabel(claim.freshness)}`,
        { size: 8.2, bold: true, color: verdictColor, gap: 1 },
      );
      addParagraph(
        `Category: ${claim.category || "General"}     |     Time sensitivity: ${claim.temporal_sensitivity || "Unknown"}`,
        { size: 7.8, color: [94, 102, 117], gap: 1 },
      );
      addParagraph(`Explanation: ${claim.explanation || "No explanation provided."}`, {
        size: 8.5,
        color: [56, 64, 79],
        gap: 2,
      });

      const sources = Array.isArray(claim.sources) ? claim.sources : [];
      if (sources.length) {
        addParagraph("EVIDENCE SOURCES", {
          size: 7,
          bold: true,
          color: [91, 67, 164],
          gap: 1,
        });
        sources.forEach((source, sourceIndex) => {
          addParagraph(`${sourceIndex + 1}. ${source.title || "Untitled source"}`, {
            size: 8,
            bold: true,
            color: [40, 48, 65],
            indent: 2,
            gap: 0.5,
          });
          const url = safeUrl(source.url);
          if (url) addClickableUrl(url);
          else {
            addParagraph("URL unavailable", {
              size: 7.2,
              color: [125, 131, 143],
              indent: 4,
              gap: 0.5,
            });
          }
          if (source.published_date) {
            addParagraph(`Published: ${source.published_date}`, {
              size: 7,
              color: [112, 119, 132],
              indent: 4,
              gap: 1,
            });
          }
        });
      } else {
        addParagraph("No source links were returned for this claim.", {
          size: 7.8,
          color: [112, 119, 132],
        });
      }

      ensureSpace(5);
      doc.setDrawColor(224, 228, 237);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    });

    addSectionTitle("Methodology & limitations");
    addParagraph(
      "VeriSync uses AI-assisted claim extraction and evaluation, with web evidence retrieved for each claim. Results depend on the relevance, availability, publication dates, and quality of the retrieved sources.",
      { size: 8.3, gap: 2 },
    );
    addParagraph(
      "Trust and freshness scores are indicative heuristics calculated from the returned verdict and freshness labels. They are not calibrated probabilities, guarantees of correctness, or professional advice. Review the linked sources before relying on important claims.",
      { size: 8.3, gap: 2 },
    );

    // Add consistent footer and page numbers after all automatic page breaks.
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      if (page > 1) drawRunningHeader();
      doc.setDrawColor(224, 228, 237);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(123, 130, 143);
      doc.text(
        "VeriSync AI  |  Indicative scores, not probabilities of truth",
        margin,
        footerY,
      );
      doc.text(`${page} / ${pageCount}`, pageWidth - margin, footerY, {
        align: "right",
      });
    }

    doc.save(`VeriSync-Report-${report.id.slice(0, 8)}.pdf`);
    showToast("PDF report generated.");
  }

  function renderComparisonPanel(comparison: ReportComparison, compact = false) {
    const notableChanges = comparison.changes.filter((change) => change.type !== "unchanged");
    const changedCount = comparison.changes.filter((change) => change.type === "changed").length;
    const addedCount = comparison.changes.filter((change) => change.type === "new").length;
    const notRepeatedCount = comparison.changes.filter((change) => change.type === "not_repeated").length;

    return (
      <section className={`comparison-panel ${compact ? "comparison-compact" : ""}`}>
        <div className="comparison-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> FRESHNESS COMPARISON</div>
            <h3>What changed since the last check?</h3>
            <p>Compared {formatDate(comparison.previous.created_at)} with {formatDate(comparison.current.created_at)}.</p>
          </div>
          <span className="comparison-badge"><RefreshCw size={12} /> RE-VERIFIED</span>
        </div>

        <div className="comparison-kpis">
          <div className="comparison-kpi"><span>PREVIOUS TRUST</span><strong>{comparison.previousScores.trust}<small>/100</small></strong></div>
          <div className="comparison-kpi"><span>LATEST TRUST</span><strong>{comparison.currentScores.trust}<small>/100</small></strong></div>
          <div className="comparison-kpi"><span>TRUST CHANGE</span><strong className={comparison.trustDelta > 0 ? "delta-up" : comparison.trustDelta < 0 ? "delta-down" : "delta-flat"}>{formatDelta(comparison.trustDelta)}<small> pts</small></strong></div>
          <div className="comparison-kpi"><span>CLAIM UPDATES</span><strong>{changedCount + addedCount + notRepeatedCount}</strong></div>
          <div className="comparison-kpi"><span>NEW / UPDATED SOURCES</span><strong>{comparison.newSources.length + comparison.updatedSources.length}</strong></div>
        </div>

        <div className="comparison-change-summary">
          <span>{changedCount} status updates</span>
          <span>{addedCount} newly detected</span>
          <span>{notRepeatedCount} not extracted again</span>
          <span>{comparison.newSources.length} new sources</span>
          <span>{comparison.updatedSources.length} updated sources</span>
          <span>Freshness {formatDelta(comparison.freshnessDelta)} pts</span>
        </div>

        <div className="comparison-detail-heading"><strong>Claim changes</strong><span>{notableChanges.length} ITEMS TO REVIEW</span></div>
        {notableChanges.length ? (
          <div className="comparison-change-list">
            {notableChanges.map((change, index) => (
              <article className={`comparison-change comparison-${change.type}`} key={`${comparison.current.id}-change-${index}`}>
                <div className="comparison-change-top">
                  <span className="comparison-change-label">{comparisonChangeTitle(change)}</span>
                  {typeof change.scoreDelta === "number" && <span className={change.scoreDelta > 0 ? "delta-up" : change.scoreDelta < 0 ? "delta-down" : "delta-flat"}>{formatDelta(change.scoreDelta)} pts</span>}
                </div>
                <strong className="comparison-claim-text">{change.current?.claim || change.previous?.claim}</strong>
                {change.previous && change.current ? (
                  <div className="comparison-before-after">
                    <div><small>PREVIOUS</small><span>{verdictLabel(change.previous.verdict)} · {freshnessLabel(change.previous.freshness)}</span></div>
                    <div><small>LATEST</small><span>{verdictLabel(change.current.verdict)} · {freshnessLabel(change.current.freshness)}</span></div>
                  </div>
                ) : (
                  <p className="comparison-explain">{change.type === "new" ? "This claim was detected during the latest extraction and was not present in the earlier report." : "This statement was not extracted in the latest run. That does not by itself mean the claim is false."}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="comparison-empty">No claim verdict or freshness changes were detected in this comparison.</p>
        )}

        <div className="comparison-sources">
          <div className="comparison-detail-heading"><strong>Newly retrieved sources</strong><span>{comparison.newSources.length} NEW</span></div>
          {comparison.newSources.length ? (
            <div className="comparison-source-list">
              {comparison.newSources.slice(0, 6).map((source, index) => {
                const url = safeUrl(source.url);
                return (
                  <div className="comparison-source" key={`${comparison.current.id}-new-source-${index}`}>
                    <Globe2 size={14} />
                    <div><strong>{source.title || "Untitled source"}</strong><small>{source.published_date || "Publication date not provided"}</small>{source.content && <p className="comparison-source-snippet">{source.content.slice(0, 260)}</p>}</div>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title || "new source"}`}><ExternalLink size={13} /></a>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="comparison-empty">No new source URLs were returned.</p>
          )}
          {comparison.updatedSources.length > 0 && (
            <>
              <div className="comparison-detail-heading"><strong>Updated evidence from existing sources</strong><span>{comparison.updatedSources.length} UPDATED</span></div>
              <div className="comparison-source-list">
                {comparison.updatedSources.slice(0, 6).map((update, index) => {
                  const url = safeUrl(update.current.url);
                  return (
                    <div className="comparison-source comparison-source-updated" key={`${comparison.current.id}-updated-source-${index}`}>
                      <RefreshCw size={14} />
                      <div><strong>{update.current.title || "Updated source"}</strong><small>Previously: {update.previous.title || "Untitled source"} · {update.current.published_date || "Publication date not provided"}</small>{update.current.content && <p className="comparison-source-snippet">{update.current.content.slice(0, 260)}</p>}</div>
                      {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open updated source ${update.current.title || "source"}`}><ExternalLink size={13} /></a>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <p className="comparison-footnote">Claim matching uses normalized claim text. Claims that were not extracted again are shown separately and are not automatically treated as false. Source changes are detected by comparing returned titles, publication dates and evidence snippets. Trust and freshness scores are indicative heuristics.</p>
      </section>
    );
  }

  const statusText =
    backendStatus === "online"
      ? "Backend connected"
      : backendStatus === "offline"
        ? "Backend unavailable"
        : "Checking backend";

  const navigationItems: { id: Section; label: string; icon: typeof Layers3 }[] = [
    { id: "overview", label: "Overview", icon: Layers3 },
    { id: "studio", label: "Verification studio", icon: Sparkles },
    { id: "results", label: "Latest report", icon: FileCheck2 },
    { id: "source-intelligence", label: "Source Intelligence", icon: ShieldCheck },
    { id: "history", label: "History", icon: History },
    { id: "about", label: "How it works", icon: Network },
  ];

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol"><Fingerprint size={21} /></div>
          <div>
            <div className="brand-name">Veri<span>Sync</span> AI</div>
            <div className="brand-caption">VERIFICATION INTELLIGENCE</div>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                onClick={() =>
                  item.id === "results"
                    ? openLatestReport()
                    : item.id === "about"
                      ? scrollOverviewSection("how-it-works")
                      : navigate(item.id)
                }
              >
                <Icon size={17} />
                {item.label}
                {item.id === "history" && (
                  <span className="nav-count">{reports.length}</span>
                )}
                {activeSection === item.id && <span className="nav-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-divider" />
        <div className="system-card">
          <div className="system-card-top">
            <span className={`pulse-dot status-${backendStatus}`} /> SYSTEM STATUS
          </div>
          <div className="system-line">
            <span>Backend API</span>
            <strong className={`status-text status-${backendStatus}`}>
              {backendStatus.toUpperCase()}
            </strong>
          </div>
          <div className="system-line"><span>AI gateway</span><span>Via backend</span></div>
          <div className="system-line"><span>Live web research</span><span>Via backend</span></div>
          <p className="system-note">
            API health is checked automatically every 30 seconds. Provider
            connectivity is verified when you run an analysis.
          </p>
          <button className="system-refresh" onClick={() => void checkBackend()}>
            <RefreshCw size={12} /> Check connection
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="mini-avatar">V</div>
          <div className="profile-info">
            <strong>VeriSync Workspace</strong>
            <span>Personal research space</span>
          </div>
          <button
            className="icon-button"
            title="Check backend connection"
            onClick={() => void checkBackend()}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>VeriSync</span>
            <ChevronRight size={13} />
            <span>{activeSection.replace("-", " ")}</span>
          </div>
          <div className="topbar-right">
            <div className="live-indicator">
              <span className={`status-${backendStatus}`} />
              {statusText.toUpperCase()}
            </div>
            <button
              className="top-icon"
              title="Check backend connection"
              onClick={() => void checkBackend()}
            >
              <RefreshCw size={16} />
            </button>
            <div className="top-avatar">V</div>
          </div>
        </header>

        <div className="content">
          {(activeSection === "overview" || activeSection === "about") && (
            <>
              <section className="hero-section" id="overview">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> THE ANSWER FRESHNESS INTELLIGENCE LAYER
                  </div>
                  <h1>Truth moves.<br /><span>Stay in sync.</span></h1>
                  <p className="hero-description">
                    AI-generated answers can age quietly. VeriSync identifies
                    factual claims, checks them against live web evidence, and
                    reveals what is current, outdated, or contradicted.
                  </p>
                  <div className="hero-actions">
                    <button className="primary-button" onClick={() => navigate("studio")}>
                      <Sparkles size={16} /> Verify an answer <ArrowUpRight size={15} />
                    </button>
                    <button className="secondary-button" onClick={() => navigate("history")}>
                      <History size={15} /> View history
                    </button>
                  </div>
                  <div className="hero-proof">
                    <span><ShieldCheck size={13} /> Claim-level analysis</span>
                    <span><Globe2 size={13} /> Live web evidence</span>
                    <span><Clock3 size={13} /> Freshness scoring</span>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="core-glow" />
                  <div className="core-card">
                    <div className="core-icon"><Fingerprint size={34} /></div>
                    <div className="core-title">VERISYNC CORE</div>
                    <div className="core-subtitle">Evidence intelligence</div>
                    <div className="core-status">
                      <span /> {backendStatus === "online" ? "CONNECTED" : backendStatus.toUpperCase()}
                    </div>
                  </div>
                  <div className="float-chip chip-top"><ShieldCheck size={13} /> CLAIM VERIFIED</div>
                  <div className="float-chip chip-bottom"><Globe2 size={13} /> LIVE WEB SIGNAL</div>
                  <span className="visual-cross cross-one">✳</span>
                  <span className="visual-cross cross-two">✳</span>
                </div>
              </section>

              <section className="stats-grid">
                <button
                  className="stat-card"
                  onClick={() => {
                    setHistoryFilter("all");
                    navigate("history");
                  }}
                >
                  <div className="stat-top">TOTAL VERIFICATIONS<div className="stat-icon lime"><FileSearch size={16} /></div></div>
                  <div className="stat-value">{reports.length}</div>
                  <div className="stat-foot">Saved in this browser <ArrowUpRight size={12} /></div>
                </button>
                <button
                  className="stat-card"
                  onClick={() => {
                    setHistoryFilter("all");
                    navigate("history");
                  }}
                >
                  <div className="stat-top">CLAIMS ANALYSED<div className="stat-icon cyan"><Layers3 size={16} /></div></div>
                  <div className="stat-value">{totalClaims}</div>
                  <div className="stat-foot">Across saved reports <ArrowUpRight size={12} /></div>
                </button>
                <button className="stat-card" onClick={openLatestReport}>
                  <div className="stat-top">LATEST TRUST SCORE<div className="stat-icon violet"><Fingerprint size={16} /></div></div>
                  <div className="stat-value">{latestReport ? `${latestScores.trust}%` : "—"}</div>
                  <div className="stat-foot">Freshness + evidence quality <ArrowUpRight size={12} /></div>
                </button>
                <button
                  className="stat-card"
                  onClick={() => {
                    setHistoryFilter("outdated");
                    navigate("history");
                  }}
                >
                  <div className="stat-top">LATEST STALE CLAIMS<div className="stat-icon orange"><Clock3 size={16} /></div></div>
                  <div className="stat-value">{latestReport ? latestScores.outdated : "—"}</div>
                  <div className="stat-foot">Filter outdated reports <ArrowUpRight size={12} /></div>
                </button>
              </section>

              <section className="overview-lower">
                <div className="panel quick-panel">
                  <div className="panel-heading">
                    <div><div className="eyebrow">START HERE</div><h2>Make an answer <span>accountable.</span></h2></div>
                    <Zap size={20} />
                  </div>
                  <p>
                    Paste an AI-generated response and let VeriSync inspect the
                    factual claims that may have changed over time.
                  </p>
                  <button className="primary-button" onClick={() => navigate("studio")}>
                    Open verification studio <ArrowRight size={15} />
                  </button>
                </div>
                <div className="panel activity-panel">
                  <div className="panel-heading">
                    <div><div className="eyebrow">YOUR WORKSPACE</div><h2>Recent activity</h2></div>
                    <button className="text-action" onClick={() => navigate("history")}>View all <ArrowUpRight size={13} /></button>
                  </div>
                  {reports.slice(0, 3).length ? (
                    <div className="activity-list">
                      {reports.slice(0, 3).map((report) => (
                        <button className="activity-item" key={report.id} onClick={() => openReport(report)}>
                          <div className="activity-icon"><FileCheck2 size={16} /></div>
                          <div><strong>{report.answer}</strong><span>{formatDate(report.created_at)} · {report.total_claims} claims</span></div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="activity-empty">Your completed reports will appear here.</div>
                  )}
                </div>
              </section>

              <section className="overview-capabilities" id="capabilities">
                <div className="landing-section-heading">
                  <div>
                    <div className="eyebrow"><span className="eyebrow-line" /> BUILT FOR INFORMATION THAT CHANGES</div>
                    <h2>Catch the facts that <span>quietly go stale.</span></h2>
                    <p>Not every sentence needs a live check. VeriSync focuses on factual claims where accuracy, timing and source context matter.</p>
                  </div>
                  <button className="text-action" onClick={() => navigate("studio")}>Try it now <ArrowUpRight size={13} /></button>
                </div>

                <div className="capability-grid">
                  <article className="capability-card">
                    <div className="capability-icon capability-violet"><Clock3 size={19} /></div>
                    <span>01 / FRESHNESS</span>
                    <h3>Time-aware facts</h3>
                    <p>Spot statements that may have changed, from current prices and policies to recent product and software releases.</p>
                  </article>
                  <article className="capability-card">
                    <div className="capability-icon capability-cyan"><Globe2 size={19} /></div>
                    <span>02 / EVIDENCE</span>
                    <h3>Live web research</h3>
                    <p>Retrieve source material for extracted claims, then inspect the links instead of relying on an answer at face value.</p>
                  </article>
                  <article className="capability-card">
                    <div className="capability-icon capability-lime"><Layers3 size={19} /></div>
                    <span>03 / CLAIM LEVEL</span>
                    <h3>One claim at a time</h3>
                    <p>Separate supported, contradicted, mixed and uncertain claims so one questionable sentence does not hide in a long answer.</p>
                  </article>
                  <article className="capability-card">
                    <div className="capability-icon capability-amber"><FileCheck2 size={19} /></div>
                    <span>04 / TRACEABILITY</span>
                    <h3>Reports you can revisit</h3>
                    <p>Keep a local research trail, reopen earlier checks, inspect evidence and export a structured verification report.</p>
                  </article>
                  <article className="capability-card">
                    <div className="capability-icon capability-violet"><ShieldCheck size={19} /></div>
                    <span>05 / SOURCE INTELLIGENCE</span>
                    <h3>Understand your sources</h3>
                    <p>Go beyond source links. Evaluate authority, relevance, publication dates, evidence stance and agreement across sources.</p>
                  </article>
                </div>
                <div className="panel" style={{ marginTop: "22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}>
                  <div>
                    <div className="eyebrow">A CLOSER LOOK AT THE EVIDENCE</div>
                    <strong style={{ display: "block", marginTop: "6px" }}>Explore Source Intelligence</strong>
                    <p style={{ margin: "5px 0 0", maxWidth: "680px" }}>Inspect the quality and context behind retrieved evidence in its own dedicated workspace.</p>
                  </div>
                  <button className="secondary-button compact-button" onClick={() => navigate("source-intelligence")}>
                    Open Source Intelligence <ArrowUpRight size={14} />
                  </button>
                </div>
              </section>

              <section className="overview-workflow" id="how-it-works">
                <div className="landing-section-heading">
                  <div>
                    <div className="eyebrow"><span className="eyebrow-line" /> UNDER THE HOOD</div>
                    <h2>From generated text to <span>grounded evidence.</span></h2>
                    <p>A focused pipeline combines AI-assisted reasoning with current web research. Each stage has a clear job.</p>
                  </div>
                  <div className="workflow-live"><span className={`pulse-dot status-${backendStatus}`} /> {backendStatus === "online" ? "BACKEND CONNECTED" : backendStatus.toUpperCase()}</div>
                </div>

                <div className="workflow-track">
                  <article className="workflow-card">
                    <div className="workflow-number">01</div>
                    <div className="workflow-icon"><FileSearch size={20} /></div>
                    <span>EXTRACT</span>
                    <h3>Find factual claims</h3>
                    <p>The submitted answer is broken into individual statements that can be checked.</p>
                  </article>
                  <div className="workflow-connector"><ArrowRight size={17} /></div>
                  <article className="workflow-card">
                    <div className="workflow-number">02</div>
                    <div className="workflow-icon"><Fingerprint size={20} /></div>
                    <span>REASON</span>
                    <h3>Bifrost + Gemini</h3>
                    <p>The AI layer classifies each claim and evaluates the evidence returned for it.</p>
                  </article>
                  <div className="workflow-connector"><ArrowRight size={17} /></div>
                  <article className="workflow-card">
                    <div className="workflow-number">03</div>
                    <div className="workflow-icon"><Globe2 size={20} /></div>
                    <span>RESEARCH</span>
                    <h3>Tavily search</h3>
                    <p>Relevant web results are collected so time-sensitive statements can be compared with current sources.</p>
                  </article>
                  <div className="workflow-connector"><ArrowRight size={17} /></div>
                  <article className="workflow-card">
                    <div className="workflow-number">04</div>
                    <div className="workflow-icon"><BadgeCheck size={20} /></div>
                    <span>REPORT</span>
                    <h3>Inspect the result</h3>
                    <p>Review verdicts, freshness labels, explanations and source links claim by claim.</p>
                  </article>
                </div>
                <div className="workflow-note"><Shield size={15} /><span>Trust and freshness scores are indicative heuristics—not calibrated probabilities or guarantees of truth.</span></div>
              </section>

              <section className="overview-cta">
                <div className="cta-orb" />
                <div className="cta-copy">
                  <div className="eyebrow"><span className="eyebrow-line" /> READY WHEN YOU ARE</div>
                  <h2>Don't just read the answer.<br /><span>Check what changed.</span></h2>
                  <p>Run a verification and keep the evidence close to the claim.</p>
                </div>
                <button className="primary-button cta-button" onClick={() => navigate("studio")}><Sparkles size={16} /> Start a verification <ArrowUpRight size={15} /></button>
              </section>
            </>
          )}

          {activeSection === "studio" && (
            <section className="workspace-section" id="studio">
              <div className="section-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> ANALYSIS WORKSPACE</div>
                  <h2>Verification <span>studio.</span></h2>
                  <p>Paste an AI-generated answer. We will investigate its factual claims one by one.</p>
                </div>
                <div className="step-pill"><span>01</span> INPUT <ArrowRight size={12} /> <span>02</span> VERIFY <ArrowRight size={12} /> <span>03</span> INSPECT</div>
              </div>

              <div className="studio-grid">
                <div className="studio-card">
                  <div className="studio-card-header">
                    <div className="studio-card-title">
                      <div className="small-icon"><Shield size={17} /></div>
                      <div><strong>Answer intelligence input</strong><span>Submit text for claim extraction and verification</span></div>
                    </div>
                    <div className="secure-label"><ShieldCheck size={13} /> PRIVATE WORKSPACE</div>
                  </div>
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={`Paste an AI-generated answer here...\n\nExample: Python 3.12 was released in October 2023. React 19 was released in 2024. The latest iPhone costs $799...`}
                    maxLength={12000}
                    aria-label="Answer to verify"
                  />
                  <div className="input-bottom">
                    <span><span className="input-dot" /> {answer.length.toLocaleString()} / 12,000 characters</span>
                    <div className="input-tools">
                      <button className="text-action" onClick={() => { setAnswer(SAMPLE_ANSWER); setError(""); }}><Sparkles size={13} /> Try sample</button>
                      <button className="text-action" onClick={() => { setAnswer(""); setError(""); }} disabled={!answer}><X size={13} /> Clear</button>
                    </div>
                  </div>

                  {error && <div className="error-message"><CircleAlert size={15} /> {error}</div>}

                  <div className="analyze-row">
                    <div className="analyze-note"><Zap size={14} /> AI claim extraction + Bifrost + Tavily live research</div>
                    <button
                      className="primary-button analyze-button"
                      onClick={() => void verifyAnswer()}
                      disabled={isVerifying || answer.trim().length < 10}
                    >
                      {isVerifying ? (
                        <><LoaderCircle className="spin" size={16} /> Analysing...</>
                      ) : (
                        <><ShieldCheck size={16} /> Verify answer <ArrowUpRight size={15} /></>
                      )}
                    </button>
                  </div>
                  {isVerifying && (
                    <div className="progress-panel">
                      <div className="progress-orb"><LoaderCircle className="spin" size={20} /></div>
                      <div><strong>Investigating factual claims</strong><p>Extracting claims, searching live sources, and evaluating the evidence.</p></div>
                      <span className="progress-tag">IN PROGRESS</span>
                    </div>
                  )}
                  <p className="privacy-note">Avoid pasting passwords, private keys, or sensitive personal information.</p>
                </div>

                <div className="studio-side">
                  <div className="panel process-panel">
                    <div className="eyebrow">WHAT HAPPENS NEXT</div>
                    <div className="process-step"><span>01</span><div><strong>Extract factual claims</strong><small>Find independently verifiable statements</small></div><FileSearch size={17} /></div>
                    <div className="process-step"><span>02</span><div><strong>Research the web</strong><small>Retrieve relevant current sources</small></div><Globe2 size={17} /></div>
                    <div className="process-step"><span>03</span><div><strong>Evaluate freshness</strong><small>Assess support and time sensitivity</small></div><BadgeCheck size={17} /></div>
                  </div>
                  <div className="panel integration-panel">
                    <div className="eyebrow">INTEGRATED SERVICES</div>
                    <div className="integration-row"><span className="integration-icon violet"><Sparkles size={15} /></span><div><strong>Bifrost + Gemini</strong><small>Claim extraction and AI evaluation</small></div><span className="integration-state">AI</span></div>
                    <div className="integration-row"><span className="integration-icon cyan"><Globe2 size={15} /></span><div><strong>Tavily Search</strong><small>Live web evidence retrieval</small></div><span className="integration-state">WEB</span></div>
                  </div>
                </div>
              </div>

              {latestReport && (
                <section className="studio-results" id="studio-latest-results">
                  <div className="studio-results-heading">
                    <div>
                      <div className="eyebrow"><span className="eyebrow-line" /> LATEST VERIFICATION</div>
                      <h3>Your evidence is <span>ready.</span></h3>
                      <p>Completed {formatDate(latestReport.created_at)} · {latestReport.total_claims} claims analysed</p>
                    </div>
                    <div className="studio-results-actions">
                      <button className="secondary-button compact-button" onClick={() => openReport(latestReport)}><FileCheck2 size={14} /> Full report</button>
                      <button className="primary-button compact-button" onClick={() => void reverifyReport(latestReport)} disabled={isReverifying || isVerifying}>
                        {isReverifying ? <><LoaderCircle className="spin" size={14} /> Re-verifying...</> : <><RefreshCw size={14} /> Re-verify & compare</>}
                      </button>
                    </div>
                  </div>

                  {reverifyError && <div className="error-message comparison-error"><CircleAlert size={15} /> {reverifyError}</div>}

                  <div className="studio-results-metrics">
                    <div><span>TRUST SCORE</span><strong>{getReportScores(latestReport.verified_claims).trust}<small>/100</small></strong></div>
                    <div><span>FRESHNESS</span><strong>{getReportScores(latestReport.verified_claims).freshness}%</strong></div>
                    <div><span>SUPPORTED</span><strong>{getReportScores(latestReport.verified_claims).supported}</strong></div>
                    <div><span>STALE</span><strong>{getReportScores(latestReport.verified_claims).outdated}</strong></div>
                  </div>

                  {latestComparison && renderComparisonPanel(latestComparison, true)}

                  <div className="studio-claims-heading"><div><strong>Claim-by-claim results</strong><span>SELECT A CLAIM TO VIEW ITS EVIDENCE</span></div><span className="evidence-label"><Globe2 size={13} /> LIVE EVIDENCE</span></div>
                  {latestReport.verified_claims.length ? (
                    <div className="claims-list">
                      {latestReport.verified_claims.map((claim, index) => {
                        const sources = Array.isArray(claim.sources) ? claim.sources : [];
                        const expanded = expandedClaims.includes(index);
                        return (
                          <article className={`claim-card ${expanded ? "claim-expanded" : ""}`} key={`${latestReport.id}-studio-${index}`}>
                            <button className="claim-toggle" onClick={() => toggleClaim(index)} aria-expanded={expanded}>
                              <span className="claim-index">{String(index + 1).padStart(2, "0")}</span>
                              <span className="claim-main">
                                <span className="claim-topline">
                                  <span className="claim-category">{claim.category || "GENERAL"}</span>
                                  <span className={`freshness-tag ${claim.freshness}`}>{freshnessLabel(claim.freshness)}</span>
                                  <span className={`verdict verdict-${claim.verdict}`}><i />{verdictLabel(claim.verdict)}</span>
                                </span>
                                <strong className="claim-title">{claim.claim}</strong>
                                <span className="claim-preview">{claim.explanation || "Select this claim to inspect its evidence."}</span>
                                <span className="claim-bottom"><span><BookOpen size={13} /> {sources.length} source{sources.length === 1 ? "" : "s"}</span><span>TIME SENSITIVITY: {claim.temporal_sensitivity || "UNKNOWN"}</span></span>
                              </span>
                              <span className="claim-score"><strong>{freshnessScore(claim.freshness)}</strong><small>FRESHNESS</small><ChevronDown size={15} /></span>
                            </button>
                            {expanded && (
                              <div className="claim-details">
                                <div className="claim-explanation"><strong>Analysis</strong><p>{claim.explanation || "No explanation was provided."}</p></div>
                                {claim.search_error && <div className="source-warning"><CircleAlert size={13} /> Some source research could not be completed.</div>}
                                <div className="expanded-sources-heading"><strong>Evidence sources</strong><span>{sources.length} FOUND</span></div>
                                {sources.length ? (
                                  <div className="sources-list">
                                    {sources.map((source, sourceIndex) => {
                                      const url = safeUrl(source.url);
                                      return (
                                        <div className="source-link" key={`${latestReport.id}-${index}-${sourceIndex}`}>
                                          <span className="source-number">{sourceIndex + 1}</span>
                                          <div className="source-text"><strong>{source.title || "Untitled source"}</strong><small>{url || "Source URL unavailable"}</small>{source.published_date && <small>Published: {source.published_date}</small>}</div>
                                          <div className="source-actions">
                                            {url && <button className="source-icon-button" title="Copy source URL" onClick={() => void copyText(url, "Source URL copied!")}><Copy size={13} /></button>}
                                            {url ? <a className="source-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title || "source"}`}><ExternalLink size={14} /></a> : <span className="source-unavailable" title="No valid source URL"><CircleAlert size={14} /></span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : <p className="no-sources">No source links were returned for this claim.</p>}
                                <button className="text-action copy-claim" onClick={() => void copyText(claim.claim, "Claim copied!")}><Copy size={13} /> Copy claim text</button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="history-empty"><div className="empty-icon"><FileSearch size={22} /></div><strong>No factual claims were extracted</strong><p>Try a longer answer containing specific factual statements.</p></div>
                  )}
                  <div className="report-disclaimer"><CircleAlert size={15} /> Scores are indicative heuristics, not probabilities of truth. Review source context before relying on important claims.</div>
                </section>
              )}

              <div className="studio-history-hint"><History size={14} /> Your completed reports are saved in <button onClick={() => navigate("history")}>History</button>. The latest claim details are also shown here in the Studio.</div>
            </section>
          )}

          {activeSection === "source-intelligence" && (
            <section className="workspace-section" id="source-intelligence">
              <div className="section-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> SOURCE QUALITY &amp; CROSS-CHECKING</div>
                  <h2>Source <span>intelligence.</span></h2>
                  <p>Explore the quality, context and consistency of the evidence behind each verified claim.</p>
                </div>
                <button className="primary-button compact-button" onClick={() => navigate("studio")}>
                  <Sparkles size={14} /> Verify an answer <ArrowUpRight size={14} />
                </button>
              </div>

              {reports.length > 0 && (
                <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
                  <div>
                    <div className="eyebrow">SELECT A VERIFICATION</div>
                    <strong style={{ display: "block", marginTop: "5px" }}>Choose which report to inspect</strong>
                    <p style={{ margin: "4px 0 0" }}>Source assessments are stored with each verification report.</p>
                  </div>
                  <select
                    className="sort-select"
                    value={sourceIntelligenceReport?.id ?? ""}
                    onChange={(event) => setSourceReportId(event.target.value)}
                    aria-label="Choose a verification report for Source Intelligence"
                  >
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {formatDate(report.created_at)} · {report.total_claims} claims · {report.answer.slice(0, 55)}{report.answer.length > 55 ? "…" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!sourceIntelligenceReport ? (
                <div className="history-empty">
                  <div className="empty-icon"><ShieldCheck size={22} /></div>
                  <strong>No source intelligence yet</strong>
                  <p>Run a verification first. VeriSync will assess the sources retrieved for each factual claim.</p>
                  <button className="primary-button compact-button" onClick={() => navigate("studio")}>
                    <Sparkles size={14} /> Open verification studio
                  </button>
                </div>
              ) : (
                <>
                  <div className="report-meta">
                    <div><span className="report-meta-label">REPORT SELECTED</span><strong>{formatDate(sourceIntelligenceReport.created_at)}</strong></div>
                    <div><span className="report-meta-label">CLAIMS ANALYSED</span><strong>{sourceIntelligenceReport.total_claims}</strong></div>
                    <div><span className="report-meta-label">SOURCE ASSESSMENTS</span><strong>{sourceIntelligenceReport.verified_claims.filter((claim) => Boolean(claim.source_intelligence)).length}</strong></div>
                  </div>

                  <div className="original-answer panel">
                    <div className="panel-heading">
                      <div><div className="eyebrow">ANALYSED ANSWER</div><h2>Original answer</h2></div>
                      <button className="icon-button" title="Copy original answer" onClick={() => void copyText(sourceIntelligenceReport.answer)}><Copy size={15} /></button>
                    </div>
                    <p>{sourceIntelligenceReport.answer}</p>
                  </div>

                  <div className="claims-header">
                    <div><strong>Source assessments by claim</strong><span>{sourceIntelligenceReport.verified_claims.length} CLAIMS · SOURCE QUALITY REVIEW</span></div>
                    <div className="evidence-label"><ShieldCheck size={13} /> SOURCE INTELLIGENCE</div>
                  </div>

                  {sourceIntelligenceReport.verified_claims.length ? (
                    <div className="claims-list">
                      {sourceIntelligenceReport.verified_claims.map((claim, index) => (
                        <article className="claim-card claim-expanded" key={`${sourceIntelligenceReport.id}-source-intel-${index}`}>
                          <div className="claim-details">
                            <div className="claim-topline">
                              <span className="claim-category">{claim.category || "GENERAL"}</span>
                              <span className={`freshness-tag ${claim.freshness}`}>{freshnessLabel(claim.freshness)}</span>
                              <span className={`verdict verdict-${claim.verdict}`}><i />{verdictLabel(claim.verdict)}</span>
                            </div>
                            <div className="claim-explanation">
                              <strong>{String(index + 1).padStart(2, "0")} · {claim.claim}</strong>
                              <p>{claim.explanation || "No claim explanation was provided."}</p>
                            </div>
                            {claim.source_intelligence ? (
                              <SourceIntelligence data={claim.source_intelligence} />
                            ) : (
                              <div className="source-warning source-intelligence-unavailable">
                                <CircleAlert size={13} /> This report does not contain a Source Intelligence assessment for this claim. Run Re-verify &amp; compare to generate a fresh source assessment.
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="history-empty"><div className="empty-icon"><FileSearch size={22} /></div><strong>No factual claims were extracted</strong><p>There are no source assessments to display for this report.</p></div>
                  )}
                  <div className="report-disclaimer"><CircleAlert size={15} /> Source authority and evidence assessments are AI-assisted signals. Review original sources and their context before relying on important claims.</div>
                </>
              )}
            </section>
          )}

          {activeSection === "results" && activeReport && (
            <section className="workspace-section results-section" id="results">
              <div className="section-heading report-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> INTELLIGENCE REPORT</div>
                  <h2>Evidence <span>breakdown.</span></h2>
                  <p>Generated {formatDate(activeReport.created_at)} · {activeReport.total_claims} claims detected</p>
                </div>
                <div className="report-actions">
                  <button className="primary-button compact-button" onClick={() => void reverifyReport(activeReport)} disabled={isReverifying || isVerifying}>
                    {isReverifying ? <><LoaderCircle className="spin" size={14} /> Re-verifying...</> : <><RefreshCw size={14} /> Re-verify & compare</>}
                  </button>
                  <button className="secondary-button compact-button" onClick={() => void copyText(reportAsText(activeReport), "Report copied!")}><Copy size={14} /> Copy report</button>
                  <button className="secondary-button compact-button" onClick={printReport}><Printer size={14} /> Print</button>
                  <button className="primary-button compact-button" onClick={() => downloadPdf(activeReport)}><FileCheck2 size={14} /> Download PDF</button>
                </div>
              </div>

              <div className="report-meta">
                <div><span className="report-meta-label">REPORT GENERATED</span><strong>{formatDate(activeReport.created_at)}</strong></div>
                <div className="report-meta-right"><span className="report-meta-label">CLAIMS DETECTED</span><strong>{activeReport.total_claims}</strong></div>
              </div>

              {activeComparison && renderComparisonPanel(activeComparison)}
              {reverifyError && <div className="error-message comparison-error"><CircleAlert size={15} /> {reverifyError}</div>}

              <div className="report-overview">
                <div className="score-panel">
                  <div className="score-label">OVERALL TRUST SCORE</div>
                  <div className="score-number">{getReportScores(activeReport.verified_claims).trust}<span>/100</span></div>
                  <div className="score-track"><div style={{ width: `${getReportScores(activeReport.verified_claims).trust}%` }} /></div>
                  <div className="score-caption">Combines freshness and evidence quality. This is an indicative heuristic, not a probability of truth.</div>
                </div>
                <div className="report-metric"><span>FRESHNESS SCORE</span><strong>{getReportScores(activeReport.verified_claims).freshness}%</strong><small>Time-related currency</small></div>
                <div className="report-metric"><span>SUPPORTED CLAIMS</span><strong>{getReportScores(activeReport.verified_claims).supported}</strong><small>Supported by retrieved evidence</small></div>
                <div className="report-metric"><span>STALE CLAIMS</span><strong>{getReportScores(activeReport.verified_claims).outdated}</strong><small>Outdated or potentially outdated</small></div>
              </div>

              <div className="original-answer panel">
                <div className="panel-heading"><div><div className="eyebrow">SOURCE TEXT</div><h2>Original answer</h2></div><button className="icon-button" title="Copy original answer" onClick={() => void copyText(activeReport.answer)}><Copy size={15} /></button></div>
                <p>{activeReport.answer}</p>
              </div>

              <div className="claims-header">
                <div><strong>Claim-by-claim analysis</strong><span>{activeReport.verified_claims.length} ITEMS · CLICK TO EXPAND</span></div>
                <div className="evidence-label"><Globe2 size={13} /> LIVE EVIDENCE</div>
              </div>

              {activeReport.verified_claims.length ? (
                <div className="claims-list">
                  {activeReport.verified_claims.map((claim, index) => {
                    const sources = Array.isArray(claim.sources) ? claim.sources : [];
                    const expanded = expandedClaims.includes(index);
                    return (
                      <article className={`claim-card ${expanded ? "claim-expanded" : ""}`} key={`${activeReport.id}-${index}`}>
                        <button className="claim-toggle" onClick={() => toggleClaim(index)} aria-expanded={expanded}>
                          <span className="claim-index">{String(index + 1).padStart(2, "0")}</span>
                          <span className="claim-main">
                            <span className="claim-topline">
                              <span className="claim-category">{claim.category || "GENERAL"}</span>
                              <span className={`freshness-tag ${claim.freshness}`}>{freshnessLabel(claim.freshness)}</span>
                              <span className={`verdict verdict-${claim.verdict}`}><i />{verdictLabel(claim.verdict)}</span>
                            </span>
                            <strong className="claim-title">{claim.claim}</strong>
                            <span className="claim-preview">{claim.explanation || "Select this claim to inspect its evidence."}</span>
                            <span className="claim-bottom"><span><BookOpen size={13} /> {sources.length} source{sources.length === 1 ? "" : "s"}</span><span>TIME SENSITIVITY: {claim.temporal_sensitivity || "UNKNOWN"}</span></span>
                          </span>
                          <span className="claim-score"><strong>{freshnessScore(claim.freshness)}</strong><small>FRESHNESS</small><ChevronDown size={15} /></span>
                        </button>

                        {expanded && (
                          <div className="claim-details">
                            <div className="claim-explanation"><strong>Analysis</strong><p>{claim.explanation || "No explanation was provided."}</p></div>
                            {claim.search_error && <div className="source-warning"><CircleAlert size={13} /> Some source research could not be completed.</div>}
                            <div className="expanded-sources-heading"><strong>Evidence sources</strong><span>{sources.length} FOUND</span></div>
                            {sources.length ? (
                              <div className="sources-list">
                                {sources.map((source, sourceIndex) => {
                                  const url = safeUrl(source.url);
                                  return (
                                    <div className="source-link" key={`${index}-${sourceIndex}`}>
                                      <span className="source-number">{sourceIndex + 1}</span>
                                      <div className="source-text">
                                        <strong>{source.title || "Untitled source"}</strong>
                                        <small>{url || "Source URL unavailable"}</small>
                                        {source.published_date && <small>Published: {source.published_date}</small>}
                                      </div>
                                      <div className="source-actions">
                                        {url && <button className="source-icon-button" title="Copy source URL" onClick={() => void copyText(url, "Source URL copied!")}><Copy size={13} /></button>}
                                        {url ? <a className="source-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title || "source"}`}><ExternalLink size={14} /></a> : <span className="source-unavailable" title="No valid source URL"><CircleAlert size={14} /></span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="no-sources">No source links were returned for this claim.</p>
                            )}
                            <button className="text-action copy-claim" onClick={() => void copyText(claim.claim, "Claim copied!")}><Copy size={13} /> Copy claim text</button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="history-empty"><div className="empty-icon"><FileSearch size={22} /></div><strong>No factual claims were extracted</strong><p>Try a longer answer containing specific factual statements.</p></div>
              )}

              <div className="report-disclaimer"><CircleAlert size={15} /> VeriSync provides evidence-based assistance, not a guarantee of truth. Check source context and publication dates before relying on important claims.</div>
            </section>
          )}

          {activeSection === "results" && !activeReport && (
            <section className="empty-report">
              <div className="empty-icon"><FileCheck2 size={24} /></div>
              <strong>Your evidence report will appear here</strong>
              <p>Open a saved report from History to inspect its claims and sources.</p>
              <button className="secondary-button compact-button" onClick={() => navigate("history")}>Go to history <ArrowRight size={13} /></button>
            </section>
          )}

          {activeSection === "history" && (
            <section className="history-section" id="history">
              <div className="section-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR RESEARCH TRAIL</div>
                  <h2>Recent <span>verifications.</span></h2>
                  <p>Your reports are saved locally in this browser and remain available after refreshing the page.</p>
                </div>
                {reports.length > 0 && <button className="text-action clear-history" onClick={clearHistory}><Trash2 size={13} /> Clear history</button>}
              </div>

              <div className="history-toolbar">
                <div className="history-search"><Search size={15} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search your verification history..." /><button onClick={() => setHistorySearch("")} disabled={!historySearch} aria-label="Clear search"><X size={13} /></button></div>
                <div className="history-controls">
                  <div className="filter-tabs">
                    {([ ["all", "All"], ["supported", "Supported"], ["contradicted", "Contradicted"], ["outdated", "Outdated"] ] as [Filter, string][]).map(([value, label]) => (
                      <button key={value} className={historyFilter === value ? "filter-active" : ""} onClick={() => setHistoryFilter(value)}>{label}</button>
                    ))}
                  </div>
                  <select className="sort-select" value={historySort} onChange={(event) => setHistorySort(event.target.value as SortOrder)} aria-label="Sort history">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="trust">Highest trust</option>
                  </select>
                </div>
              </div>

              {!hydrated ? (
                <div className="history-empty"><LoaderCircle className="spin" size={22} /><strong>Loading your history...</strong></div>
              ) : filteredReports.length === 0 ? (
                <div className="history-empty">
                  <div className="empty-icon"><History size={22} /></div>
                  <strong>{reports.length ? "No matching reports" : "No verifications yet"}</strong>
                  <p>{reports.length ? "Try changing your search or filter." : "Your completed verification reports will appear here."}</p>
                  {reports.length === 0 && <button className="secondary-button compact-button" onClick={() => navigate("studio")}><Plus size={13} /> Create first report</button>}
                </div>
              ) : (
                <div className="history-list">
                  {filteredReports.map((report) => {
                    const scores = getReportScores(report.verified_claims);
                    return (
                      <div className="history-row" key={report.id}>
                        <div className="history-file"><FileCheck2 size={17} /></div>
                        <div className="history-details">
                          <strong>{report.answer}</strong>
                          {report.verification_type === "reverification" && (
                            <span className="comparison-badge history-comparison-badge">
                              <RefreshCw size={11} /> COMPARED
                            </span>
                          )}
                          <span>{formatDate(report.created_at)} <i /> {report.total_claims} claims</span>
                          <div className="history-indicators"><span>{report.verified_claims.length} claims</span><span>{scores.freshness}% freshness</span><span>{scores.outdated} stale</span></div>
                        </div>
                        <div className="history-score"><strong>{scores.trust}%</strong><span>TRUST</span></div>
                        <button className="history-open" onClick={() => openReport(report)}>Open <ArrowUpRight size={13} /></button>
                        <button className="history-delete" title="Delete report" onClick={() => deleteReport(report.id)}><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <footer className="footer">
            <div className="footer-brand"><div className="brand-symbol small-brand"><Fingerprint size={16} /></div> Veri<span>Sync</span> AI</div>
            <p>Stay current. Stay certain. Verify before you trust.</p>
            <div className="footer-right"><span><span className="pulse-dot" /> EVIDENCE-DRIVEN INTELLIGENCE</span><span>VERISYNC AI © 2026</span></div>
          </footer>
        </div>
      </div>

      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </main>
  );
}
