import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FileUp } from "lucide-react";
import { Toaster, toast } from "sonner";

import { AppHeader } from "../components/AppHeader.js";
import type { EditorPaneHandle } from "../components/EditorPane.js";
import { FormatSeam } from "../components/FormatSeam.js";
import { type OutputTab, OutputPane } from "../components/OutputPane.js";
import { ReportBar } from "../components/ReportBar.js";
import { SourcePane } from "../components/SourcePane.js";
import { computeChangedLines } from "../editor/changedLineDecorations.js";
import { createSiteCompletionSource } from "../editor/siteCompletions.js";
import type { ResolvedTheme } from "../editor/themes.js";
import {
  FormatterClient,
  StaleResponseError,
  WorkerStoppedError,
} from "../formatter/client.js";
import type {
  FormatterMetadata,
  LoadedSiteProfile,
  SiteProfileInput,
  ResolvedBrowserOptions,
} from "../formatter/protocol.js";
import {
  classifyResult,
  classifyUnexpectedError,
  clientErrorMessageKey,
  type FormatStatus as Status,
} from "../formatter/resultSummary.js";
import { I18nProvider } from "../i18n/I18nProvider.js";
import {
  type LanguagePreference,
  resolveLocale,
  type SupportedLocale,
} from "../i18n/locales.js";
import type { MessageCatalog } from "../i18n/types.js";
import { useI18n } from "../i18n/useI18n.js";
import { EXAMPLE_WIKITEXT } from "../samples/example.js";
import { LARGE_DOCUMENT_WARNING_BYTES } from "../settings/defaults.js";
import {
  type AppSettings,
  createDefaultSettings,
  sanitizeFormatterSettings,
  type ThemePreference,
} from "../settings/schema.js";
import {
  clearStoredSettings,
  loadSettings,
  loadStoredLanguagePreference,
  saveSettings,
} from "../settings/storage.js";
import {
  restoreSiteProfile,
  saveSiteProfile,
} from "../settings/siteProfileStorage.js";
import {
  copyText,
  type DocumentStatistics,
  getDocumentStatistics,
  triggerTextDownload,
} from "../utils/document.js";
import { getShortcutLabels } from "../utils/platform.js";
import { withViewTransition } from "../utils/viewTransition.js";
import {
  type FormatRun,
  isApplicableFormatRun,
  resolveResultFreshness,
  type ResultFreshness,
} from "./formatRun.js";

const SettingsPanel = lazy(() => import("../components/SettingsPanel.js"));

export type FormatterClientPort = Pick<
  FormatterClient,
  | "ready"
  | "format"
  | "restart"
  | "dispose"
  | "loadSiteProfile"
  | "templateData"
>;

type MobileView = "source" | "output";

const defaultFormatterClientFactory = (): FormatterClientPort =>
  new FormatterClient();

const EMPTY_STATISTICS = getDocumentStatistics("");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function areOptionValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => areOptionValuesEqual(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(right, key) &&
        areOptionValuesEqual(left[key], right[key]),
    )
  );
}

function areFormatterOptionsEqual(
  left: ResolvedBrowserOptions,
  right: ResolvedBrowserOptions,
): boolean {
  return areOptionValuesEqual(left, right);
}

function siteLocalizationOptions(loaded: LoadedSiteProfile | null) {
  const options = loaded?.options;
  return {
    ...(options?.localizationAliases
      ? { localizationAliases: options.localizationAliases }
      : {}),
    ...(options?.localizationSource
      ? { localizationSource: options.localizationSource }
      : {}),
    ...(options?.localizedSyntaxStyle
      ? { localizedSyntaxStyle: options.localizedSyntaxStyle }
      : {}),
  };
}

function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
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
  const preferred = preference === "system" ? systemTheme : preference;
  // The choice itself updates at once; the page follows with a crossfade.
  const [applied, setApplied] = useState(preferred);
  useEffect(() => {
    if (applied === preferred) return;
    withViewTransition(() => setApplied(preferred));
  }, [applied, preferred]);
  return applied;
}

