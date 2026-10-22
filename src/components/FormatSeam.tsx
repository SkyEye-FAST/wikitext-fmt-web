import { ArrowRight, LoaderCircle, Square } from "lucide-react";

import { useI18n } from "../i18n/useI18n.js";
import type { ShortcutLabels } from "../utils/platform.js";

interface FormatSeamProps {
  busy: boolean;
  stale: boolean;
  shortcuts: ShortcutLabels;
  onFormat: () => void;
  onStop: () => void;
}

/**
 * The single primary action, placed between source and result so the flow
 * reads left to right. On narrow screens it docks to the bottom edge.
 */
export function FormatSeam({
  busy,
  stale,
  shortcuts,
  onFormat,
  onStop,
}: FormatSeamProps) {
  const { t } = useI18n();
  const title = t("action.format.title", { shortcut: shortcuts.format });

  return (
    <div className="format-seam" data-busy={busy || undefined}>
      <button
        type="button"
        className="format-button"
        data-action="format"
        title={title}
        aria-keyshortcuts={shortcuts.formatAria}
        disabled={busy}
        onClick={onFormat}
      >
        <span className="format-disc" aria-hidden="true">
          {busy ? (
            <LoaderCircle className="spin" size={20} />
          ) : (
            <ArrowRight size={20} />
          )}
        </span>
        <span className="format-label">
          {busy ? t("status.formatting") : t("action.format")}
        </span>
      </button>
      {busy ? (
        <button
          type="button"
          className="button is-quiet stop-button"
          title={t("action.stop.title")}
          onClick={onStop}
        >
          <Square size={12} aria-hidden="true" />
          {t("action.stop")}
        </button>
      ) : (
        <kbd className="seam-shortcut" aria-hidden="true">
          {shortcuts.format}
        </kbd>
      )}
      {stale && !busy ? (
        <span className="stale-tag">{t("action.stale")}</span>
      ) : null}
    </div>
  );
}
