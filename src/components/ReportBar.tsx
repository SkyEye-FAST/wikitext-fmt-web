import type { CSSProperties } from "react";

import {
  CircleCheck,
  CircleDot,
  Clock3,
  LoaderCircle,
  OctagonAlert,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import type { FormatDetailedResult } from "wikitext-fmt/browser";

import {
  clientErrorMessageKey,
  countRuleChanges,
  failureMessageKey,
  type FormatStatus,
  type RuleCount,
} from "../formatter/resultSummary.js";
import type { MessageCatalog } from "../i18n/types.js";
import { type I18n, useI18n } from "../i18n/useI18n.js";
import type { ShortcutLabels } from "../utils/platform.js";

interface ReportBarProps {
  status: FormatStatus;
  result?: FormatDetailedResult;
  notice?: keyof MessageCatalog;
  presetLabel: string;
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
  /** Short facts shown after the label, like an editor's status bar. */
  facts: string[];
  /** Machine-readable code for reports; the raw message is its tooltip. */
  code?: { text: string; title?: string };
}

function describeStatus(
  status: FormatStatus,
  { t, locale }: Pick<I18n, "t" | "locale">,
  context: { notice?: keyof MessageCatalog; shortcuts: ShortcutLabels },
): StatusPresentation {
  switch (status.kind) {
    case "formatting":
      return { tone: "busy", label: t("status.formatting"), facts: [] };
    case "changed":
      // The Changes tab already counts changed lines.
      return {
        tone: "success",
        label: t("status.changed"),
        facts: [formatDuration(status.durationMs, locale)],
      };
    case "unchanged":
      return {
        tone: "success",
        label: t("status.unchanged"),
        facts: [formatDuration(status.durationMs, locale)],
      };
    case "failure": {
      const { code, stage, message } = status.failure;
      return {
        tone: "failure",
        label: t("status.failure"),
        facts: [t(failureMessageKey(code))],
        code: {
          text: code,
          title: [stage ? t("report.stage", { stage }) : "", message]
            .filter(Boolean)
            .join("\n"),
        },
      };
    }
    case "outdated":
      return {
        tone: "stale",
        label: t("status.outdated"),
        facts: [
          t(
            status.freshness === "source-outdated"
              ? "status.outdated.source"
              : status.freshness === "options-outdated"
                ? "status.outdated.options"
                : "status.outdated.both",
          ),
        ],
      };
    case "applied":
      return {
        tone: "success",
        label: t("status.applied"),
        facts: [t("status.applied.detail", { shortcut: context.shortcuts.undo })],
      };
    case "error":
      // Stopping on request is not an error worth alarming anyone about.
      if (status.messageKey) {
        return { tone: "neutral", label: t(status.messageKey), facts: [] };
      }
      return {
        tone: "failure",
        label: t("status.error"),
        facts: [t(clientErrorMessageKey(status.code))],
        code: { text: status.code, title: status.detail },
      };
    default:
      return {
        tone: "neutral",
        label: t("status.ready"),
        facts: context.notice ? [t(context.notice)] : [],
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

function RuleCountItem({
  count,
  index,
  onGoToLine,
}: {
  count: RuleCount;
  index: number;
  onGoToLine: (line: number) => void;
}) {
  const { t, locale } = useI18n();
  // Items enter one after another, in reading order.
  const style = { "--i": index } as CSSProperties;
  const content = (
    <>
      <span className="report-count-name">
        {t(`report.rule.${count.rule}`)}
      </span>
      {count.changed > 0 ? (
        <span className="report-count-value">
          {count.changed.toLocaleString(locale)}
        </span>
      ) : null}
      {count.skipped > 0 ? (
        <span
          className="report-count-skipped"
          title={t("report.skipped", { count: count.skipped })}
        >
          <TriangleAlert size={13} aria-hidden="true" />
          <span aria-hidden="true">{count.skipped.toLocaleString(locale)}</span>
          <span className="visually-hidden">
            {t("report.skipped", { count: count.skipped })}
          </span>
        </span>
      ) : null}
    </>
  );

  if (count.line === undefined) {
    return (
      <li className="report-count" style={style}>
        {content}
      </li>
    );
  }
  const line = count.line;
  return (
    <li className="report-count" style={style}>
      <button
        type="button"
        className="report-count-jump"
        title={t("report.goto", { line })}
        onClick={() => onGoToLine(line)}
      >
        {content}
        <span className="visually-hidden">
          {t("report.goto", { line })}
        </span>
      </button>
    </li>
  );
}

export function ReportBar({
  status,
  result,
  notice,
  presetLabel,
  shortcuts,
  onAdjust,
  onGoToLine,
}: ReportBarProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const presentation = describeStatus(status, i18n, { notice, shortcuts });

  const failure = result?.failure;
  const showCounts = status.kind === "changed" || status.kind === "unchanged";
  const counts = result && showCounts ? countRuleChanges(result) : [];
  // A failed run repeats its core message as the warning.
  const warning =
    result?.warning && result.warning !== failure?.message
      ? result.warning
      : undefined;

  return (
    <footer className="report" aria-label={t("report.label")}>
      <div className="report-bar" data-tone={presentation.tone}>
        <div className="report-status" role="status" aria-live="polite">
          <span key={presentation.label} className="report-label">
            <ToneIcon tone={presentation.tone} />
            {presentation.label}
          </span>
          {presentation.facts.map((fact) => (
            <span key={fact} className="report-fact">
              {fact}
            </span>
          ))}
          {presentation.code ? (
            <code className="report-code" title={presentation.code.title}>
              {presentation.code.text}
            </code>
          ) : null}
          {warning ? (
            <span className="report-fact report-warning" title={warning}>
              <TriangleAlert size={14} aria-hidden="true" />
              <span className="visually-hidden">
                {`${t("report.warning")}: `}
              </span>
              {warning}
            </span>
          ) : null}
        </div>

        {counts.length > 0 ? (
          <ul className="report-counts" aria-label={t("report.counts")}>
            {counts.map((count, index) => (
              <RuleCountItem
                key={count.rule}
                count={count}
                index={index}
                onGoToLine={onGoToLine}
              />
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="button is-quiet report-preset"
          title={t("report.adjust")}
          onClick={onAdjust}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {t("report.preset", { preset: presetLabel })}
        </button>
      </div>
    </footer>
  );
}
