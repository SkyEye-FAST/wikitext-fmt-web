import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader.js";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel.js";
import { EditorPane, type EditorPaneHandle } from "../components/EditorPane.js";
import { EditorToolbar } from "../components/EditorToolbar.js";
import { FormatStatus } from "../components/FormatStatus.js";
import { PrivacyNotice } from "../components/PrivacyNotice.js";
import type { ResolvedTheme } from "../editor/themes.js";
import { FormatterClient, StaleResponseError, WorkerStoppedError } from "../formatter/client.js";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { classifyResult, classifyUnexpectedError, clientErrorMessageKey, type FormatStatus as Status } from "../formatter/resultSummary.js";
import { isApplicableFormatRun, resolveResultFreshness, type FormatRun, type ResultFreshness } from "./formatRun.js";
import { I18nProvider } from "../i18n/I18nProvider.js";
import { resolveLocale, type LanguagePreference, type SupportedLocale } from "../i18n/locales.js";
import type { MessageCatalog } from "../i18n/messages.en.js";
import { useI18n } from "../i18n/useI18n.js";
import { LARGE_DOCUMENT_WARNING_BYTES } from "../settings/defaults.js";
import { createDefaultSettings, type AppSettings, type ThemePreference } from "../settings/schema.js";
import { clearStoredSettings, loadSettings, loadStoredLanguagePreference, saveSettings } from "../settings/storage.js";
import { EXAMPLE_WIKITEXT } from "../samples/example.js";
import { copyText, triggerTextDownload } from "../utils/document.js";

const DiffView = lazy(() => import("../components/DiffView.js"));
const SettingsPanel = lazy(() => import("../components/SettingsPanel.js"));

export type FormatterClientPort = Pick<FormatterClient, "ready" | "format" | "restart" | "dispose">;

const defaultFormatterClientFactory = (): FormatterClientPort => new FormatterClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function areOptionValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((value, index) => areOptionValuesEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.hasOwn(right, key) && areOptionValuesEqual(left[key], right[key]),
  );
}

function areFormatterOptionsEqual(
  left: ResolvedBrowserOptions,
  right: ResolvedBrowserOptions,
): boolean {
  return areOptionValuesEqual(left, right);
}

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

function LocalizedDocumentMetadata({ sourceFilename }: { sourceFilename?: string }) {
  const { locale, t } = useI18n();
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title = sourceFilename === "Example.wikitext"
      ? t("document.title.example")
      : t("document.title.default");

    const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descEl) descEl.content = t("meta.description");
    const ogTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.content = t("meta.og-title");
    const ogDescEl = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.content = t("meta.og-description");
  }, [locale, sourceFilename, t]);
  return null;
}

function InitializationScreen({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <main className="initialization-screen">
      <span className="brand-mark" aria-hidden="true">{"{ }"}</span>
      <h1>{t("brand.name")}</h1>
      {status.kind === "error" ? (
        <>
          <p role="alert">{t(status.messageKey ?? clientErrorMessageKey(status.code))}</p>
          <button type="button" className="secondary-button" onClick={() => location.reload()}>{t("init.retry-worker")}</button>
        </>
      ) : <p>{t("init.initializing")}</p>}
    </main>
  );
}

