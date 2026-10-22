import { Globe, Lock, Monitor, Moon, Settings2, Sun } from "lucide-react";

import { FRONTEND_REPOSITORY_URL } from "../app/routes.js";
import type { LanguagePreference } from "../i18n/locales.js";
import { useI18n } from "../i18n/useI18n.js";
import type { ThemePreference } from "../settings/schema.js";

interface AppHeaderProps {
  theme: ThemePreference;
  language: LanguagePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onLanguageChange: (language: LanguagePreference) => void;
  onOpenSettings: () => void;
}

const THEME_OPTIONS = [
  { value: "system", Icon: Monitor, key: "theme.system" },
  { value: "light", Icon: Sun, key: "theme.light" },
  { value: "dark", Icon: Moon, key: "theme.dark" },
] as const;

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function AppHeader({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  onOpenSettings,
}: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="wordmark">
          <span className="wordmark-brace" aria-hidden="true">
            {"{{"}
          </span>
          {t("brand.name")}
          <span className="wordmark-brace" aria-hidden="true">
            {"}}"}
          </span>
        </h1>
        <p className="brand-tagline">{t("brand.tagline")}</p>
      </div>

      <span className="local-badge" title={t("header.local.detail")}>
        <Lock size={13} aria-hidden="true" />
        {t("header.local")}
      </span>

      <div className="header-tools">
        <fieldset className="theme-switch">
          <legend className="visually-hidden">{t("theme.label")}</legend>
          {THEME_OPTIONS.map(({ value, Icon, key }) => (
            <label key={value} className="theme-option" title={t(key)}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => onThemeChange(value)}
              />
              <Icon size={15} aria-hidden="true" />
              <span className="visually-hidden">{t(key)}</span>
            </label>
          ))}
        </fieldset>

        <label className="language-select" title={t("language.label")}>
          <Globe size={15} aria-hidden="true" />
          <select
            aria-label={t("language.label")}
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as LanguagePreference)
            }
          >
            <option value="system">{t("language.follow-browser")}</option>
            <option value="en">{t("language.en")}</option>
            <option value="zh-Hans">{t("language.zh-Hans")}</option>
            <option value="zh-Hant">{t("language.zh-Hant")}</option>
          </select>
        </label>

        <button
          type="button"
          className="button is-quiet"
          data-action="settings"
          onClick={onOpenSettings}
        >
          <Settings2 size={16} aria-hidden="true" />
          <span className="button-label">{t("header.settings")}</span>
        </button>

        <a
          className="icon-button"
          href={FRONTEND_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("header.repository")}
          title={t("header.repository")}
        >
          <GitHubMark />
        </a>
      </div>
    </header>
  );
}