function useResolvedLocale(preference: LanguagePreference): SupportedLocale {
  return resolveLocale(preference, navigator);
}

function LocalizedDocumentMetadata() {
  const { locale, t } = useI18n();
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("document.title.default");

    const descEl = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (descEl) descEl.content = t("meta.description");
    const ogTitleEl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (ogTitleEl) ogTitleEl.content = t("meta.og-title");
    const ogDescEl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    );
    if (ogDescEl) ogDescEl.content = t("meta.og-description");
  }, [locale, t]);
  return null;
}

function InitializationScreen({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <main className="initialization-screen">
      <p className="wordmark">
        <span className="wordmark-brace" aria-hidden="true">
          {"{{"}
        </span>
        {t("brand.name")}
        <span className="wordmark-brace" aria-hidden="true">
          {"}}"}
        </span>
      </p>
      {status.kind === "error" ? (
        <>
          <p role="alert">
            {t(status.messageKey ?? clientErrorMessageKey(status.code))}
          </p>
          <button
            type="button"
            className="button"
            onClick={() => location.reload()}
          >
            {t("init.reload")}
          </button>
        </>
      ) : (
        <p className="initialization-progress" role="status">
          {t("init.starting")}
        </p>
      )}
    </main>
  );
}

export default function App({
  createFormatterClient = defaultFormatterClientFactory,
}: AppProps) {
  const [clientFactory] = useState<() => FormatterClientPort>(
    () => createFormatterClient,
  );
  const [client, setClient] = useState<FormatterClientPort | null>(null);
  const [languagePref, setLanguagePref] = useState<LanguagePreference>(
    loadStoredLanguagePreference,
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formatterVersion, setFormatterVersion] = useState(
    __WIKITEXT_FMT_VERSION__,
  );
  const [defaults, setDefaults] = useState<ResolvedBrowserOptions | null>(null);
  const [formatterMetadata, setFormatterMetadata] =
    useState<FormatterMetadata | null>(null);
  const [initialSiteProfile, setInitialSiteProfile] =
    useState<LoadedSiteProfile | null>(null);

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
    setClient((previous) => (active ? created : previous));
    return () => {
      active = false;
      setClient((previous) => (previous === created ? null : previous));
      created.dispose();
    };
  }, [clientFactory]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.ready().then(
      async (metadata) => {
        if (!active) return;
        const restored = await restoreSiteProfile((input) =>
          client.loadSiteProfile(input),
        );
        if (!active) return;
        setInitialSiteProfile(restored);
        setDefaults(metadata.defaults);
        setFormatterMetadata(metadata);
        setFormatterVersion(metadata.version);
        setSettings(loadSettings(metadata.defaults));
      },
      (error: unknown) => {
        if (active) setStatus(classifyUnexpectedError(error));
      },
    );
    return () => {
      active = false;
    };
  }, [client]);

  if (!client || !settings || !defaults || !formatterMetadata) {
    return (
      <I18nProvider locale={locale}>
        <LocalizedDocumentMetadata />
        <InitializationScreen status={status} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider locale={locale}>
      <LocalizedDocumentMetadata />
      <AppMain
        initialSettings={settings}
        defaults={defaults}
        profiles={formatterMetadata.profiles}
        profileOverrides={formatterMetadata.profileOverrides}
        formatterVersion={formatterVersion}
        languagePref={languagePref}
        setLanguagePref={setLanguagePref}
        client={client}
        initialSiteProfile={initialSiteProfile}
      />
    </I18nProvider>
  );
}

interface AppMainProps {
  initialSettings: AppSettings;
  defaults: ResolvedBrowserOptions;
  profiles: FormatterMetadata["profiles"];
  profileOverrides: FormatterMetadata["profileOverrides"];
  formatterVersion: string;
  languagePref: LanguagePreference;
  setLanguagePref: (pref: LanguagePreference) => void;
  client: FormatterClientPort;
  initialSiteProfile: LoadedSiteProfile | null;
}