export default function App({ createFormatterClient = defaultFormatterClientFactory }: AppProps) {
  const [clientFactory] = useState<() => FormatterClientPort>(() => createFormatterClient);
  const [client, setClient] = useState<FormatterClientPort | null>(null);
  const [languagePref, setLanguagePref] = useState<LanguagePreference>(loadStoredLanguagePreference);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formatterVersion, setFormatterVersion] = useState(__WIKITEXT_FMT_VERSION__);
  const [defaults, setDefaults] = useState<ResolvedBrowserOptions | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string>();

  const locale = useResolvedLocale(languagePref);

  useEffect(() => {
    let active = true;
    let created: FormatterClientPort;
    try {
      created = clientFactory();
    } catch (error) {
      queueMicrotask(() => {
        if (active) setStatus(classifyUnexpectedError(error));
      });
      return;
    }
    setClient((previous) => active ? created : previous);
    return () => {
      active = false;
      setClient((previous) => previous === created ? null : previous);
      created.dispose();
    };
  }, [clientFactory]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.ready().then(
      (metadata: { defaults: ResolvedBrowserOptions; version: string }) => {
        if (!active) return;
        setDefaults(metadata.defaults);
        setFormatterVersion(metadata.version);
        setSettings(loadSettings(metadata.defaults));
      },
      (error: unknown) => {
        if (active) setStatus(classifyUnexpectedError(error));
      },
    );
    return () => { active = false; };
  }, [client]);

  if (!client || !settings || !defaults) {
    return (
      <I18nProvider locale={locale}>
        <LocalizedDocumentMetadata />
        <InitializationScreen status={status} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider locale={locale}>
      <LocalizedDocumentMetadata sourceFilename={sourceFilename} />
      <AppMain
        initialSettings={settings}
        defaults={defaults}
        formatterVersion={formatterVersion}
        languagePref={languagePref}
        setLanguagePref={setLanguagePref}
        client={client}
        sourceFilename={sourceFilename}
        setSourceFilename={setSourceFilename}
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
  client: FormatterClientPort;
  sourceFilename?: string;
  setSourceFilename: (filename: string | undefined) => void;
}

function AppMain({
  initialSettings,
  defaults,
  formatterVersion,
  languagePref,
  setLanguagePref,
  client,
  sourceFilename,
  setSourceFilename,
}: AppMainProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceEditorRef = useRef<EditorPaneHandle>(null);
  const outputEditorRef = useRef<EditorPaneHandle>(null);
  const sourceRevisionRef = useRef(0);
  const formatterRevisionRef = useRef(0);
  const formatterOptionsRef = useRef(initialSettings.formatter);
  const formatRunRef = useRef<FormatRun | undefined>(undefined);
  const freshnessRef = useRef<ResultFreshness>("none");
  const sourceReplacementRef = useRef(false);
  const activeFormatRef = useRef(0);
  const busyRef = useRef(false);

  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [formatRun, setFormatRun] = useState<FormatRun>();
  const [freshness, setFreshness] = useState<ResultFreshness>("none");
  const [activityStatus, setActivityStatusState] = useState<Status>({ kind: "idle" });
  const activityStatusRef = useRef<Status>({ kind: "idle" });
  const [notice, setNotice] = useState<keyof MessageCatalog>();
  const [diffVisible, setDiffVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolvedTheme = useResolvedTheme(settings.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    outputEditorRef.current?.setValue(formatRun?.result.formatted ?? "");
  }, [formatRun]);

  // Persist settings on every change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setActivityStatus = useCallback((nextStatus: Status) => {
    activityStatusRef.current = nextStatus;
    setActivityStatusState(nextStatus);
  }, []);

  const updateResultFreshness = useCallback((): ResultFreshness => {
    const nextFreshness = resolveResultFreshness(
      formatRunRef.current,
      sourceRevisionRef.current,
      formatterRevisionRef.current,
    );
    if (nextFreshness !== freshnessRef.current) {
      freshnessRef.current = nextFreshness;
      setFreshness(nextFreshness);
    }
    return nextFreshness;
  }, []);

  const clearFormatRun = useCallback(() => {
    formatRunRef.current = undefined;
    freshnessRef.current = "none";
    setFormatRun(undefined);
    setFreshness("none");
  }, []);

  const handleSourceDocumentChange = useCallback(() => {
    if (sourceReplacementRef.current) {
      return;
    }
    sourceRevisionRef.current += 1;
    updateResultFreshness();
    if (activityStatusRef.current.kind === "applied") {
      setActivityStatus({ kind: "idle" });
    }
  }, [setActivityStatus, updateResultFreshness]);

  const replaceSourceDocument = useCallback((source: string) => {
    sourceReplacementRef.current = true;
    sourceRevisionRef.current += 1;
    try {
      sourceEditorRef.current?.setValue(source);
    } finally {
      sourceReplacementRef.current = false;
    }
    updateResultFreshness();
  }, [updateResultFreshness]);

  const updateFormatter = useCallback((formatter: ResolvedBrowserOptions) => {
    if (areFormatterOptionsEqual(formatterOptionsRef.current, formatter)) {
      return;
    }
    formatterOptionsRef.current = formatter;
    formatterRevisionRef.current += 1;
    updateResultFreshness();
    setSettings((currentSettings) => ({ ...currentSettings, formatter }));
  }, [updateResultFreshness]);

  const replaceAllSettings = useCallback((nextSettings: AppSettings) => {
    if (!areFormatterOptionsEqual(formatterOptionsRef.current, nextSettings.formatter)) {
      formatterOptionsRef.current = nextSettings.formatter;
      formatterRevisionRef.current += 1;
      updateResultFreshness();
    }
    setSettings(nextSettings);
  }, [updateResultFreshness]);

  const format = useCallback(async () => {
    if (busyRef.current) return;
    const sourceEditor = sourceEditorRef.current;
    if (!client || !sourceEditor) {
      setActivityStatus({ kind: "error", code: "worker-not-ready" });
      return;
    }
    const sourceSnapshot = sourceEditor.getValue();
    const sourceRevision = sourceRevisionRef.current;
    const formatterRevision = formatterRevisionRef.current;
    const formatterOptions = formatterOptionsRef.current;
    const operationToken = ++activeFormatRef.current;
    busyRef.current = true;
    setBusy(true);
    setNotice(undefined);
    setActivityStatus({ kind: "formatting" });
    try {
      const operation = await client.format(sourceSnapshot, formatterOptions);
      if (operationToken !== activeFormatRef.current) return;
      if (
        sourceRevision !== sourceRevisionRef.current ||
        formatterRevision !== formatterRevisionRef.current
      ) {
        setActivityStatus({ kind: "idle" });
        setNotice("status.result-discarded");
        return;
      }
      const completedRun: FormatRun = {
        sourceSnapshot,
        sourceRevision,
        formatterRevision,
        result: operation.result,
        durationMs: operation.durationMs,
      };
      formatRunRef.current = completedRun;
      freshnessRef.current = "current";
      setFormatRun(completedRun);
      setFreshness("current");
      setActivityStatus({ kind: "idle" });
    } catch (error) {
      if (operationToken === activeFormatRef.current && !(error instanceof StaleResponseError)) {
        setActivityStatus(classifyUnexpectedError(error));
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
  }, [client, setActivityStatus]);

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
    if (!client) return;
    activeFormatRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setActivityStatus({ kind: "error", code: "request-rejected", messageKey: "status.formatting-stopped" });
    try {
      await client.restart();
    } catch (error) {
      setActivityStatus(classifyUnexpectedError(error));
    }
  }

  async function copyOutput(): Promise<void> {
    try {
      await copyText(formatRunRef.current?.result.formatted ?? "");
      setNotice("copy.success");
    } catch {
      setNotice("copy.denied");
    }
  }

  function applyOutput(): void {
    const run = formatRunRef.current;
    const currentFreshness = resolveResultFreshness(
      run,
      sourceRevisionRef.current,
      formatterRevisionRef.current,
    );
    if (!isApplicableFormatRun(run, currentFreshness)) {
      return;
    }
    replaceSourceDocument(run.result.formatted);
    clearFormatRun();
    setDiffVisible(false);
    setNotice(undefined);
    setActivityStatus({ kind: "applied" });
    queueMicrotask(() => sourceEditorRef.current?.focus());
  }

  async function openFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      replaceSourceDocument(text);
      clearFormatRun();
      setActivityStatus({ kind: "idle" });
      setSourceFilename(file.name);
      setDiffVisible(false);
      setNotice(file.size > LARGE_DOCUMENT_WARNING_BYTES
        ? "editor.large-file-warning"
        : undefined);
    } catch {
      setNotice("editor.file-not-readable");
    }
  }

  function clearDocument(): void {
    replaceSourceDocument("");
    clearFormatRun();
    setActivityStatus({ kind: "idle" });
    setNotice(undefined);
    setDiffVisible(false);
    setSourceFilename(undefined);
    sourceEditorRef.current?.focus();
  }

  function loadExample(): void {
    replaceSourceDocument(EXAMPLE_WIKITEXT);
    clearFormatRun();
    setActivityStatus({ kind: "idle" });
    setNotice(undefined);
    setDiffVisible(false);
    setSourceFilename("Example.wikitext");
    sourceEditorRef.current?.focus();
  }

  function toggleDiff(): void {
    setDiffVisible((visible) => !visible);
  }

  function resetAllSettings(): void {
    clearStoredSettings();
    setLanguagePref("system");
    replaceAllSettings(createDefaultSettings(defaults));
  }

  function handleLanguageChange(lang: LanguagePreference): void {
    setLanguagePref(lang);
    setSettings((s) => ({ ...s, language: lang }));
  }

  const output = formatRun?.result.formatted ?? "";
  const hasOutput = Boolean(formatRun);
  const canApplyOutput = isApplicableFormatRun(formatRun, freshness);
  let status: Status;
  if (activityStatus.kind !== "idle") {
    status = activityStatus;
  } else if (formatRun && freshness === "current") {
    status = classifyResult(formatRun.sourceSnapshot, formatRun.result, formatRun.durationMs);
  } else if (formatRun) {
    const staleFreshness = freshness === "source-outdated" || freshness === "options-outdated"
      ? freshness
      : "outdated";
    status = { kind: "outdated", freshness: staleFreshness };
  } else {
    status = activityStatus;
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
        hasOutput={hasOutput}
        canApplyOutput={canApplyOutput}
        diffVisible={diffVisible}
        onFormat={() => void format()}
        onStop={() => void stopFormatting()}
        onCopy={() => void copyOutput()}
        onDownload={() => triggerTextDownload(output, sourceFilename)}
        onApplyOutput={applyOutput}
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
            <DiffView
              original={formatRun?.sourceSnapshot ?? ""}
              formatted={output}
              outdated={freshness !== "current"}
              lineWrapping={settings.lineWrapping}
              theme={resolvedTheme}
            />
          </Suspense>
        ) : null}
      </main>

      <aside className="lower-rail" aria-label={t("layout.status-diagnostics")}>
        <div className="status-privacy-row">
          <FormatStatus status={status} profile={settings.formatter.profile} webVersion={__WIKITEXT_FMT_WEB_VERSION__} formatterVersion={formatterVersion} />
          <PrivacyNotice />
        </div>
        <DiagnosticsPanel result={formatRun?.result} status={status} notice={notice} />
      </aside>

      {settingsOpen ? (
        <Suspense fallback={null}>
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onFormatterChange={updateFormatter}
            onClose={() => setSettingsOpen(false)}
            onRestoreDefaults={() => updateFormatter({ ...defaults })}
            onReset={resetAllSettings}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
