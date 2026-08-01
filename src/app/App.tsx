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
import { I18nProvider } from "../i18n/I18nProvider.js";
import { loadLocalePreference, resolveLocale, saveLocalePreference, type LanguagePreference, type SupportedLocale } from "../i18n/locales.js";
import { useI18n } from "../i18n/useI18n.js";
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

function useResolvedLocale(preference: LanguagePreference): SupportedLocale {
  return resolveLocale(preference, navigator);
}

function InitializationScreen({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <main className="initialization-screen">
      <span className="brand-mark" aria-hidden="true">{"{ }"}</span>
      <h1>{t("brand.name")}</h1>
      {status.kind === "error" ? (
        <>
          <p role="alert">{status.message}</p>
          <button type="button" className="secondary-button" onClick={() => location.reload()}>{t("init.retry-worker")}</button>
        </>
      ) : <p>{t("init.initializing")}</p>}
    </main>
  );
}

export default function App({ createFormatterClient = () => new FormatterClient() }: AppProps) {
  const [languagePref, setLanguagePref] = useState<LanguagePreference>(loadLocalePreference);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formatterVersion, setFormatterVersion] = useState(__WIKITEXT_FMT_VERSION__);
  const [defaults, setDefaults] = useState<ResolvedBrowserOptions | null>(null);

  const locale = useResolvedLocale(languagePref);

  // Sync language preference so the init screen can use it.
  useEffect(() => {
    saveLocalePreference(languagePref);
  }, [languagePref]);

  useEffect(() => {
    let active = true;
    const client = createFormatterClient();
    void client.ready().then(
      (metadata: { defaults: ResolvedBrowserOptions; version: string }) => {
        if (!active) return;
        setDefaults(metadata.defaults);
        setFormatterVersion(metadata.version);
        setSettings(loadSettings(metadata.defaults));
      },
      (error: Error) => {
        if (active) setStatus(classifyUnexpectedError(error));
      },
    );
    return () => {
      active = false;
      client.dispose();
    };
    // Create the formatter client once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (!settings || !defaults) {
    return (
      <I18nProvider locale={locale}>
        <InitializationScreen status={status} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider locale={locale}>
      <AppMain
        initialSettings={settings}
        defaults={defaults}
        formatterVersion={formatterVersion}
        languagePref={languagePref}
        setLanguagePref={setLanguagePref}
        createFormatterClient={createFormatterClient}
      />
    </I18nProvider>
  );
}

interface AppMainProps {
  initialSettings: AppSettings;
  defaults: ResolvedBrowserOptions;
  formatterVersion: string;
  languagePref: LanguagePreference;
  setLanguagePref: (pref: LanguagePreference) => void;
  createFormatterClient: () => FormatterClientPort;
}

function AppMain({
  initialSettings,
  defaults,
  formatterVersion,
  languagePref,
  setLanguagePref,
  createFormatterClient,
}: AppMainProps) {
  const { t } = useI18n();
  const clientRef = useRef<FormatterClientPort | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceEditorRef = useRef<EditorPaneHandle>(null);
  const outputEditorRef = useRef<EditorPaneHandle>(null);
  const sourceRevisionRef = useRef(0);
  const activeFormatRef = useRef(0);
  const busyRef = useRef(false);

  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [output, setOutput] = useState("");
  const [diffSource, setDiffSource] = useState("");
  const [sourceFilename, setSourceFilename] = useState<string>();
  const [result, setResult] = useState<FormatDetailedResult>();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [notice, setNotice] = useState<string>();
  const [diffVisible, setDiffVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolvedTheme = useResolvedTheme(settings.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Update document title and meta tags.
  useEffect(() => {
    if (sourceFilename === "Example.wikitext") {
      document.title = t("document.title.example");
    } else {
      document.title = t("document.title.default");
    }

    const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descEl) descEl.content = t("meta.description");

    const ogTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.content = t("meta.og-title");

    const ogDescEl = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.content = t("meta.og-description");
  }, [sourceFilename, t]);

  // Init formatter client.
  useEffect(() => {
    const client = createFormatterClient();
    clientRef.current = client;
    return () => {
      if (clientRef.current === client) clientRef.current = null;
      client.dispose();
    };
  }, [createFormatterClient]);

  useEffect(() => {
    outputEditorRef.current?.setValue(output);
  }, [output]);

  // Persist settings on every change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSourceDocumentChange = useCallback(() => {
    sourceRevisionRef.current += 1;
  }, []);

  const replaceSourceDocument = useCallback((source: string) => {
    sourceRevisionRef.current += 1;
    sourceEditorRef.current?.setValue(source);
  }, []);

  const format = useCallback(async () => {
    if (busyRef.current) return;
    const client = clientRef.current;
    const sourceEditor = sourceEditorRef.current;
    if (!client || !sourceEditor) {
      setStatus({ kind: "error", message: t("status.worker-not-ready") });
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
      if (operationToken !== activeFormatRef.current) return;
      if (sourceRevision !== sourceRevisionRef.current) {
        setStatus({ kind: "idle" });
        setNotice(t("status.source-changed"));
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
  }, [settings.formatter, t]);

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
    setStatus({ kind: "error", message: t("status.formatting-stopped") });
    try {
      await client.restart();
    } catch (error) {
      setStatus(classifyUnexpectedError(error));
    }
  }

  async function copyOutput(): Promise<void> {
    try {
      await copyText(output);
      setNotice(t("copy.success"));
    } catch {
      setNotice(t("copy.denied"));
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
        ? t("editor.large-file-warning")
        : undefined);
    } catch {
      setNotice(t("editor.file-not-readable"));
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
    clearStoredSettings();
    setLanguagePref("system");
    setSettings(createDefaultSettings(defaults));
  }

  function handleLanguageChange(lang: LanguagePreference): void {
    setLanguagePref(lang);
    setSettings((s) => ({ ...s, language: lang }));
  }

  return (
    <div className="app-shell">
      <AppHeader
        theme={settings.theme}
        language={languagePref}
        onThemeChange={(theme) => setSettings((s) => ({ ...s, theme }))}
        onLanguageChange={handleLanguageChange}
      />
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
          <EditorPane ref={sourceEditorRef} id="source" label={t("editor.source.label")} mutedLabel={t("editor.source.muted")} onDocumentChange={handleSourceDocumentChange} lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
          <EditorPane ref={outputEditorRef} id="output" label={t("editor.output.label")} mutedLabel={t("editor.output.muted")} readOnly lineWrapping={settings.lineWrapping} theme={resolvedTheme} />
        </div>
        {diffVisible ? (
          <Suspense fallback={<div className="lazy-loading">{t("diff.loading")}</div>}>
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
            onRestoreDefaults={() => setSettings((s) => ({ ...s, formatter: { ...defaults } }))}
            onReset={resetAllSettings}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
