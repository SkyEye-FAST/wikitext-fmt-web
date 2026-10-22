import { AlertCircle, AlertTriangle, Info, MapPin } from "lucide-react";
import type { FormatDetailedResult } from "wikitext-fmt/browser";

import {
  clientErrorMessageKey,
  type FormatStatus,
  summarizeRuleDiagnostics,
} from "../formatter/resultSummary.js";
import type { MessageCatalog } from "../i18n/types.js";
import { useI18n } from "../i18n/useI18n.js";

interface DiagnosticsPanelProps {
  result?: FormatDetailedResult;
  status: FormatStatus;
  notice?: keyof MessageCatalog;
  onGoToLine?: (line: number) => void;
}

export function DiagnosticsPanel({
  result,
  status,
  notice,
  onGoToLine,
}: DiagnosticsPanelProps) {
  const { t } = useI18n();
  const rows = result ? summarizeRuleDiagnostics(result, t) : [];
  const failure = result?.failure;
  const unexpectedError =
    status.kind === "error"
      ? t(status.messageKey ?? clientErrorMessageKey(status.code))
      : undefined;
  const warning = result?.warning;

  return (
    <section
      className="diagnostics-panel syntax-spine"
      aria-labelledby="diagnostics-title"
    >
      <header>
        <h2 id="diagnostics-title">{t("diagnostics.title")}</h2>
        <span>{t("diagnostics.entries", { count: rows.length })}</span>
      </header>
      <div
        className="diagnostic-content"
        aria-label={t("diagnostics.aria")}
        tabIndex={0}
      >
        {failure ? (
          <div className="diagnostic-callout failure-callout" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div>
              <strong>{failure.code}</strong>
              {failure.stage ? (
                <span className="diagnostic-stage">
                  {t("diagnostics.stage")}: {failure.stage}
                </span>
              ) : null}
              <p>{failure.message}</p>
            </div>
          </div>
        ) : null}
        {unexpectedError ? (
          <div className="diagnostic-callout failure-callout" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <p>{unexpectedError}</p>
          </div>
        ) : null}
        {warning ? (
          <div className="diagnostic-callout warning-callout" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>{warning}</p>
          </div>
        ) : null}
        {notice ? (
          <div className="diagnostic-callout warning-callout" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>{t(notice)}</p>
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className="diagnostic-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("diagnostics.table.rule")}</th>
                  <th>{t("diagnostics.table.severity")}</th>
                  <th>{t("diagnostics.table.location")}</th>
                  <th>{t("diagnostics.table.message")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.rule}-${index}`}
                    className={
                      row.line !== undefined && onGoToLine
                        ? "has-location"
                        : undefined
                    }
                    onClick={
                      row.line !== undefined && onGoToLine
                        ? (event) => {
                            if (
                              !(event.target as HTMLElement).closest("button")
                            ) {
                              onGoToLine(row.line!);
                            }
                          }
                        : undefined
                    }
                  >
                    <td>
                      <code>{row.rule}</code>
                    </td>
                    <td>
                      {row.severity === "warning" ? (
                        <AlertTriangle size={15} aria-hidden="true" />
                      ) : (
                        <Info size={15} aria-hidden="true" />
                      )}{" "}
                      {t(
                        row.severity === "warning"
                          ? "diagnostics.severity.warning"
                          : "diagnostics.severity.info",
                      )}
                    </td>
                    <td>
                      {row.line !== undefined && onGoToLine ? (
                        <button
                          type="button"
                          className="diagnostic-goto-btn"
                          title={t("diagnostics.goto", { line: row.line })}
                          aria-label={t("diagnostics.goto", { line: row.line })}
                          onClick={() => onGoToLine(row.line!)}
                        >
                          <MapPin size={13} aria-hidden="true" />
                          <span>{row.line}</span>
                        </button>
                      ) : row.line !== undefined ? (
                        <span>{row.line}</span>
                      ) : (
                        <span
                          className="diagnostic-no-location"
                          aria-hidden="true"
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !failure && !unexpectedError && !warning && !notice ? (
          <p className="empty-diagnostics">{t("diagnostics.empty")}</p>
        ) : null}
      </div>
    </section>
  );
}
