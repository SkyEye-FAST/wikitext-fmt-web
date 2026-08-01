import type { FormatDetailedResult } from "wikitext-fmt/browser";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader.js";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel.js";
import { EditorPane, type EditorPaneHandle } from "../components/EditorPane.js";
import { EditorToolbar } from "../components/EditorToolbar.js";
import { FormatStatus } from "../components/FormatStatus.js";
import { PrivacyNotice } from "../components/PrivacyNotice.js";
import type { ResolvedTheme } from "../editor/themes.js";
import { FormatterClient, StaleResponseError, WorkerStoppedError } from "../formatter/client.js";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { classifyResult, classifyUnexpectedError, type FormatStatus as Status } from "../formatter/resultSummary.js";
import { LARGE_DOCUMENT_WARNING_BYTES } from "../settings/defaults.js";
import { createDefaultSettings, type AppSettings, type ThemePreference } from "../settings/schema.js";
import { clearStoredSettings, loadSettings, saveSettings } from "../settings/storage.js";
import { EXAMPLE_WIKITEXT } from "../samples/example.js";
import { copyText, triggerTextDownload } from "../utils/document.js";

const DiffView = lazy(() => import("../components/DiffView.js"));
const SettingsPanel = lazy(() => import("../components/SettingsPanel.js"));

export type FormatterClientPort = Pick<FormatterClient, "ready" | "format" | "restart" | "dispose">;

interface AppProps {
  createFormatterClient?: () => FormatterClientPort;
}

function useResolvedTheme(preference: ThemePreference): ResolvedTheme {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return preference === "system" ? systemTheme : preference;
}

