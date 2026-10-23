import { type ReactNode, useId, useRef, useState } from "react";

import { X } from "lucide-react";
import { Dialog, Switch } from "radix-ui";

import { CORE_REPOSITORY_URL } from "../app/routes.js";
import { DEFAULT_MONO_FONT_STACK } from "../editor/themes.js";
import type {
  FormatterProfileOverrides,
  FormatterProfiles,
  LoadedSiteProfile,
  SiteProfileInput,
  ResolvedBrowserOptions,
} from "../formatter/protocol.js";
import type { MessageCatalog } from "../i18n/types.js";
import { useI18n } from "../i18n/useI18n.js";
import {
  applyCoreProfile,
  type AppSettings,
  isValidCssFontFamily,
  isValidCssFontFeatures,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
} from "../settings/schema.js";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onFormatterChange: (formatter: ResolvedBrowserOptions) => void;
  onClose: () => void;
  onRestoreDefaults: () => void;
  onReset: () => void;
  profiles: FormatterProfiles;
  profileOverrides: FormatterProfileOverrides;
  formatterVersion: string;
  webVersion: string;
  siteProfile: LoadedSiteProfile | null;
  siteBusy: boolean;
  siteError: "fetch" | "import" | null;
  onLoadSite: (input: SiteProfileInput) => void;
  onRemoveSite: () => void;
  onTemplateDataChange: (enabled: boolean) => void;
}

type Options = ResolvedBrowserOptions;

const MIN_LINE_WIDTH = 20;
const MAX_LINE_WIDTH = 500;

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  children,
  disabled,
}: ToggleRowProps) {
  const id = useId();
  return (
    <div className="setting-row">
      <div className="setting-toggle">
        <div className="setting-text">
          <label htmlFor={id}>{label}</label>
          {hint ? (
            <p id={`${id}-hint`} className="setting-hint">
              {hint}
            </p>
          ) : null}
        </div>
        <Switch.Root
          id={id}
          className="switch"
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-describedby={hint ? `${id}-hint` : undefined}
        >
          <Switch.Thumb className="switch-thumb" />
        </Switch.Root>
      </div>
      {children && checked ? (
        <div className="setting-children">{children}</div>
      ) : null}
    </div>
  );
}

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  preview?: string;
}

interface ChoiceRowProps<T extends string> {
  legend: string;
  hint?: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Set when a section heading already names the choice. */
  hideLegend?: boolean;
}

