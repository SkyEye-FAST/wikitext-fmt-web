import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { useI18n } from "../i18n/useI18n.js";
import { applyCoreProfile, type AppSettings } from "../settings/schema.js";

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onFormatterChange: (formatter: ResolvedBrowserOptions) => void;
  onClose: () => void;
  onRestoreDefaults: () => void;
  onReset: () => void;
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="setting-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function SettingsPanel({
  settings,
  onChange,
  onFormatterChange,
  onClose,
  onRestoreDefaults,
  onReset,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const formatter = settings.formatter;

  function updateFormatter<K extends keyof ResolvedBrowserOptions>(
    key: K,
    value: ResolvedBrowserOptions[K],
  ): void {
    onFormatterChange({ ...formatter, [key]: value });
  }

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const focusable = [...panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
      )];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="settings-panel-header">
          <h2 id="settings-title">{t("settings.title")}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("settings.close")} title={t("settings.close")}>
            <X size={20} />
          </button>
        </div>
        <div className="settings-scroll">
          <fieldset>
            <legend>{t("settings.general")}</legend>
            <label><span>{t("settings.profile")}</span>
              <select value={formatter.profile} onChange={(event) => onFormatterChange(
                applyCoreProfile(formatter, event.target.value as ResolvedBrowserOptions["profile"]),
              )}>
                <option value="default">{t("settings.profile.default")}</option><option value="production">{t("settings.profile.production")}</option><option value="aggressive">{t("settings.profile.aggressive")}</option>
              </select>
            </label>
            <label><span>{t("settings.line-width")}</span>
              <input type="number" min="20" max="500" value={formatter.lineWidth} onChange={(event) => updateFormatter("lineWidth", Number(event.target.value))} />
            </label>
            <label><span>{t("settings.formatting-level")}</span>
              <select value={formatter.level} onChange={(event) => updateFormatter("level", event.target.value as ResolvedBrowserOptions["level"])}>
                <option value="safe">{t("settings.level.safe")}</option><option value="normal">{t("settings.level.normal")}</option><option value="experimental">{t("settings.level.experimental")}</option>
              </select>
            </label>
            <ToggleField label={t("settings.wrap-lines")} checked={settings.lineWrapping} onChange={(lineWrapping) => onChange({ ...settings, lineWrapping })} />
          </fieldset>

          <fieldset>
            <legend>{t("settings.templates")}</legend>
            <ToggleField label={t("settings.format-templates")} checked={formatter.formatTemplates} onChange={(value) => updateFormatter("formatTemplates", value)} />
            <label><span>{t("settings.inline-spacing")}</span>
              <select value={formatter.inlineTemplateSpacing} onChange={(event) => updateFormatter("inlineTemplateSpacing", event.target.value as ResolvedBrowserOptions["inlineTemplateSpacing"])}>
                <option value="auto">{t("settings.inline-spacing.auto")}</option><option value="compact">{t("settings.inline-spacing.compact")}</option><option value="spaced">{t("settings.inline-spacing.spaced")}</option>
              </select>
            </label>
            <label><span>{t("settings.parameter-layout")}</span>
              <select value={formatter.templateParameterLayout} onChange={(event) => updateFormatter("templateParameterLayout", event.target.value as ResolvedBrowserOptions["templateParameterLayout"])}>
                <option value="compact">{t("settings.parameter-layout.compact")}</option><option value="flush">{t("settings.parameter-layout.flush")}</option><option value="indented">{t("settings.parameter-layout.indented")}</option>
              </select>
            </label>
            <ToggleField label={t("settings.format-template-params")} checked={formatter.formatTemplateParameters} onChange={(value) => updateFormatter("formatTemplateParameters", value)} />
          </fieldset>

          <fieldset>
            <legend>{t("settings.tables")}</legend>
            <ToggleField label={t("settings.format-tables")} checked={formatter.formatTables} onChange={(value) => updateFormatter("formatTables", value)} />
            <label><span>{t("settings.cell-separator")}</span>
              <select value={formatter.tableCellSeparatorStyle} onChange={(event) => updateFormatter("tableCellSeparatorStyle", event.target.value as ResolvedBrowserOptions["tableCellSeparatorStyle"])}>
                <option value="auto">{t("settings.cell-separator.auto")}</option><option value="split">{t("settings.cell-separator.split")}</option><option value="preserve">{t("settings.cell-separator.preserve")}</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>{t("settings.structure")}</legend>
            <ToggleField label={t("settings.headings")} checked={formatter.formatHeadings} onChange={(value) => updateFormatter("formatHeadings", value)} />
            <ToggleField label={t("settings.lists")} checked={formatter.formatLists} onChange={(value) => updateFormatter("formatLists", value)} />
            <ToggleField label={t("settings.section-spacing")} checked={formatter.formatSectionSpacing} onChange={(value) => updateFormatter("formatSectionSpacing", value)} />
            <ToggleField label={t("settings.normalize-blank-lines")} checked={formatter.normalizeBlankLines} onChange={(value) => updateFormatter("normalizeBlankLines", value)} />
            <label><span>{t("settings.html-void-tags")}</span>
              <select value={formatter.htmlVoidTagStyle} onChange={(event) => updateFormatter("htmlVoidTagStyle", event.target.value as ResolvedBrowserOptions["htmlVoidTagStyle"])}>
                <option value="html5">{t("settings.html-void-tags.html5")}</option><option value="xhtml">{t("settings.html-void-tags.xhtml")}</option><option value="preserve">{t("settings.html-void-tags.preserve")}</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>{t("settings.links-metadata")}</legend>
            <div className="settings-columns">
              <ToggleField label={t("settings.categories")} checked={formatter.formatCategories} onChange={(value) => updateFormatter("formatCategories", value)} />
              <ToggleField label={t("settings.file-links")} checked={formatter.formatFileLinks} onChange={(value) => updateFormatter("formatFileLinks", value)} />
              <ToggleField label={t("settings.wikilinks")} checked={formatter.formatWikilinks} onChange={(value) => updateFormatter("formatWikilinks", value)} />
              <ToggleField label={t("settings.external-links")} checked={formatter.formatExternalLinks} onChange={(value) => updateFormatter("formatExternalLinks", value)} />
              <ToggleField label={t("settings.references")} checked={formatter.formatReferences} onChange={(value) => updateFormatter("formatReferences", value)} />
              <ToggleField label={t("settings.redirects")} checked={formatter.formatRedirects} onChange={(value) => updateFormatter("formatRedirects", value)} />
              <ToggleField label={t("settings.behavior-switches")} checked={formatter.formatBehaviorSwitches} onChange={(value) => updateFormatter("formatBehaviorSwitches", value)} />
              <ToggleField label={t("settings.interlanguage-links")} checked={formatter.formatInterlanguageLinks} onChange={(value) => updateFormatter("formatInterlanguageLinks", value)} />
            </div>
            <label><span>{t("settings.interlanguage-placement")}</span>
              <select value={formatter.interlanguagePlacement} onChange={(event) => updateFormatter("interlanguagePlacement", event.target.value as ResolvedBrowserOptions["interlanguagePlacement"])}>
                <option value="preserve">{t("settings.interlanguage-placement.preserve")}</option><option value="footer">{t("settings.interlanguage-placement.footer")}</option>
              </select>
            </label>
            <label><span>{t("settings.behavior-switch-placement")}</span>
              <select value={formatter.behaviorSwitchPlacement} onChange={(event) => updateFormatter("behaviorSwitchPlacement", event.target.value as ResolvedBrowserOptions["behaviorSwitchPlacement"])}>
                <option value="preserve">{t("settings.behavior-switch-placement.preserve")}</option><option value="footer">{t("settings.behavior-switch-placement.footer")}</option>
              </select>
            </label>
            <label className="setting-wide"><span>{t("settings.interlanguage-prefixes")}</span>
              <textarea rows={3} value={formatter.interlanguagePrefixes.join(", ")} onChange={(event) => updateFormatter("interlanguagePrefixes", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />
            </label>
          </fieldset>

          <div className="parser-config-row">
            <span>{t("settings.parser-config")}</span>
            <output>{t("settings.parser-config.value")}</output>
          </div>
        </div>
        <div className="settings-panel-footer">
          <button type="button" className="secondary-button" onClick={onRestoreDefaults}>{t("settings.restore-core-defaults")}</button>
          <button type="button" className="text-button" onClick={onReset}>{t("settings.reset-settings")}</button>
        </div>
      </div>
    </div>
  );
}
