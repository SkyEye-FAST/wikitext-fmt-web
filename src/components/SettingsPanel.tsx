import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { applyCoreProfile, type AppSettings } from "../settings/schema.js";

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
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
  onClose,
  onRestoreDefaults,
  onReset,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const formatter = settings.formatter;

  function updateFormatter<K extends keyof ResolvedBrowserOptions>(
    key: K,
    value: ResolvedBrowserOptions[K],
  ): void {
    onChange({
      ...settings,
      formatter: { ...formatter, [key]: value },
    });
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
          <h2 id="settings-title">Formatter settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings" title="Close settings">
            <X size={20} />
          </button>
        </div>
        <div className="settings-scroll">
          <fieldset>
            <legend>General</legend>
            <label><span>Profile</span>
              <select value={formatter.profile} onChange={(event) => onChange({
                ...settings,
                formatter: applyCoreProfile(formatter, event.target.value as ResolvedBrowserOptions["profile"]),
              })}>
                <option value="default">Default</option><option value="production">Production</option><option value="aggressive">Aggressive</option>
              </select>
            </label>
            <label><span>Line width</span>
              <input type="number" min="20" max="500" value={formatter.lineWidth} onChange={(event) => updateFormatter("lineWidth", Number(event.target.value))} />
            </label>
            <label><span>Formatting level</span>
              <select value={formatter.level} onChange={(event) => updateFormatter("level", event.target.value as ResolvedBrowserOptions["level"])}>
                <option value="safe">Safe</option><option value="normal">Normal</option><option value="experimental">Experimental</option>
              </select>
            </label>
            <ToggleField label="Wrap long lines" checked={settings.lineWrapping} onChange={(lineWrapping) => onChange({ ...settings, lineWrapping })} />
          </fieldset>

          <fieldset>
            <legend>Templates</legend>
            <ToggleField label="Format templates" checked={formatter.formatTemplates} onChange={(value) => updateFormatter("formatTemplates", value)} />
            <label><span>Inline spacing</span>
              <select value={formatter.inlineTemplateSpacing} onChange={(event) => updateFormatter("inlineTemplateSpacing", event.target.value as ResolvedBrowserOptions["inlineTemplateSpacing"])}>
                <option value="auto">Auto</option><option value="compact">Compact</option><option value="spaced">Spaced</option>
              </select>
            </label>
            <label><span>Parameter layout</span>
              <select value={formatter.templateParameterLayout} onChange={(event) => updateFormatter("templateParameterLayout", event.target.value as ResolvedBrowserOptions["templateParameterLayout"])}>
                <option value="compact">Compact</option><option value="flush">Flush</option><option value="indented">Indented</option>
              </select>
            </label>
            <ToggleField label="Format template parameters (experimental)" checked={formatter.formatTemplateParameters} onChange={(value) => updateFormatter("formatTemplateParameters", value)} />
          </fieldset>

          <fieldset>
            <legend>Tables</legend>
            <ToggleField label="Format tables" checked={formatter.formatTables} onChange={(value) => updateFormatter("formatTables", value)} />
            <label><span>Cell separator</span>
              <select value={formatter.tableCellSeparatorStyle} onChange={(event) => updateFormatter("tableCellSeparatorStyle", event.target.value as ResolvedBrowserOptions["tableCellSeparatorStyle"])}>
                <option value="auto">Auto</option><option value="split">Split</option><option value="preserve">Preserve</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Structure</legend>
            <ToggleField label="Headings" checked={formatter.formatHeadings} onChange={(value) => updateFormatter("formatHeadings", value)} />
            <ToggleField label="Lists" checked={formatter.formatLists} onChange={(value) => updateFormatter("formatLists", value)} />
            <ToggleField label="Section spacing" checked={formatter.formatSectionSpacing} onChange={(value) => updateFormatter("formatSectionSpacing", value)} />
            <ToggleField label="Normalize blank lines" checked={formatter.normalizeBlankLines} onChange={(value) => updateFormatter("normalizeBlankLines", value)} />
            <label><span>HTML void tags</span>
              <select value={formatter.htmlVoidTagStyle} onChange={(event) => updateFormatter("htmlVoidTagStyle", event.target.value as ResolvedBrowserOptions["htmlVoidTagStyle"])}>
                <option value="html5">HTML5</option><option value="xhtml">XHTML</option><option value="preserve">Preserve</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Links and metadata</legend>
            <div className="settings-columns">
              <ToggleField label="Categories" checked={formatter.formatCategories} onChange={(value) => updateFormatter("formatCategories", value)} />
              <ToggleField label="File links" checked={formatter.formatFileLinks} onChange={(value) => updateFormatter("formatFileLinks", value)} />
              <ToggleField label="Wikilinks" checked={formatter.formatWikilinks} onChange={(value) => updateFormatter("formatWikilinks", value)} />
              <ToggleField label="External links" checked={formatter.formatExternalLinks} onChange={(value) => updateFormatter("formatExternalLinks", value)} />
              <ToggleField label="References" checked={formatter.formatReferences} onChange={(value) => updateFormatter("formatReferences", value)} />
              <ToggleField label="Redirects" checked={formatter.formatRedirects} onChange={(value) => updateFormatter("formatRedirects", value)} />
              <ToggleField label="Behavior switches" checked={formatter.formatBehaviorSwitches} onChange={(value) => updateFormatter("formatBehaviorSwitches", value)} />
              <ToggleField label="Interlanguage links" checked={formatter.formatInterlanguageLinks} onChange={(value) => updateFormatter("formatInterlanguageLinks", value)} />
            </div>
            <label><span>Interlanguage placement</span>
              <select value={formatter.interlanguagePlacement} onChange={(event) => updateFormatter("interlanguagePlacement", event.target.value as ResolvedBrowserOptions["interlanguagePlacement"])}>
                <option value="preserve">Preserve</option><option value="footer">Footer</option>
              </select>
            </label>
            <label><span>Behavior-switch placement</span>
              <select value={formatter.behaviorSwitchPlacement} onChange={(event) => updateFormatter("behaviorSwitchPlacement", event.target.value as ResolvedBrowserOptions["behaviorSwitchPlacement"])}>
                <option value="preserve">Preserve</option><option value="footer">Footer</option>
              </select>
            </label>
            <label className="setting-wide"><span>Interlanguage prefixes</span>
              <textarea rows={3} value={formatter.interlanguagePrefixes.join(", ")} onChange={(event) => updateFormatter("interlanguagePrefixes", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />
            </label>
          </fieldset>

          <div className="parser-config-row">
            <span>Parser configuration</span>
            <output>MediaWiki bundled browser configuration</output>
          </div>
        </div>
        <div className="settings-panel-footer">
          <button type="button" className="secondary-button" onClick={onRestoreDefaults}>Restore core defaults</button>
          <button type="button" className="text-button" onClick={onReset}>Reset settings</button>
        </div>
      </div>
    </div>
  );
}
