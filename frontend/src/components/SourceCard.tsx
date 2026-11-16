

export interface SourceIntelSource {
  source_id?: string | number;
  title?: string | null;
  url?: string | null;
  domain?: string | null;
  content_excerpt?: string | null;
  published_date?: string | null;
  updated_date?: string | null;
  date_status?: string | null;
  search_relevance_score?: number | null;
  source_type?: string | null;
  authority?: string | null;
  authority_reason?: string | null;
  relevance?: string | null;
  relevance_reason?: string | null;
  stance?: string | null;
  evidence_reason?: string | null;
  limitations?: string | string[] | null;
  independence_status?: string | null;
}

interface SourceCardProps {
  source: SourceIntelSource;
  index: number;
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getScore(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return null;
  }

  return Math.round(score <= 1 ? score * 100 : score);
}

function getSafeUrl(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function getLimitations(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  return [value];
}

export default function SourceCard({
  source,
  index,
}: SourceCardProps) {
  const safeUrl = getSafeUrl(source.url);
  const score = getScore(source.search_relevance_score);
  const limitations = getLimitations(source.limitations);

  const authority = (source.authority || "unknown").toLowerCase();
  const relevance = (source.relevance || "unknown").toLowerCase();
  const stance = (source.stance || "insufficient_evidence").toLowerCase();

  return (
    <article className="si-source-card">
      <div className="si-source-top">
        <div className="si-source-number">
          SOURCE {String(index + 1).padStart(2, "0")}
        </div>

        <span className={`si-badge si-authority-${authority}`}>
          {formatLabel(source.authority)} Authority
        </span>
      </div>

      <h3 className="si-source-title">
        {safeUrl ? (
          <a href={safeUrl} target="_blank" rel="noopener noreferrer">
            {source.title || source.domain || "Untitled Source"}
            <span className="si-external-icon"> ↗</span>
          </a>
        ) : (
          source.title || "Untitled Source"
        )}
      </h3>

      <div className="si-source-domain">
        {source.domain || "Unknown domain"}
        {source.source_type && (
          <span className="si-source-type">
            {formatLabel(source.source_type)}
          </span>
        )}
      </div>

      <div className="si-source-badges">
        <span className={`si-badge si-relevance-${relevance}`}>
          Relevance: {formatLabel(source.relevance)}
        </span>

        <span className={`si-badge si-stance-${stance}`}>
          {formatLabel(source.stance)}
        </span>

        {score !== null && (
          <span className="si-badge si-score">
            Search score: {score}%
          </span>
        )}
      </div>

      {source.content_excerpt && (
        <div className="si-source-section">
          <span className="si-section-label">SOURCE EXCERPT</span>
          <p className="si-source-excerpt">
            {source.content_excerpt}
          </p>
        </div>
      )}

      <div className="si-source-section">
        <span className="si-section-label">AUTHORITY ASSESSMENT</span>
        <p>{source.authority_reason || "No authority explanation available."}</p>
      </div>

      <div className="si-source-section">
        <span className="si-section-label">RELEVANCE ASSESSMENT</span>
        <p>{source.relevance_reason || "No relevance explanation available."}</p>
      </div>

      <div className="si-source-section">
        <span className="si-section-label">EVIDENCE ASSESSMENT</span>
        <p>{source.evidence_reason || "No evidence explanation available."}</p>
      </div>

      <div className="si-source-metadata">
        <div>
          <span className="si-section-label">PUBLISHED</span>
          <span>{source.published_date || "Date unavailable"}</span>
        </div>

        <div>
          <span className="si-section-label">UPDATED</span>
          <span>{source.updated_date || "Not available"}</span>
        </div>

        <div>
          <span className="si-section-label">DATE STATUS</span>
          <span>{formatLabel(source.date_status)}</span>
        </div>
      </div>

      {source.independence_status && (
        <div className="si-independence">
          <span className="si-section-label">SOURCE INDEPENDENCE</span>
          <p>{formatLabel(source.independence_status)}</p>
        </div>
      )}

      {limitations.length > 0 && (
        <div className="si-limitations">
          <span className="si-section-label">POTENTIAL LIMITATIONS</span>

          {limitations.map((limitation, i) => (
            <p key={`${i}-${limitation}`}>• {limitation}</p>
          ))}
        </div>
      )}
    </article>
  );
}
