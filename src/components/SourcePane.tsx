import type { Ref } from "react";

import {
  ClipboardPaste,
  Eraser,
  FileText,
  FolderOpen,
  Sparkles,
} from "lucide-react";

import type { ResolvedTheme } from "../editor/themes.js";
import { useI18n } from "../i18n/useI18n.js";
import type { DocumentStatistics } from "../utils/document.js";
import { EditorPane, type EditorPaneHandle } from "./EditorPane.js";

interface SourcePaneProps {
  editorRef: Ref<EditorPaneHandle>;
  statistics: DocumentStatistics;
  filename?: string;
  lineWrapping: boolean;
  theme: ResolvedTheme;
  hidden?: boolean;
  onDocumentChange: (statistics: DocumentStatistics) => void;
  onFormat: () => void;
  onOpenFile: () => void;
  onClear: () => void;
  onPaste: () => void;
  onExample: () => void;
}

export function SourcePane({
  editorRef,
  statistics,
  filename,
  lineWrapping,
  theme,
  hidden,
  onDocumentChange,
  onFormat,
  onOpenFile,
  onClear,
  onPaste,
  onExample,
}: SourcePaneProps) {
  const { t } = useI18n();
  const isEmpty = statistics.characters === 0;
  const stats = {
    lines: statistics.lines,
    characters: statistics.characters,
  };

  return (
    <section
      className="pane pane-source"
      aria-labelledby="source-title"
      data-hidden-on-mobile={hidden || undefined}
    >
      <header className="pane-header">
        <div className="pane-heading">
          <h2 id="source-title" className="pane-title">
            {t("editor.source.label")}
          </h2>
          {filename ? (
            <span className="file-chip" title={filename}>
              <FileText size={13} aria-hidden="true" />
              <span className="file-chip-name">{filename}</span>
            </span>
          ) : null}
          <span id="source-stats" className="pane-meta">
            <span aria-hidden="true">{t("editor.stats.visible", stats)}</span>
            <span className="visually-hidden">
              {t("editor.stats.aria", stats)}
            </span>
          </span>
        </div>
        <div className="pane-actions">
          <button
            type="button"
            className="button is-quiet"
            title={t("editor.open-file.title")}
            onClick={onOpenFile}
          >
            <FolderOpen size={15} aria-hidden="true" />
            <span className="button-label">{t("editor.open-file")}</span>
          </button>
          <button
            type="button"
            className="button is-quiet"
            title={t("editor.clear.title")}
            onClick={onClear}
          >
            <Eraser size={15} aria-hidden="true" />
            <span className="button-label">{t("editor.clear")}</span>
          </button>
        </div>
      </header>

      <div className="pane-body">
        <EditorPane
          ref={editorRef}
          id="source"
          label={t("editor.source.label")}
          onDocumentChange={onDocumentChange}
          lineWrapping={lineWrapping}
          theme={theme}
          onFormat={onFormat}
          describedBy="source-stats"
        />
        {isEmpty ? (
          <div className="empty-state">
            <div className="empty-card">
              <h3 className="empty-title">{t("empty.title")}</h3>
              <div className="empty-actions">
                <button
                  type="button"
                  className="button is-primary"
                  onClick={onPaste}
                >
                  <ClipboardPaste size={15} aria-hidden="true" />
                  {t("empty.paste")}
                </button>
                <button type="button" className="button" onClick={onOpenFile}>
                  <FolderOpen size={15} aria-hidden="true" />
                  {t("empty.open")}
                </button>
                <button
                  type="button"
                  className="button is-quiet"
                  data-action="example"
                  onClick={onExample}
                >
                  <Sparkles size={15} aria-hidden="true" />
                  {t("empty.example")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
