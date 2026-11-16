
import SourceCard, { type SourceIntelSource } from "./SourceCard";
import EvidenceAgreement, {
  type CrossSourceSummary,
} from "./EvidenceAgreement";

import "./SourceIntelligence.css";

export interface SourceIntelligenceData {
  analysis_status?: string;
  claim?: string;
  sources?: SourceIntelSource[];
  cross_source_summary?: CrossSourceSummary | null;
  summary?: string;
}

interface SourceIntelligenceProps {
  data?: SourceIntelligenceData | null;
}

function formatLabel(value?: string) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SourceIntelligence({
  data,
}: SourceIntelligenceProps) {
  if (!data) {
    return null;
  }

  const sources = Array.isArray(data.sources) ? data.sources : [];
  const status = (data.analysis_status || "unknown").toLowerCase();

  return (
    <section className="si-container">
      <div className="si-main-header">
        <div className="si-heading-icon">◈</div>

        <div className="si-heading-content">
          <div className="si-heading-overline">
            INTELLIGENCE LAYER
          </div>

          <h2>Source Intelligence</h2>

          <p>
            Evaluate source credibility, evidence relevance, freshness,
            and cross-source agreement.
          </p>
        </div>

        <span className={`si-analysis-status si-status-${status}`}>
          {formatLabel(status)}
        </span>
      </div>

      {data.claim && (
        <div className="si-claim-box">
          <span className="si-section-label">CLAIM UNDER ANALYSIS</span>
          <p>{data.claim}</p>
        </div>
      )}

      {data.summary && (
        <div className="si-summary">
          <span className="si-section-label">INTELLIGENCE SUMMARY</span>
          <p>{data.summary}</p>
        </div>
      )}

      {status === "fallback" && (
        <div className="si-fallback-notice">
          <strong>Limited source analysis</strong>
          <p>
            The detailed AI source assessment was unavailable. Available
            source information is displayed using fallback analysis.
          </p>
        </div>
      )}

      {sources.length > 0 ? (
        <>
          <div className="si-section-heading">
            <div>
              <span className="si-section-label">RETRIEVED EVIDENCE</span>
              <h3>Source Breakdown</h3>
            </div>

            <span className="si-source-count">
              {sources.length} {sources.length === 1 ? "Source" : "Sources"}
            </span>
          </div>

          <EvidenceAgreement
            sources={sources}
            summary={data.cross_source_summary}
          />

          <div className="si-sources-grid">
            {sources.map((source, index) => (
              <SourceCard
                key={source.source_id ?? `${source.url ?? "source"}-${index}`}
                source={source}
                index={index}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="si-empty">
          <div className="si-empty-icon">◎</div>
          <h3>No source evidence available</h3>
          <p>
            There were no sources available for this claim, so source
            authority and evidence agreement could not be assessed.
          </p>
        </div>
      )}

      <div className="si-disclaimer">
        <span>ⓘ</span>
        Source authority and evidence assessments are AI-generated
        interpretations of retrieved information. They should not be treated
        as definitive proof of truth or source independence.
      </div>
    </section>
  );
}
