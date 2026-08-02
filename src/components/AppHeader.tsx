import { Braces, ExternalLink } from "lucide-react";

import { CORE_REPOSITORY_URL, FRONTEND_REPOSITORY_URL } from "../app/routes.js";
import type { LanguagePreference, SupportedLocale } from "../i18n/locales.js";
import { useI18n } from "../i18n/useI18n.js";
import type { ThemePreference } from "../settings/schema.js";

interface AppHeaderProps {
  theme: ThemePreference;
  language: LanguagePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onLanguageChange: (language: LanguagePreference) => void;
}

const LANGUAGE_OPTIONS: {
  value: LanguagePreference;
  key: SupportedLocale | "system";
}[] = [
  { value: "system", key: "system" },
  { value: "en", key: "en" },
  { value: "zh-Hans", key: "zh-Hans" },
  { value: "zh-Hant", key: "zh-Hant" },
];

export function AppHeader({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <Braces size={24} />
        </span>
        <div>
          <h1>{t("brand.name")}</h1>
          <p>{t("brand.tagline")}</p>
        </div>
      </div>
      <div className="header-actions">
        <label className="language-control">
          <span>{t("language.label")}</span>
          <select
            aria-label={t("language.label")}
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as LanguagePreference)
            }
          >
            {LANGUAGE_OPTIONS.map(({ value, key }) => (
              <option key={value} value={value}>
                {key === "system"
                  ? t("language.follow-browser")
                  : t(`language.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="theme-control">
          <span>{t("theme.label")}</span>
          <select
            aria-label={t("theme.label")}
            value={theme}
            onChange={(event) =>
              onThemeChange(event.target.value as ThemePreference)
            }
          >
            <option value="system">{t("theme.system")}</option>
            <option value="light">{t("theme.light")}</option>
            <option value="dark">{t("theme.dark")}</option>
          </select>
        </label>
        <a href={CORE_REPOSITORY_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> {t("header.core")}
        </a>
        <a href={FRONTEND_REPOSITORY_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> {t("header.frontend")}
        </a>
      </div>
    </header>
  );
}
