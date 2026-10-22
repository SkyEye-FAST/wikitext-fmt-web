import { useId, useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDot,
  Clock3,
  CornerDownLeft,
  LoaderCircle,
  OctagonAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { FormatDetailedResult } from "wikitext-fmt/browser";

import { CORE_REPOSITORY_URL, FRONTEND_REPOSITORY_URL } from "../app/routes.js";
import {
  clientErrorMessageKey,
  failureMessageKey,
  type FormatStatus,
  summarizeRuleDiagnostics,
} from "../formatter/resultSummary.js";
import type { MessageCatalog } from "../i18n/types.js";
import { type I18n, useI18n } from "../i18n/useI18n.js";
import type { ShortcutLabels } from "../utils/platform.js";

interface ReportBarProps {
  status: FormatStatus;
  result?: FormatDetailedResult;
  changedLineCount: number;
  notice?: keyof MessageCatalog;
  presetLabel: string;
  formatterVersion: string;
  webVersion: string;
  shortcuts: ShortcutLabels;
  onAdjust: () => void;
  onGoToLine: (line: number) => void;
}

type Tone = "neutral" | "busy" | "success" | "stale" | "failure";

function formatDuration(ms: number, locale: string): string {
  if (ms < 1000) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "millisecond",
      unitDisplay: "short",
      maximumFractionDigits: 0,
    }).format(Math.max(1, Math.round(ms)));
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "second",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(ms / 1000);
}

interface StatusPresentation {
  tone: Tone;
  label: string;
  detail: string;
}

function describeStatus(
  status: FormatStatus,
  { t, locale }: Pick<I18n, "t" | "locale">,
  context: {
    changedLineCount: number;
    notice?: keyof MessageCatalog;
    shortcuts: ShortcutLabels;
  },
): StatusPresentation {
  switch (status.kind) {
    case "formatting":
      return { tone: "busy", label: t("status.formatting"), detail: "" };
    case "changed":
      return {
        tone: "success",
        label: t("status.changed"),
        detail: t("status.changed.detail", {
          count: context.changedLineCount,
          duration: formatDuration(status.durationMs, locale),
        }),
      };
    case "unchanged":
      return {
        tone: "success",
        label: t("status.unchanged"),
        detail: t("status.unchanged.detail", {
          duration: formatDuration(status.durationMs, locale),
        }),
      };
    case "failure":
      return {
        tone: "failure",
        label: t("status.failure"),
        detail: t(failureMessageKey(status.failure.code)),
      };
    case "outdated":
      return {
        tone: "stale",
        label: t("status.outdated"),
        detail: t(
          status.freshness === "source-outdated"
            ? "status.outdated.source"
            : status.freshness === "options-outdated"
              ? "status.outdated.options"
              : "status.outdated.both",
        ),
      };
    case "applied":
      return {
        tone: "success",
        label: t("status.applied"),
        detail: t("status.applied.detail", {
          shortcut: context.shortcuts.undo,
        }),
      };
    case "error":
      return {
        tone: "failure",
        label: t("status.error"),
        detail: t(status.messageKey ?? clientErrorMessageKey(status.code)),
      };
    default:
      return {
        tone: "neutral",
        label: t("status.ready"),
        detail: context.notice
          ? t(context.notice)
          : t("status.ready.detail", { shortcut: context.shortcuts.format }),
      };
  }
}

function ToneIcon({ tone }: { tone: Tone }) {
  switch (tone) {
    case "busy":
      return <LoaderCircle className="spin" size={16} aria-hidden="true" />;
    case "success":
      return <CircleCheck size={16} aria-hidden="true" />;
    case "stale":
      return <Clock3 size={16} aria-hidden="true" />;
    case "failure":
      return <OctagonAlert size={16} aria-hidden="true" />;
    default:
      return <CircleDot size={16} aria-hidden="true" />;
  }
}