export default function App({ createFormatterClient = () => new FormatterClient() }: AppProps) {
  const createFormatterClientRef = useRef(createFormatterClient);
  const clientRef = useRef<FormatterClientPort | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceEditorRef = useRef<EditorPaneHandle>(null);
  const outputEditorRef = useRef<EditorPaneHandle>(null);
  const sourceRevisionRef = useRef(0);
  const activeFormatRef = useRef(0);
  const busyRef = useRef(false);
  const defaultsRef = useRef<ResolvedBrowserOptions | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formatterVersion, setFormatterVersion] = useState(__WIKITEXT_FMT_VERSION__);
  const [output, setOutput] = useState("");
  const [diffSource, setDiffSource] = useState("");
  const [sourceFilename, setSourceFilename] = useState<string>();
  const [result, setResult] = useState<FormatDetailedResult>();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [notice, setNotice] = useState<string>();
  const [diffVisible, setDiffVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolvedTheme = useResolvedTheme(settings?.theme ?? "system");

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    let active = true;
    const client = createFormatterClientRef.current();
    clientRef.current = client;
    void client.ready().then(
      (metadata) => {
        if (!active) return;
        defaultsRef.current = metadata.defaults;
        setFormatterVersion(metadata.version);
        setSettings(loadSettings(metadata.defaults));
      },
      (error: Error) => {
        if (active) {
          setStatus(classifyUnexpectedError(error));
        }
      },
    );
    return () => {
      active = false;
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      client.dispose();
    };
  }, []);

  useEffect(() => {
    if (settings) {
      saveSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    outputEditorRef.current?.setValue(output);
  }, [output]);

  const handleSourceDocumentChange = useCallback(() => {
    sourceRevisionRef.current += 1;
  }, []);

  const replaceSourceDocument = useCallback((source: string) => {
    // Explicit actions must invalidate an in-flight snapshot even when the
    // replacement is byte-for-byte identical and CodeMirror emits no update.
    sourceRevisionRef.current += 1;
    sourceEditorRef.current?.setValue(source);
  }, []);

  const format = useCallback(async () => {
    if (!settings || busyRef.current) return;
    const client = clientRef.current;
    const sourceEditor = sourceEditorRef.current;
    if (!client || !sourceEditor) {
      setStatus({ kind: "error", message: "The formatter Worker is not ready." });
      return;
    }
    const sourceSnapshot = sourceEditor.getValue();
    const sourceRevision = sourceRevisionRef.current;
    const operationToken = ++activeFormatRef.current;
    busyRef.current = true;
    setBusy(true);
    setNotice(undefined);
    setStatus({ kind: "formatting" });
    try {
      const operation = await client.format(sourceSnapshot, settings.formatter);
      if (operationToken !== activeFormatRef.current) {
        return;
      }
      if (sourceRevision !== sourceRevisionRef.current) {
        setStatus({ kind: "idle" });
        setNotice("The source changed while formatting. The older result was discarded; format again to update the output.");
        return;
      }
      setResult(operation.result);
      setOutput(operation.result.formatted);
      setDiffSource(sourceSnapshot);
      setStatus(classifyResult(sourceSnapshot, operation.result, operation.durationMs));
    } catch (error) {
      if (operationToken === activeFormatRef.current && !(error instanceof StaleResponseError)) {
        setStatus(classifyUnexpectedError(error));
        if (!(error instanceof WorkerStoppedError)) {
          void client.restart().catch(() => undefined);
        }
      }
    } finally {
      if (operationToken === activeFormatRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [settings]);

  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  }, [format]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void formatRef.current();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  async function stopFormatting(): Promise<void> {
    const client = clientRef.current;
    if (!client) return;
    activeFormatRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setStatus({ kind: "error", message: "Formatting was stopped. The formatter Worker was restarted." });
    try {
      await client.restart();
    } catch (error) {
      setStatus(classifyUnexpectedError(error));
    }
  }

  async function copyOutput(): Promise<void> {
    try {
      await copyText(output);
      setNotice("Formatted output copied to the clipboard.");
    } catch {
      setNotice("Clipboard access was denied. Select and copy the output manually.");
    }
  }

  async function openFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      replaceSourceDocument(text);
      setOutput("");
      setResult(undefined);
      setStatus({ kind: "idle" });
      setSourceFilename(file.name);
      setDiffVisible(false);
      setNotice(file.size > LARGE_DOCUMENT_WARNING_BYTES
        ? "This is an unusually large file. Formatting may take longer; you can stop the Worker at any time."
        : undefined);
    } catch {
      setNotice("The selected file could not be read in this browser.");
    }
  }

  function clearDocument(): void {
    replaceSourceDocument("");
    setOutput("");
    setResult(undefined);
    setStatus({ kind: "idle" });
    setNotice(undefined);
    setDiffVisible(false);
    setDiffSource("");
    setSourceFilename(undefined);
    sourceEditorRef.current?.focus();
  }

  function loadExample(): void {
    replaceSourceDocument(EXAMPLE_WIKITEXT);
    setOutput("");
    setResult(undefined);
    setStatus({ kind: "idle" });
    setNotice(undefined);
    setDiffVisible(false);
    setDiffSource("");
    setSourceFilename("Example.wikitext");
    sourceEditorRef.current?.focus();
  }

  function toggleDiff(): void {
    setDiffVisible((visible) => {
      if (!visible) {
        setDiffSource(sourceEditorRef.current?.getValue() ?? "");
      }
      return !visible;
    });
  }

  function resetAllSettings(): void {
    const defaults = defaultsRef.current;
    if (!defaults) return;
    clearStoredSettings();
    setSettings(createDefaultSettings(defaults));
  }

  if (!settings) {
    return (
      <main className="initialization-screen">
        <span className="brand-mark" aria-hidden="true">{"{ }"}</span>
        <h1>Wikitext Formatter</h1>
        {status.kind === "error" ? (
          <>
            <p role="alert">{status.message}</p>
            <button type="button" className="secondary-button" onClick={() => location.reload()}>Retry Worker</button>
          </>
        ) : <p>Initializing the local formatter Worker…</p>}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader theme={settings.theme} onThemeChange={(theme) => setSettings((current) => current && { ...current, theme })} />
      <EditorToolbar
        busy={busy}
        hasOutput={output.length > 0}
        diffVisible={diffVisible}
        onFormat={() => void format()}
        onStop={() => void stopFormatting()}
        onCopy={() => void copyOutput()}
        onDownload={() => triggerTextDownload(output, sourceFilename)}
        onOpenFile={() => fileInputRef.current?.click()}
        onClear={clearDocument}
        onLoadExample={loadExample}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleDiff={toggleDiff}
      />
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        aria-hidden="true"
        tabIndex={-1}
        accept=".wiki,.wikitext,.mediawiki,.txt,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openFile(file);
          event.currentTarget.value = "";
        }}
      />

      <main className="workspace">
        <div className={`editor-grid ${diffVisible ? "is-visually-hidden" : ""}`} aria-hidden={diffVisible} inert={diffVisible}>
          <EditorPane ref={sourceEditorRef} id="source" label="Source" mutedLabel="Wikitext" onDocumentChange={handleSourceDocumentChange} lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
          <EditorPane ref={outputEditorRef} id="output" label="Formatted output" mutedLabel="Read-only" readOnly lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
        </div>
        {diffVisible ? (
          <Suspense fallback={<div className="lazy-loading">Loading diff tools…</div>}>
            <DiffView original={diffSource} formatted={output} lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
          </Suspense>
        ) : null}
      </main>

      <aside className="lower-rail" aria-label="Formatting status and diagnostics">
        <div className="status-privacy-row">
          <FormatStatus status={status} profile={settings.formatter.profile} webVersion={__WIKITEXT_FMT_WEB_VERSION__} formatterVersion={formatterVersion} />
          <PrivacyNotice />
        </div>
        <DiagnosticsPanel result={result} status={status} notice={notice} />
      </aside>

      {settingsOpen ? (
        <Suspense fallback={null}>
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
            onRestoreDefaults={() => defaultsRef.current && setSettings({ ...settings, formatter: { ...defaultsRef.current } })}
            onReset={resetAllSettings}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
