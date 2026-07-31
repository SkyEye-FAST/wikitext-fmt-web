import type { FormatDetailedResult } from "wikitext-fmt/browser";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader.js";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel.js";
import { EditorPane } from "../components/EditorPane.js";
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

export default function App() {
  const clientRef = useRef<FormatterClient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultsRef = useRef<ResolvedBrowserOptions | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formatterVersion, setFormatterVersion] = useState(__WIKITEXT_FMT_VERSION__);
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
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
    const client = new FormatterClient();
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

  const format = useCallback(async () => {
    if (!settings || busy) return;
    const client = clientRef.current;
    if (!client) {
      setStatus({ kind: "error", message: "The formatter Worker is not ready." });
      return;
    }
    setBusy(true);
    setNotice(undefined);
    setStatus({ kind: "formatting" });
    try {
      const operation = await client.format(source, settings.formatter);
      setResult(operation.result);
      setOutput(operation.result.formatted);
      setStatus(classifyResult(source, operation.result, operation.durationMs));
    } catch (error) {
      if (!(error instanceof StaleResponseError)) {
        setStatus(classifyUnexpectedError(error));
        if (!(error instanceof WorkerStoppedError)) {
          void client.restart().catch(() => undefined);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [busy, settings, source]);

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
      setSource(text);
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
      <AppHeader theme={settings.theme} onThemeChange={(theme) => setSettings({ ...settings, theme })} />
      <EditorToolbar
        busy={busy}
        hasOutput={output.length > 0}
        diffVisible={diffVisible}
        onFormat={() => void format()}
        onStop={() => void stopFormatting()}
        onCopy={() => void copyOutput()}
        onDownload={() => triggerTextDownload(output, sourceFilename)}
        onOpenFile={() => fileInputRef.current?.click()}
        onClear={() => {
          setSource(""); setOutput(""); setResult(undefined); setStatus({ kind: "idle" }); setNotice(undefined); setDiffVisible(false); setSourceFilename(undefined);
        }}
        onLoadExample={() => {
          setSource(EXAMPLE_WIKITEXT); setOutput(""); setResult(undefined); setStatus({ kind: "idle" }); setNotice(undefined); setDiffVisible(false); setSourceFilename("Example.wikitext");
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleDiff={() => setDiffVisible((visible) => !visible)}
      />
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".wiki,.wikitext,.mediawiki,.txt,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openFile(file);
          event.currentTarget.value = "";
        }}
      />

      <main className="workspace">
        <div className={`editor-grid ${diffVisible ? "is-visually-hidden" : ""}`} aria-hidden={diffVisible} inert={diffVisible}>
          <EditorPane id="source" label="Source" mutedLabel="Wikitext" value={source} onChange={setSource} lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
          <EditorPane id="output" label="Formatted output" mutedLabel="Read-only" value={output} readOnly lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
        </div>
        {diffVisible ? (
          <Suspense fallback={<div className="lazy-loading">Loading diff tools…</div>}>
            <DiffView original={source} formatted={output} lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
          </Suspense>
        ) : null}
      </main>

      <div className="lower-rail">
        <div className="status-privacy-row">
          <FormatStatus status={status} profile={settings.formatter.profile} version={formatterVersion} />
          <PrivacyNotice />
        </div>
        <DiagnosticsPanel result={result} status={status} notice={notice} />
      </div>

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
