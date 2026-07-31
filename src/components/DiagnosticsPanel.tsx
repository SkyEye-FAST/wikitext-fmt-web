import type { FormatDetailedResult } from "wikitext-fmt/browser";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { summarizeRuleDiagnostics, type FormatStatus } from "../formatter/resultSummary.js";

interface DiagnosticsPanelProps {
  result?: FormatDetailedResult;
  status: FormatStatus;
  notice?: string;
}

export function DiagnosticsPanel({ result, status, notice }: DiagnosticsPanelProps) {
  const rows = result ? summarizeRuleDiagnostics(result) : [];
  const failure = status.kind === "failure" ? status.failure : undefined;
  const unexpectedError = status.kind === "error" ? status.message : undefined;
  const warning = result?.warning;

  return (
    <section className="diagnostics-panel syntax-spine" aria-labelledby="diagnostics-title">
      <header>
        <h2 id="diagnostics-title">Diagnostics</h2>
        <span>{rows.length} rule {rows.length === 1 ? "entry" : "entries"}</span>
      </header>
      <div className="diagnostic-content">
        {failure ? (
          <div className="diagnostic-callout failure-callout" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div>
              <strong>{failure.code}</strong>
              {failure.stage ? <span className="diagnostic-stage">Stage: {failure.stage}</span> : null}
              <p>{failure.message}</p>
            </div>
          </div>
        ) : null}
        {unexpectedError ? (
          <div className="diagnostic-callout failure-callout" role="alert">
            <AlertCircle size={18} aria-hidden="true" /><p>{unexpectedError}</p>
          </div>
        ) : null}
        {warning ? (
          <div className="diagnostic-callout warning-callout" role="status">
            <AlertTriangle size={18} aria-hidden="true" /><p>{warning}</p>
          </div>
        ) : null}
        {notice ? (
          <div className="diagnostic-callout warning-callout" role="status">
            <AlertTriangle size={18} aria-hidden="true" /><p>{notice}</p>
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className="diagnostic-table-wrap">
            <table>
              <thead><tr><th>Rule</th><th>Severity</th><th>Message</th></tr></thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.rule}-${index}`}>
                    <td><code>{row.rule}</code></td>
                    <td>{row.severity === "warning" ? <AlertTriangle size={15} /> : <Info size={15} />} {row.severity}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !failure && !unexpectedError && !warning && !notice ? (
          <p className="empty-diagnostics">No failures, warnings, or rule diagnostics for the latest result.</p>
        ) : null}
      </div>
    </section>
  );
}
