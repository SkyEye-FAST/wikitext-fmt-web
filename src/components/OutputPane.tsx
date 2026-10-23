import { lazy, type Ref, Suspense, useEffect, useRef } from "react";

import { Copy, Download, Replace } from "lucide-react";
import { Tabs } from "radix-ui";

import type { FormatRun, ResultFreshness } from "../app/formatRun.js";
import type { ResolvedTheme } from "../editor/themes.js";
import { useI18n } from "../i18n/useI18n.js";
import { buildDownloadFilename } from "../utils/document.js";
import type { ShortcutLabels } from "../utils/platform.js";
import { EditorPane, type EditorPaneHandle } from "./EditorPane.js";

const DiffView = lazy(() => import("./DiffView.js"));

export type OutputTab = "result" | "changes";

interface OutputPaneProps {
  editorRef: Ref<EditorPaneHandle>;
  run?: FormatRun;
  freshness: ResultFreshness;
  changedLines: Set<number>;
  canApply: boolean;
  tab: OutputTab;
  sourceFilename?: string;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  interwiki?: string[];
  shortcuts: ShortcutLabels;
  hidden?: boolean;
  onTabChange: (tab: OutputTab) => void;
  onCopy: () => void;
  onDownload: () => void;
  onApply: () => void;
}

export function OutputPane({
  editorRef,
  run,
  freshness,
  changedLines,
  canApply,
  tab,
  sourceFilename,
  lineWrapping,
  theme,
  interwiki,
  shortcuts,
  hidden,
  onTabChange,
  onCopy,
  onDownload,
  onApply,
}: OutputPaneProps) {
  const { t, locale } = useI18n();
  const stale = Boolean(run) && freshness !== "current";
  const failed = Boolean(run?.result.failure);
  const identical = run ? run.result.formatted === run.sourceSnapshot : false;
  const sectionRef = useRef<HTMLElement>(null);

  // Changed lines flash once when a new result arrives. The flag is
  // short-lived so lines CodeMirror renders later, on scroll, stay still.
  useEffect(() => {
    const section = sectionRef.current;
    if (!run || !section) return;
    section.dataset.fresh = "";
    const timer = window.setTimeout(() => delete section.dataset.fresh, 900);
    return () => {
      window.clearTimeout(timer);
      delete section.dataset.fresh;
    };
  }, [run]);

  return (
    <section
      ref={sectionRef}
      className="pane pane-output"
      aria-labelledby="output-title"
      data-hidden-on-mobile={hidden || undefined}
      data-stale={stale || undefined}
    >
      <Tabs.Root
        className="output-tabs"
        value={tab}
        onValueChange={(value) => onTabChange(value as OutputTab)}
        activationMode="manual"
      >
        <header className="pane-header">
          <div className="pane-heading">
            <h2 id="output-title" className="pane-title">
              {t("editor.output.label")}
            </h2>
            <Tabs.List className="tab-list" aria-label={t("output.tabs.label")}>
              <Tabs.Trigger className="tab" value="result">
                {t("output.tab.result")}
              </Tabs.Trigger>
              <Tabs.Trigger className="tab" value="changes" data-action="diff">
                {t("output.tab.changes")}
                {run && !failed && !stale && !identical ? (
                  <>
                    <span
                      key={changedLines.size}
                      className="tab-count"
                      aria-hidden="true"
                    >
                      {changedLines.size.toLocaleString(locale)}
                    </span>
                    <span className="visually-hidden">
                      {` (${t("output.changed-lines", { count: changedLines.size })})`}
                    </span>
                  </>
                ) : null}
              </Tabs.Trigger>
            </Tabs.List>
          </div>
          <div className="pane-actions">
            <button
              type="button"
              className="button is-quiet"
              title={t("output.copy.title")}
              disabled={!run}
              onClick={onCopy}
            >
              <Copy size={15} aria-hidden="true" />
              <span className="button-label">{t("output.copy")}</span>
            </button>
            <button
              type="button"
              className="button is-quiet"
              title={t("output.download.title", {
                filename: buildDownloadFilename(sourceFilename),
              })}
              disabled={!run}
              onClick={onDownload}
            >
              <Download size={15} aria-hidden="true" />
              <span className="button-label">{t("output.download")}</span>
            </button>
            <button
              type="button"
              className="button"
              title={
                canApply
                  ? t("output.apply.title", { shortcut: shortcuts.undo })
                  : undefined
              }
              disabled={!canApply}
              onClick={onApply}
            >
              <Replace size={15} aria-hidden="true" />
              <span className="button-label">{t("output.apply")}</span>
            </button>
          </div>
        </header>

        {/* The result editor stays mounted so its scroll position and
            CodeMirror state survive a trip to the Changes tab. */}
        <Tabs.Content className="pane-body" value="result" forceMount>
          <EditorPane
            ref={editorRef}
            id="output"
            label={t("editor.output.label")}
            readOnly
            lineWrapping={lineWrapping}
            theme={theme}
            interwiki={interwiki}
            changedLines={changedLines}
          />
          {run ? null : (
            <div className="empty-state is-passive">
              <div className="empty-card">
                <h3 className="empty-title">{t("output.empty.title")}</h3>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content className="pane-body diff-body" value="changes">
          {!run ? (
            <p className="pane-note">{t("diff.none")}</p>
          ) : identical ? (
            <p className="pane-note">{t("diff.identical")}</p>
          ) : (
            <>
              {stale ? (
                <p className="pane-note is-inline">{t("diff.previous-run")}</p>
              ) : null}
              <Suspense
                fallback={<p className="pane-note">{t("diff.loading")}</p>}
              >
                <DiffView
                  original={run.sourceSnapshot}
                  formatted={run.result.formatted}
                  theme={theme}
                  lineWrapping={lineWrapping}
                  label={t("diff.label")}
                  interwiki={interwiki}
                />
              </Suspense>
            </>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
