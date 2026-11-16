
import type { SourceIntelSource } from "./SourceCard";

export interface CrossSourceSummary {
  agreement_status?: string;
  summary?: string;
  explanation?: string;
  total_sources?: number;
  supporting_sources?: number;
  contradicting_sources?: number;
  mixed_sources?: number;
  insufficient_sources?: number;
  independent_domains?: number;
  distinct_domains?: number;
  [key: string]: unknown;
}

interface EvidenceAgreementProps {
  sources: SourceIntelSource[];
  summary?: CrossSourceSummary | null;
}

function normalizeStance(stance?: string | null) {
  return (stance || "insufficient_evidence")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getUniqueDomains(sources: SourceIntelSource[]) {
  const domains = sources
    .map((source) => {
      if (source.domain) return source.domain.toLowerCase();

      try {
        return source.url ? new URL(source.url).hostname.toLowerCase() : null;
      } catch {
        return null;
      }
    })
    .filter((domain): domain is string => Boolean(domain));

  return new Set(domains).size;
}

function formatLabel(value?: string) {
  if (!value) return "No clear consensus";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EvidenceAgreement({
  sources,
  summary,
}: EvidenceAgreementProps) {
  const supporting = sources.filter((source) =>
    ["supports", "support"].includes(normalizeStance(source.stance))
  ).length;

  const contradicting = sources.filter((source) =>
    ["contradicts", "contradict"].includes(normalizeStance(source.stance))
  ).length;

  const mixed = sources.filter((source) =>
    ["mixed"].includes(normalizeStance(source.stance))
  ).length;

  const insufficient = sources.filter((source) =>
    ["insufficient_evidence", "unknown"].includes(
      normalizeStance(source.stance)
    )
  ).length;

  const mentioning = sources.filter((source) =>
    ["mentions", "mention"].includes(normalizeStance(source.stance))
  ).length;

  const total = sources.length;
  const domains = getUniqueDomains(sources);

  const backendStatus =
    typeof summary?.agreement_status === "string"
      ? summary.agreement_status
      : "";

  const agreementStatus =
    backendStatus ||
    (total === 0
      ? "No sources available"
      : supporting > 0 && contradicting > 0
        ? "Conflicting evidence"
        : supporting > 0 && contradicting === 0
          ? "Evidence generally supports the claim"
          : contradicting > 0 && supporting === 0
            ? "Evidence generally contradicts the claim"
            : "No clear consensus");

  const description =
    (typeof summary?.summary === "string" && summary.summary) ||
    (typeof summary?.explanation === "string" && summary.explanation) ||
    "The summary is based on the evidence assessments returned for the retrieved sources.";

  const stats = [
    { label: "Supporting", count: supporting, className: "support" },
    { label: "Contradicting", count: contradicting, className: "contradict" },
    { label: "Mixed", count: mixed, className: "mixed" },
    { label: "Insufficient", count: insufficient, className: "insufficient" },
    { label: "Mentions only", count: mentioning, className: "mention" },
  ];

  return (
    <section className="si-agreement">
      <div className="si-agreement-header">
        <div>
          <span className="si-section-label">CROSS-SOURCE ANALYSIS</span>
          <h3>Evidence Agreement</h3>
          <p>
            How do the retrieved sources align with one another?
          </p>
        </div>

        <div className="si-agreement-total">
          <strong>{total}</strong>
          <span>Sources</span>
        </div>
      </div>

      <div className="si-agreement-status">
        <span className="si-status-indicator" />
        <div>
          <span className="si-section-label">OVERALL ASSESSMENT</span>
          <strong>{formatLabel(agreementStatus)}</strong>
        </div>
      </div>

      <div className="si-agreement-stats">
        {stats.map((stat) => (
          <div
            className={`si-agreement-stat si-stat-${stat.className}`}
            key={stat.label}
          >
            <strong>{stat.count}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="si-agreement-bar" aria-label="Evidence distribution">
        {total > 0 && stats.map((stat) =>
          stat.count > 0 ? (
            <div
              key={stat.label}
              className={`si-bar-segment si-bar-${stat.className}`}
              style={{ width: `${(stat.count / total) * 100}%` }}
              title={`${stat.label}: ${stat.count}`}
            />
          ) : null
        )}
      </div>

      <div className="si-domain-info">
        <div>
          <span className="si-section-label">DISTINCT DOMAINS</span>
          <strong>{domains}</strong>
        </div>

        <p>
          Different domains do not necessarily represent independently owned
          sources. Domain diversity alone cannot establish independent
          verification.
        </p>
      </div>

      <div className="si-agreement-explanation">
        <span className="si-section-label">ANALYSIS SUMMARY</span>
        <p>{description}</p>
      </div>
    </section>
  );
}