export function ReportBar({
  status,
  result,
  changedLineCount,
  notice,
  presetLabel,
  formatterVersion,
  webVersion,
  shortcuts,
  onAdjust,
  onGoToLine,
}: ReportBarProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const panelId = useId();
  const presentation = describeStatus(status, i18n, {
    changedLineCount,
    notice,
    shortcuts,
  });

  // Problems open the details on their own; everything else waits to be asked.
  const needsAttention = status.kind === "failure" || status.kind === "error";
  const [expanded, setExpanded] = useState(needsAttention);
  const [lastKind, setLastKind] = useState(status.kind);
  if (lastKind !== status.kind) {
    setLastKind(status.kind);
    if (needsAttention) setExpanded(true);
  }

  const failure = result?.failure;
  const rows = result && !result.failure ? summarizeRuleDiagnostics(result, t) : [];
  const warning = result?.warning;

  return (
    <aside className="report" aria-label={t("report.label")}>
      {expanded ? (
        <div id={panelId} className="report-panel">
          <div className="report-panel-inner">
            {failure ? (
              <section className="report-callout is-failure">
                <h3>{t("report.failure.title")}</h3>
                <p>{t(failureMessageKey(failure.code))}</p>
                <details className="report-technical">
                  <summary>{t("report.technical")}</summary>
                  <p>
                    <code>{failure.code}</code>
                    {failure.stage ? (
                      <span> · {t("report.stage", { stage: failure.stage })}</span>
                    ) : null}
                  </p>
                  {failure.message ? <p>{failure.message}</p> : null}
                </details>
              </section>
            ) : null}

            {status.kind === "error" ? (
              <section className="report-callout is-failure">
                <h3>{t("report.error.title")}</h3>
                <p>{presentation.detail}</p>
                {status.detail ? (
                  <details className="report-technical">
                    <summary>{t("report.technical")}</summary>
                    <p>
                      <code>{status.code}</code>
                    </p>
                    <p>{status.detail}</p>
                  </details>
                ) : null}
              </section>
            ) : null}

            {warning ? (
              <section className="report-callout is-warning">
                <h3>{t("report.warning.title")}</h3>
                <p>{warning}</p>
              </section>
            ) : null}

            {result && !result.failure ? (
              <section className="report-changes">
                <h3>{t("report.changes.title")}</h3>
                {rows.length > 0 ? (
                  <ul className="change-list">
                    {rows.map((row, index) => (
                      <li
                        key={`${row.rule}-${index}`}
                        className={`change-row is-${row.severity}`}
                      >
                        <span className="change-kind">
                          {row.severity === "warning" ? (
                            <TriangleAlert size={14} aria-hidden="true" />
                          ) : (
                            <CircleCheck size={14} aria-hidden="true" />
                          )}
                          <span className="visually-hidden">
                            {t(
                              row.severity === "warning"
                                ? "report.severity.warning"
                                : "report.severity.info",
                            )}
                          </span>
                        </span>
                        <span className="change-message">{row.message}</span>
                        {row.line !== undefined ? (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => onGoToLine(row.line!)}
                          >
                            <CornerDownLeft size={13} aria-hidden="true" />
                            {t("report.goto", { line: row.line })}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="report-muted">{t("report.changes.none")}</p>
                )}
              </section>
            ) : null}

            {!result && status.kind !== "error" ? (
              <p className="report-muted">{t("report.nothing")}</p>
            ) : null}

            <footer className="report-footer">
              <p className="report-privacy">
                <ShieldCheck size={14} aria-hidden="true" />
                {t("report.privacy")}
              </p>
              <p className="report-meta">
                <span>
                  {t("report.versions", {
                    fmt: formatterVersion,
                    web: webVersion,
                  })}
                </span>
                <a href={CORE_REPOSITORY_URL} target="_blank" rel="noreferrer">
                  {t("report.link.core")}
                </a>
                <a
                  href={FRONTEND_REPOSITORY_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("report.link.frontend")}
                </a>
              </p>
            </footer>
          </div>
        </div>
      ) : null}

      <div className="report-bar" data-tone={presentation.tone}>
        <div className="report-status" role="status" aria-live="polite">
          <span className="report-label">
            <ToneIcon tone={presentation.tone} />
            {presentation.label}
          </span>
          {presentation.detail ? (
            <span className="report-detail">{presentation.detail}</span>
          ) : null}
        </div>
        <div className="report-tools">
          <span className="report-preset">
            {t("report.preset", { preset: presetLabel })}
          </span>
          <button type="button" className="link-button" onClick={onAdjust}>
            {t("report.adjust")}
          </button>
          <button
            type="button"
            className="button is-quiet report-toggle"
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown size={15} aria-hidden="true" />
            ) : (
              <ChevronUp size={15} aria-hidden="true" />
            )}
            {expanded ? t("report.hide-details") : t("report.show-details")}
          </button>
        </div>
      </div>
    </aside>
  );
}
