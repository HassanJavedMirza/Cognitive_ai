import { useEffect, useMemo, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
import "./SessionSummary.css";

const SessionSummary = ({ sessionId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, [sessionId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/session_summary/${sessionId}`
      );
      if (!res.ok) throw new Error("Failed to load session summary");
      setSummary(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const derived = useMemo(() => {
    if (!summary) return null;

    const highLoad =
      (summary.cognitive_load_distribution?.high || 0) +
      (summary.cognitive_load_distribution?.["very high"] || 0);

    const verdict =
      summary.engagement_score >= 75
        ? "Excellent"
        : summary.engagement_score >= 50
          ? "Average"
          : "Needs Improvement";

    return { highLoad, verdict };
  }, [summary]);

  if (loading) return <div className="summary-loading">Loading summary...</div>;
  if (error) return <div className="summary-error">{error}</div>;
  if (!summary) return null;

  return (
    <div className="session-summary">
      {/* Header */}
      <header className="summary-header">
        <h2>Session Summary</h2>
        <span className={`verdict ${derived.verdict}`}>
          {derived.verdict}
        </span>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard label="Duration" value={summary.duration_formatted} />
        <SummaryCard
          label="Engagement Score"
          value={`${summary.engagement_score} / 100`}
        />
        <SummaryCard
          label="Attention Dips"
          value={summary.attention_dips_count}
        />
        <SummaryCard
          label="High Cognitive Load"
          value={`${derived.highLoad.toFixed(1)}%`}
        />
      </div>

      {/* Cognitive Load Table */}
      <Section title="Cognitive Load Distribution">
        <Table
          headers={["Label", "Occurrences (%)", "Time Spent"]}
          rows={Object.entries(summary.cognitive_load_distribution).map(
            ([label, percent]) => {
              const seconds = (percent / 100) * summary.duration_seconds;
              return [
                capitalize(label),
                `${percent.toFixed(1)}%`,
                formatTime(seconds),
              ];
            }
          )}
        />
      </Section>

      {/* Brainwave Dominance Table */}
      {summary.brainwave_dominance_over_time && (
        <Section title="Dominant Brainwaves Over Time">
          <Table
            headers={["Time Window", "Dominant Wave", "Mean Amplitude (µV)"]}
            rows={summary.brainwave_dominance_over_time.map((row) => [
              `${formatTime(row.start)} - ${formatTime(row.end)}`,
              capitalize(row.band),
              row.mean.toFixed(2),
            ])}
          />
        </Section>
      )}

      {/* Actions */}
      <div className="summary-actions">
        <button onClick={fetchSummary}>Refresh</button>
        <button
          onClick={() =>
            window.open(
              `/api/export/session_report/${sessionId}?format=pdf`
            )
          }
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

/* ---------- Reusable Components ---------- */

const SummaryCard = ({ label, value }) => (
  <div className="summary-card">
    <span className="label">{label}</span>
    <span className="value">{value}</span>
  </div>
);

const Section = ({ title, children }) => (
  <section className="summary-section">
    <h3>{title}</h3>
    {children}
  </section>
);

const Table = ({ headers, rows }) => (
  <table className="summary-table">
    <thead>
      <tr>
        {headers.map((h) => (
          <th key={h}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/* ---------- Helpers ---------- */

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

const capitalize = (text) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default SessionSummary;