function AppMain({
  initialSettings,
  defaults,
  profiles,
  profileOverrides,
  formatterVersion,
  languagePref,
  setLanguagePref,
  client,
  initialSiteProfile,
}: AppMainProps) {
  const { t, locale } = useI18n();
  const [siteProfile, setSiteProfile] = useState(initialSiteProfile);
  const siteProfileRef = useRef(initialSiteProfile);
  const siteLoadToken = useRef(0);
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteError, setSiteError] = useState<"fetch" | "import" | null>(null);
  const interwiki = useMemo(
    () => siteProfile?.profile.interwiki?.map((entry) => entry.prefix),
    [siteProfile],
  );
  const completionSource = useMemo(
    () =>
      siteProfile
        ? createSiteCompletionSource(
            siteProfile.profile,
            locale,
            (profile, title, language) =>
              client.templateData(profile, title, language),
          )
        : undefined,
    [siteProfile, locale, client],
  );
  const [shortcuts] = useState(getShortcutLabels);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
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
  const [activityStatus, setActivityStatusState] = useState<Status>({
    kind: "idle",
  });
  const activityStatusRef = useRef<Status>({ kind: "idle" });
  const [notice, setNotice] = useState<keyof MessageCatalog>();
  const [outputTab, setOutputTab] = useState<OutputTab>("result");
  const [mobileView, setMobileView] = useState<MobileView>("source");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Loaded on first use, then kept mounted so the sheet can animate out.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sourceFilename, setSourceFilename] = useState<string>();
  const [sourceStatistics, setSourceStatistics] =
    useState<DocumentStatistics>(EMPTY_STATISTICS);

  const resolvedTheme = useResolvedTheme(settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    // Switch every colour at once: the editors repaint instantly, so hover
    // transitions on the chrome would otherwise trail behind them.
    root.dataset.themeSwitching = "";
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => delete root.dataset.themeSwitching),
    );
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const { size, family, ligatures, features } = settings.editorFont;

    root.style.setProperty("--editor-font-size", `${size}px`);

    if (family) {
      root.style.setProperty("--editor-font-family", family);
    } else {
      root.style.removeProperty("--editor-font-family");
    }

    const off = ligatures === "off";
    const editorFeatures = (!off && features) || "normal";
    const set = (name: string, value: string) =>
      root.style.setProperty(name, value);
    set("--editor-font-ligatures", off ? "none" : "normal");
    set("--editor-font-features", editorFeatures);
    if (ligatures === "except-current-line") {
      set("--current-line-font-ligatures", "none");
      set(
        "--current-line-font-features",
        [features, '"liga" 0, "clig" 0, "dlig" 0, "calt" 0']
          .filter(Boolean)
          .join(", "),
      );
    } else {
      set("--current-line-font-ligatures", off ? "none" : "normal");
      set("--current-line-font-features", editorFeatures);
    }
  }, [settings.editorFont]);

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

  const handleSourceDocumentChange = useCallback(
    (statistics: DocumentStatistics) => {
      setSourceStatistics(statistics);
      if (sourceReplacementRef.current) {
        return;
      }
      sourceRevisionRef.current += 1;
      updateResultFreshness();
      if (activityStatusRef.current.kind === "applied") {
        setActivityStatus({ kind: "idle" });
      }
    },
    [setActivityStatus, updateResultFreshness],
  );

  const replaceSourceDocument = useCallback(
    (source: string) => {
      sourceReplacementRef.current = true;
      sourceRevisionRef.current += 1;
      try {
        sourceEditorRef.current?.setValue(source);
      } finally {
        sourceReplacementRef.current = false;
      }
      updateResultFreshness();
    },
    [updateResultFreshness],
  );

  const updateFormatter = useCallback(
    (formatter: ResolvedBrowserOptions) => {
      if (areFormatterOptionsEqual(formatterOptionsRef.current, formatter)) {
        return;
      }
      formatterOptionsRef.current = formatter;
      formatterRevisionRef.current += 1;
      updateResultFreshness();
      setSettings((currentSettings) => ({ ...currentSettings, formatter }));
    },
    [updateResultFreshness],
  );

  const replaceAllSettings = useCallback(
    (nextSettings: AppSettings) => {
      if (
        !areFormatterOptionsEqual(
          formatterOptionsRef.current,
          nextSettings.formatter,
        )
      ) {
        formatterOptionsRef.current = nextSettings.formatter;
        formatterRevisionRef.current += 1;
        updateResultFreshness();
      }
      setSettings(nextSettings);
    },
    [updateResultFreshness],
  );

  function acceptSiteProfile(
    loaded: LoadedSiteProfile | null,
    applyOptions: boolean,
  ): void {
    const localizationChanged = !areOptionValuesEqual(
      siteLocalizationOptions(siteProfileRef.current),
      siteLocalizationOptions(loaded),
    );
    siteProfileRef.current = loaded;
    setSiteProfile(loaded);
    saveSiteProfile(loaded?.serialized ?? null);
    // The profile's localization overlay can change formatting even when all
    // persisted options are identical.
    if (localizationChanged) {
      formatterRevisionRef.current += 1;
      updateResultFreshness();
    }
    if (loaded && applyOptions) {
      updateFormatter(
        sanitizeFormatterSettings(
          { ...formatterOptionsRef.current, ...loaded.options },
          defaults,
        ),
      );
    }
  }

  async function loadSite(
    input: SiteProfileInput,
    applyOptions = true,
  ): Promise<void> {
    const token = ++siteLoadToken.current;
    setSiteBusy(true);
    setSiteError(null);
    try {
      const loaded = await client.loadSiteProfile(input);
      if (token === siteLoadToken.current)
        acceptSiteProfile(loaded, applyOptions);
    } catch {
      if (token === siteLoadToken.current)
        setSiteError("apiUrl" in input ? "fetch" : "import");
    } finally {
      if (token === siteLoadToken.current) setSiteBusy(false);
    }
  }

  function removeSite(): void {
    siteLoadToken.current += 1;
    setSiteBusy(false);
    setSiteError(null);
    acceptSiteProfile(null, false);
  }

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
    const formatterOptions = {
      ...formatterOptionsRef.current,
      ...siteLocalizationOptions(siteProfileRef.current),
    };
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
      // On a phone only one pane fits, so follow the work to the result.
      setMobileView("output");
    } catch (error) {
      if (
        operationToken === activeFormatRef.current &&
        !(error instanceof StaleResponseError)
      ) {
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

  const handleGoToLine = useCallback((line: number) => {
    setMobileView("source");
    sourceEditorRef.current?.goToLine(line);
  }, []);

  const changedLines = useMemo(() => {
    if (!formatRun || freshness !== "current") return new Set<number>();
    return computeChangedLines(
      formatRun.sourceSnapshot,
      formatRun.result.formatted,
    );
  }, [formatRun, freshness]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      // The source editor's own keymap has already formatted.
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void formatRef.current();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  /** Swap in a new source and forget everything derived from the old one. */
  function resetSource(text: string, filename: string | undefined): void {
    replaceSourceDocument(text);
    clearFormatRun();
    setActivityStatus({ kind: "idle" });
    setNotice(undefined);
    setOutputTab("result");
    setMobileView("source");
    setSourceFilename(filename);
  }

  async function stopFormatting(): Promise<void> {
    activeFormatRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setActivityStatus({
      kind: "error",
      code: "request-rejected",
      messageKey: "status.formatting-stopped",
    });
    try {
      await client.restart();
    } catch (error) {
      setActivityStatus(classifyUnexpectedError(error));
    }
  }

  async function copyOutput(): Promise<void> {
    try {
      await copyText(formatRunRef.current?.result.formatted ?? "");
      toast.success(t("copy.success"));
    } catch {
      toast.error(t("copy.denied"));
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
    setOutputTab("result");
    setNotice(undefined);
    setActivityStatus({ kind: "applied" });
    setMobileView("source");
    queueMicrotask(() => sourceEditorRef.current?.focus());
  }

  async function openFile(file: File): Promise<void> {
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error(t("file.not-readable", { name: file.name }));
      return;
    }
    resetSource(text, file.name);
    if (file.size > LARGE_DOCUMENT_WARNING_BYTES) {
      toast.warning(t("file.large"));
    } else {
      toast(t("file.opened", { name: file.name }));
    }
    sourceEditorRef.current?.focus();
  }

  const openFileRef = useRef(openFile);
  useEffect(() => {
    openFileRef.current = openFile;
  });

  async function pasteFromClipboard(): Promise<void> {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error(t("paste.denied", { shortcut: shortcuts.paste }));
      sourceEditorRef.current?.focus();
      return;
    }
    if (!text) {
      toast(t("paste.empty"));
      sourceEditorRef.current?.focus();
      return;
    }
    resetSource(text, undefined);
    sourceEditorRef.current?.focus();
  }

  function clearDocument(): void {
    const previousText = sourceEditorRef.current?.getValue() ?? "";
    const previousFilename = sourceFilename;
    resetSource("", undefined);
    sourceEditorRef.current?.focus();
    if (previousText) {
      toast(t("clear.done"), {
        action: {
          label: t("clear.undo"),
          onClick: () => {
            resetSource(previousText, previousFilename);
            sourceEditorRef.current?.focus();
          },
        },
      });
    }
  }

  function loadExample(): void {
    resetSource(EXAMPLE_WIKITEXT, "Example.wikitext");
    sourceEditorRef.current?.focus();
  }

  function resetAllSettings(): void {
    clearStoredSettings();
    setLanguagePref("system");
    replaceAllSettings(createDefaultSettings(defaults));
    removeSite();
  }

  function handleLanguageChange(lang: LanguagePreference): void {
    withViewTransition(() => {
      setLanguagePref(lang);
      setSettings((s) => ({ ...s, language: lang }));
    });
  }

  function openSettings(): void {
    setSettingsLoaded(true);
    setSettingsOpen(true);
  }

  // Files dropped anywhere on the workspace open as the source. Listening in
  // the capture phase keeps CodeMirror from inserting the file as text.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    let depth = 0;
    function onDragEnter(event: DragEvent): void {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    }
    function onDragOver(event: DragEvent): void {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }
    function onDragLeave(event: DragEvent): void {
      if (!hasDraggedFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    }
    function onDrop(event: DragEvent): void {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void openFileRef.current(file);
    }
    workspace.addEventListener("dragenter", onDragEnter, true);
    workspace.addEventListener("dragover", onDragOver, true);
    workspace.addEventListener("dragleave", onDragLeave, true);
    workspace.addEventListener("drop", onDrop, true);
    return () => {
      workspace.removeEventListener("dragenter", onDragEnter, true);
      workspace.removeEventListener("dragover", onDragOver, true);
      workspace.removeEventListener("dragleave", onDragLeave, true);
      workspace.removeEventListener("drop", onDrop, true);
    };
  }, []);

  const output = formatRun?.result.formatted ?? "";
  const canApplyOutput = isApplicableFormatRun(formatRun, freshness);
  const stale = Boolean(formatRun) && freshness !== "current";
  let status: Status;
  if (activityStatus.kind !== "idle") {
    status = activityStatus;
  } else if (formatRun && freshness === "current") {
    status = classifyResult(
      formatRun.sourceSnapshot,
      formatRun.result,
      formatRun.durationMs,
    );
  } else if (formatRun) {
    const staleFreshness =
      freshness === "source-outdated" || freshness === "options-outdated"
        ? freshness
        : "outdated";
    status = { kind: "outdated", freshness: staleFreshness };
  } else {
    status = activityStatus;
  }

  const presetLabel = t(
    settings.formatter.profile === "production"
      ? "settings.preset.production"
      : "settings.preset.default",
  );

  return (
    <div className="app-shell" data-view={mobileView}>
      <AppHeader
        theme={settings.theme}
        language={languagePref}
        onThemeChange={(theme) => setSettings((s) => ({ ...s, theme }))}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={openSettings}
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

      <div className="view-switch" role="group" aria-label={t("view.label")}>
        <button
          type="button"
          aria-pressed={mobileView === "source"}
          onClick={() => setMobileView("source")}
        >
          {t("view.source")}
        </button>
        <button
          type="button"
          aria-pressed={mobileView === "output"}
          onClick={() => setMobileView("output")}
        >
          {t("view.output")}
          {stale ? <span className="view-dot" aria-hidden="true" /> : null}
        </button>
      </div>

      <main className="workspace" ref={workspaceRef}>
        <SourcePane
          editorRef={sourceEditorRef}
          statistics={sourceStatistics}
          filename={sourceFilename}
          lineWrapping={settings.lineWrapping}
          theme={resolvedTheme}
          interwiki={interwiki}
          completionSource={completionSource}
          hidden={mobileView !== "source"}
          onDocumentChange={handleSourceDocumentChange}
          onFormat={format}
          onOpenFile={() => fileInputRef.current?.click()}
          onClear={clearDocument}
          onPaste={() => void pasteFromClipboard()}
          onExample={loadExample}
        />
        <FormatSeam
          busy={busy}
          stale={stale}
          shortcuts={shortcuts}
          onFormat={() => void format()}
          onStop={() => void stopFormatting()}
        />
        <OutputPane
          editorRef={outputEditorRef}
          run={formatRun}
          freshness={freshness}
          changedLines={changedLines}
          canApply={canApplyOutput}
          tab={outputTab}
          sourceFilename={sourceFilename}
          lineWrapping={settings.lineWrapping}
          theme={resolvedTheme}
          shortcuts={shortcuts}
          hidden={mobileView !== "output"}
          interwiki={interwiki}
          onTabChange={setOutputTab}
          onCopy={() => void copyOutput()}
          onDownload={() => triggerTextDownload(output, sourceFilename)}
          onApply={applyOutput}
        />
        {dragging ? (
          <div className="drop-overlay" aria-hidden="true">
            <div className="drop-card">
              <FileUp size={28} />
              <p className="drop-title">{t("drop.title")}</p>
              <p>{t("drop.body")}</p>
            </div>
          </div>
        ) : null}
      </main>

      <ReportBar
        status={status}
        result={formatRun?.result}
        notice={notice}
        presetLabel={presetLabel}
        shortcuts={shortcuts}
        onAdjust={openSettings}
        onGoToLine={handleGoToLine}
      />

      <Toaster
        position="bottom-center"
        theme={resolvedTheme}
        offset={{ bottom: 64 }}
        mobileOffset={{ bottom: 132 }}
        toastOptions={{ className: "toast" }}
      />

      {settingsLoaded ? (
        <Suspense fallback={null}>
          <SettingsPanel
            open={settingsOpen}
            settings={settings}
            onChange={setSettings}
            onFormatterChange={updateFormatter}
            onClose={() => setSettingsOpen(false)}
            onRestoreDefaults={() => updateFormatter({ ...defaults })}
            profiles={profiles}
            profileOverrides={profileOverrides}
            formatterVersion={formatterVersion}
            webVersion={__WIKITEXT_FMT_WEB_VERSION__}
            onReset={resetAllSettings}
            siteProfile={siteProfile}
            siteBusy={siteBusy}
            siteError={siteError}
            onLoadSite={(input) => void loadSite(input)}
            onRemoveSite={removeSite}
            onTemplateDataChange={(enabled) => {
              if (siteProfile) {
                void loadSite(
                  {
                    json: JSON.stringify({
                      ...siteProfile.profile,
                      extensions: { templateData: enabled },
                    }),
                  },
                  false,
                );
              }
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