function ChoiceRow<T extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
  disabled,
  hideLegend,
}: ChoiceRowProps<T>) {
  const name = useId();
  const hasPreview = options.some((option) => option.preview);
  return (
    <fieldset
      className="setting-row setting-choice"
      disabled={disabled}
      aria-describedby={hint ? `${name}-hint` : undefined}
    >
      <legend className={hideLegend ? "visually-hidden" : undefined}>
        {legend}
      </legend>
      <div className={`segmented ${hasPreview ? "has-preview" : ""}`}>
        {options.map((option) => (
          <label key={option.value} className="segment">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="segment-face">
              <span className="segment-label">{option.label}</span>
              {option.preview ? (
                <code className="segment-preview" aria-hidden="true">
                  {option.preview}
                </code>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={`${name}-hint`} className="setting-hint">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

function LineWidthField({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [committed, setCommitted] = useState(value);
  // Follow outside changes such as a preset switch or restored defaults.
  if (committed !== value) {
    setCommitted(value);
    setDraft(String(value));
  }
  return (
    <div className="setting-row setting-field">
      <div className="setting-text">
        <label htmlFor={id}>{t("settings.line-width")}</label>
        <p id={`${id}-hint`} className="setting-hint">
          {t("settings.line-width.hint")}
        </p>
      </div>
      <input
        id={id}
        className="number-input"
        type="number"
        inputMode="numeric"
        min={MIN_LINE_WIDTH}
        max={MAX_LINE_WIDTH}
        value={draft}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = Number(event.target.value);
          // Only whole numbers in range reach the formatter; partial input
          // such as "8" while typing "88" stays a draft.
          if (
            Number.isInteger(next) &&
            next >= MIN_LINE_WIDTH &&
            next <= MAX_LINE_WIDTH
          ) {
            setCommitted(next);
            onCommit(next);
          }
        }}
        onBlur={() => setDraft(String(value))}
      />
    </div>
  );
}

function FontSizeField({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [committed, setCommitted] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  if (committed !== value) {
    setCommitted(value);
    setDraft(String(value));
    setIsInvalid(false);
  }

  function commit(): void {
    const trimmed = draft.trim();
    const next = Number(trimmed);
    if (
      trimmed !== "" &&
      Number.isFinite(next) &&
      next >= MIN_EDITOR_FONT_SIZE &&
      next <= MAX_EDITOR_FONT_SIZE
    ) {
      setIsInvalid(false);
      setDraft(String(next));
      if (next !== value) {
        setCommitted(next);
        onCommit(next);
      }
    } else {
      setIsInvalid(true);
    }
  }

  return (
    <div className="setting-row setting-field">
      <div className="setting-text">
        <label htmlFor={id}>{t("settings.font-size")}</label>
      </div>
      <input
        id={id}
        className="number-input"
        type="number"
        inputMode="decimal"
        min={MIN_EDITOR_FONT_SIZE}
        max={MAX_EDITOR_FONT_SIZE}
        step={0.5}
        value={draft}
        aria-invalid={isInvalid ? "true" : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setIsInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

function CssValueField({
  label,
  hint,
  placeholder,
  value,
  disabled = false,
  isValid,
  onCommit,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  isValid: (value: string) => boolean;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  if (committed !== value) {
    setCommitted(value);
    setDraft(value);
    setIsInvalid(false);
  }

  function commit(): void {
    const next = draft.trim();
    if (next !== "" && !isValid(next)) {
      setIsInvalid(true);
      return;
    }
    setIsInvalid(false);
    setDraft(next);
    if (next !== value) {
      setCommitted(next);
      onCommit(next);
    }
  }

  return (
    <div
      className={`setting-row setting-field is-stacked${disabled ? " is-disabled" : ""}`}
    >
      <div className="setting-text">
        <label htmlFor={id}>{label}</label>
        <p id={`${id}-hint`} className="setting-hint">
          {hint}
        </p>
      </div>
      <input
        id={id}
        className="text-input"
        type="text"
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        value={draft}
        aria-invalid={isInvalid ? "true" : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          setDraft(event.target.value);
          setIsInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

function parsePrefixes(text: string): string[] {
  return text
    .split(/[\s,，、]+/u)
    .map((prefix) => prefix.trim())
    .filter(Boolean);
}

type SiteSettingsProps = Pick<
  SettingsPanelProps,
  | "siteProfile"
  | "siteBusy"
  | "siteError"
  | "onLoadSite"
  | "onRemoveSite"
  | "onTemplateDataChange"
>;

function SiteSettings({
  siteProfile,
  siteBusy,
  siteError,
  onLoadSite,
  onRemoveSite,
  onTemplateDataChange,
}: SiteSettingsProps) {
  const { t } = useI18n();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const profile = siteProfile?.profile;
  const [apiUrl, setApiUrl] = useState(profile?.apiUrl ?? "");
  const [previousUrl, setPreviousUrl] = useState(profile?.apiUrl);
  const [readError, setReadError] = useState(false);
  if (previousUrl !== profile?.apiUrl) {
    setPreviousUrl(profile?.apiUrl);
    setApiUrl(profile?.apiUrl ?? "");
  }

  function exportProfile(): void {
    if (!siteProfile) return;
    const url = URL.createObjectURL(
      new Blob([siteProfile.serialized], {
        type: "application/json;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    const name = Array.from(siteProfile.profile.name, (character) =>
      character.charCodeAt(0) < 32 ? "_" : character,
    ).join("");
    anchor.download = `${name.replace(/[<>:"/\\|?*]/gu, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SettingsSection title={t("settings.section.site")}>
      <div className="setting-row site-summary">
        {profile ? (
          <strong>{profile.name}</strong>
        ) : (
          <span className="setting-hint">{t("settings.site.none")}</span>
        )}
        {profile?.apiUrl ? (
          <span className="setting-hint site-api">{profile.apiUrl}</span>
        ) : null}
        {profile ? (
          <span className="setting-hint">
            {t("settings.site.counts", {
              templates: Object.keys(profile.templates ?? {}).length,
              interwiki: profile.interwiki?.length ?? 0,
            })}
          </span>
        ) : null}
      </div>
      <form
        className="setting-row site-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setReadError(false);
          onLoadSite({ apiUrl: apiUrl.trim() });
        }}
      >
        <label className="setting-label" htmlFor={id}>
          {t("settings.site.api")}
        </label>
        <div className="site-api-field">
          <input
            id={id}
            className="text-input"
            type="url"
            value={apiUrl}
            placeholder="https://example.org/w/api.php"
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setApiUrl(event.target.value)}
          />
          <button
            className="button"
            type="submit"
            disabled={siteBusy || !apiUrl.trim()}
          >
            {t(siteBusy ? "settings.site.loading" : "settings.site.fetch")}
          </button>
        </div>
      </form>
      <div className="setting-row site-actions">
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          tabIndex={-1}
          aria-label={t("settings.site.import")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setReadError(false);
            void file.text().then(
              (json) => onLoadSite({ json }),
              () => setReadError(true),
            );
          }}
        />
        <button
          className="button"
          type="button"
          disabled={siteBusy}
          onClick={() => fileInput.current?.click()}
        >
          {t("settings.site.import")}
        </button>
        <button
          className="button"
          type="button"
          disabled={!profile || siteBusy}
          onClick={exportProfile}
        >
          {t("settings.site.export")}
        </button>
        <button
          className="button is-quiet is-destructive"
          type="button"
          disabled={!profile && !siteBusy}
          onClick={() => {
            setReadError(false);
            onRemoveSite();
          }}
        >
          {t("settings.site.remove")}
        </button>
      </div>
      {profile ? (
        <ToggleRow
          label={t("settings.site.template-data")}
          hint={t("settings.site.template-data.hint")}
          checked={profile.extensions.templateData}
          disabled={siteBusy}
          onChange={onTemplateDataChange}
        />
      ) : null}
      {siteError || readError ? (
        <p role="alert" className="setting-hint site-error">
          {t(
            siteError === "fetch" && !readError
              ? "settings.site.fetch-error"
              : "settings.site.import-error",
          )}
        </p>
      ) : null}
    </SettingsSection>
  );
}

function PrefixesField({
  value,
  onCommit,
}: {
  value: readonly string[];
  onCommit: (value: string[]) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const joined = value.join(", ");
  const [draft, setDraft] = useState(joined);
  const [committed, setCommitted] = useState(joined);
  if (committed !== joined) {
    setCommitted(joined);
    setDraft(joined);
  }
  function commit(): void {
    const next = parsePrefixes(draft);
    setDraft(next.join(", "));
    if (next.join(", ") !== joined) onCommit(next);
  }
  return (
    <div className="setting-row setting-field is-stacked">
      <div className="setting-text">
        <label htmlFor={id}>{t("settings.interlanguage-prefixes")}</label>
        <p id={`${id}-hint`} className="setting-hint">
          {t("settings.interlanguage-prefixes.hint")}
        </p>
      </div>
      <textarea
        id={id}
        className="text-input"
        rows={2}
        spellCheck={false}
        value={draft}
        aria-describedby={`${id}-hint`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
    </div>
  );
}

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onFormatterChange,
  onClose,
  onRestoreDefaults,
  onReset,
  profiles,
  profileOverrides,
  formatterVersion,
  webVersion,
  siteProfile,
  siteBusy,
  siteError,
  onLoadSite,
  onRemoveSite,
  onTemplateDataChange,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const formatter = settings.formatter;
  // The panel opens from more than one control and has no Dialog.Trigger, so
  // remember whichever one opened it and hand focus back there on close.
  const opener = useRef<HTMLElement | null>(null);

  function update<K extends keyof Options>(key: K, value: Options[K]): void {
    onFormatterChange({ ...formatter, [key]: value });
  }

  function toggle(
    key: {
      [K in keyof Options]: Options[K] extends boolean ? K : never;
    }[keyof Options],
    labelKey: keyof MessageCatalog,
    hintKey: keyof MessageCatalog,
    children?: ReactNode,
  ) {
    return (
      <ToggleRow
        label={t(labelKey)}
        hint={t(hintKey)}
        checked={formatter[key]}
        onChange={(value) => update(key, value)}
      >
        {children}
      </ToggleRow>
    );
  }

  const placementOptions: ChoiceOption<Options["interlanguagePlacement"]>[] = [
    { value: "preserve", label: t("settings.placement.preserve") },
    { value: "footer", label: t("settings.placement.footer") },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          className="sheet"
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            if (!opener.current?.isConnected) return;
            event.preventDefault();
            opener.current.focus();
          }}
        >
          <header className="sheet-header">
            <Dialog.Title className="sheet-title">
              {t("settings.title")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button"
                aria-label={t("settings.close")}
                title={t("settings.close")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          <div className="sheet-body">
            <SettingsSection title={t("settings.preset")}>
              <ChoiceRow
                legend={t("settings.preset")}
                hideLegend
                value={formatter.profile}
                hint={
                  formatter.profile === "production"
                    ? t("settings.preset.production.hint")
                    : t("settings.preset.default.hint")
                }
                options={[
                  { value: "default", label: t("settings.preset.default") },
                  {
                    value: "production",
                    label: t("settings.preset.production"),
                  },
                ]}
                onChange={(profile) =>
                  onFormatterChange(
                    applyCoreProfile(
                      formatter,
                      profile,
                      profiles,
                      profileOverrides,
                    ),
                  )
                }
              />
            </SettingsSection>

            <SettingsSection title={t("settings.section.templates")}>
              {toggle(
                "formatTemplates",
                "settings.format-templates",
                "settings.format-templates.hint",
                <>
                  <LineWidthField
                    value={formatter.lineWidth}
                    onCommit={(lineWidth) => update("lineWidth", lineWidth)}
                  />
                  <ChoiceRow
                    legend={t("settings.inline-spacing")}
                    hint={t("settings.inline-spacing.hint")}
                    value={formatter.inlineTemplateSpacing}
                    options={[
                      {
                        value: "auto",
                        label: t("settings.inline-spacing.auto"),
                      },
                      {
                        value: "compact",
                        label: t("settings.inline-spacing.compact"),
                        preview: "{{a|b=1}}",
                      },
                      {
                        value: "spaced",
                        label: t("settings.inline-spacing.spaced"),
                        preview: "{{ a | b = 1 }}",
                      },
                    ]}
                    onChange={(value) => update("inlineTemplateSpacing", value)}
                  />
                  <ChoiceRow
                    legend={t("settings.parameter-layout")}
                    value={formatter.templateParameterLayout}
                    options={[
                      {
                        value: "compact",
                        label: t("settings.parameter-layout.compact"),
                        preview: "|name=value",
                      },
                      {
                        value: "flush",
                        label: t("settings.parameter-layout.flush"),
                        preview: "| name = value",
                      },
                      {
                        value: "indented",
                        label: t("settings.parameter-layout.indented"),
                        preview: " | name = value",
                      },
                    ]}
                    onChange={(value) =>
                      update("templateParameterLayout", value)
                    }
                  />
                </>,
              )}
            </SettingsSection>

            <SettingsSection title={t("settings.section.tables")}>
              {toggle(
                "formatTables",
                "settings.format-tables",
                "settings.format-tables.hint",
                <ChoiceRow
                  legend={t("settings.cell-separator")}
                  hint={t("settings.cell-separator.hint")}
                  value={formatter.tableCellSeparatorStyle}
                  options={[
                    {
                      value: "preserve",
                      label: t("settings.cell-separator.preserve"),
                    },
                    { value: "auto", label: t("settings.cell-separator.auto") },
                    {
                      value: "split",
                      label: t("settings.cell-separator.split"),
                    },
                  ]}
                  onChange={(value) => update("tableCellSeparatorStyle", value)}
                />,
              )}
            </SettingsSection>

            <SettingsSection title={t("settings.section.structure")}>
              {toggle(
                "formatHeadings",
                "settings.headings",
                "settings.headings.hint",
              )}
              {toggle("formatLists", "settings.lists", "settings.lists.hint")}
              {toggle(
                "formatSectionSpacing",
                "settings.section-spacing",
                "settings.section-spacing.hint",
              )}
              {toggle(
                "normalizeBlankLines",
                "settings.normalize-blank-lines",
                "settings.normalize-blank-lines.hint",
              )}
              <ChoiceRow
                legend={t("settings.html-void-tags")}
                hint={t("settings.html-void-tags.hint")}
                value={formatter.htmlVoidTagStyle}
                options={[
                  { value: "html5", label: t("settings.html-void-tags.html5") },
                  { value: "xhtml", label: t("settings.html-void-tags.xhtml") },
                  {
                    value: "preserve",
                    label: t("settings.html-void-tags.preserve"),
                  },
                ]}
                onChange={(value) => update("htmlVoidTagStyle", value)}
              />
            </SettingsSection>

            <SettingsSection title={t("settings.section.links")}>
              {toggle(
                "formatWikilinks",
                "settings.wikilinks",
                "settings.wikilinks.hint",
              )}
              {toggle(
                "formatExternalLinks",
                "settings.external-links",
                "settings.external-links.hint",
              )}
              {toggle(
                "formatFileLinks",
                "settings.file-links",
                "settings.file-links.hint",
              )}
              {toggle(
                "formatReferences",
                "settings.references",
                "settings.references.hint",
              )}
              {toggle(
                "formatRedirects",
                "settings.redirects",
                "settings.redirects.hint",
              )}
              {toggle(
                "formatCategories",
                "settings.categories",
                "settings.categories.hint",
              )}
              {toggle(
                "formatBehaviorSwitches",
                "settings.behavior-switches",
                "settings.behavior-switches.hint",
                <ChoiceRow
                  legend={t("settings.behavior-switch-placement")}
                  value={formatter.behaviorSwitchPlacement}
                  options={placementOptions}
                  onChange={(value) => update("behaviorSwitchPlacement", value)}
                />,
              )}
              {toggle(
                "formatInterlanguageLinks",
                "settings.interlanguage-links",
                "settings.interlanguage-links.hint",
                <>
                  <ChoiceRow
                    legend={t("settings.interlanguage-placement")}
                    value={formatter.interlanguagePlacement}
                    options={placementOptions}
                    onChange={(value) =>
                      update("interlanguagePlacement", value)
                    }
                  />
                  <PrefixesField
                    value={formatter.interlanguagePrefixes}
                    onCommit={(prefixes) =>
                      update("interlanguagePrefixes", prefixes)
                    }
                  />
                </>,
              )}
            </SettingsSection>

            <SiteSettings
              siteProfile={siteProfile}
              siteBusy={siteBusy}
              siteError={siteError}
              onLoadSite={onLoadSite}
              onRemoveSite={onRemoveSite}
              onTemplateDataChange={onTemplateDataChange}
            />
            <SettingsSection title={t("settings.section.editor")}>
              <ChoiceRow
                legend={t("theme.label")}
                value={settings.theme}
                options={[
                  { value: "system", label: t("theme.system") },
                  { value: "light", label: t("theme.light") },
                  { value: "dark", label: t("theme.dark") },
                ]}
                onChange={(theme) => onChange({ ...settings, theme })}
              />
              <ToggleRow
                label={t("settings.wrap-lines")}
                checked={settings.lineWrapping}
                onChange={(lineWrapping) =>
                  onChange({ ...settings, lineWrapping })
                }
              />
              <FontSizeField
                value={settings.editorFont.size}
                onCommit={(size) =>
                  onChange({
                    ...settings,
                    editorFont: { ...settings.editorFont, size },
                  })
                }
              />
              <CssValueField
                label={t("settings.font-family")}
                hint={t("settings.font-family.hint")}
                placeholder={DEFAULT_MONO_FONT_STACK}
                value={settings.editorFont.family}
                isValid={isValidCssFontFamily}
                onCommit={(family) =>
                  onChange({
                    ...settings,
                    editorFont: { ...settings.editorFont, family },
                  })
                }
              />
              <ChoiceRow
                legend={t("settings.font-ligatures")}
                value={settings.editorFont.ligatures}
                options={[
                  {
                    value: "off",
                    label: t("settings.font-ligatures.off"),
                  },
                  {
                    value: "on",
                    label: t("settings.font-ligatures.on"),
                  },
                  {
                    value: "except-current-line",
                    label: t("settings.font-ligatures.except-current-line"),
                  },
                ]}
                onChange={(ligatures) =>
                  onChange({
                    ...settings,
                    editorFont: { ...settings.editorFont, ligatures },
                  })
                }
              />
              <CssValueField
                label={t("settings.font-features")}
                hint={t("settings.font-features.hint")}
                placeholder="normal"
                value={settings.editorFont.features}
                isValid={isValidCssFontFeatures}
                disabled={settings.editorFont.ligatures === "off"}
                onCommit={(features) =>
                  onChange({
                    ...settings,
                    editorFont: { ...settings.editorFont, features },
                  })
                }
              />
            </SettingsSection>

            <SettingsSection title={t("settings.section.advanced")}>
              <ChoiceRow
                legend={t("settings.level")}
                hint={t("settings.level.hint")}
                value={formatter.level}
                options={[
                  { value: "safe", label: t("settings.level.safe") },
                  { value: "normal", label: t("settings.level.normal") },
                  {
                    value: "experimental",
                    label: t("settings.level.experimental"),
                  },
                ]}
                onChange={(value) => update("level", value)}
              />
              <div className="setting-row setting-field">
                <div className="setting-text">
                  <span className="setting-label">{t("settings.version")}</span>
                </div>
                <span className="setting-value">
                  {t("settings.version.value", {
                    fmt: formatterVersion,
                    web: webVersion,
                  })}
                  <a
                    href={CORE_REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("settings.version.engine")}
                  </a>
                </span>
              </div>
            </SettingsSection>
          </div>

          <div className="sheet-footer">
            <button
              type="button"
              className="button"
              onClick={onRestoreDefaults}
            >
              {t("settings.restore-defaults")}
            </button>
            <button
              type="button"
              className="button is-quiet is-destructive"
              title={t("settings.reset-all.title")}
              onClick={onReset}
            >
              {t("settings.reset-all")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
