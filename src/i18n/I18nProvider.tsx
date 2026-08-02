import { type ReactNode, useMemo } from "react";

import { I18nContext } from "./I18nContext.js";
import type { SupportedLocale } from "./locales.js";
import { htmlLang } from "./locales.js";
import enMessages from "./messages.en.json";
import zhHansMessages from "./messages.zh-Hans.json";
import zhHantMessages from "./messages.zh-Hant.json";
import type { MessageCatalog } from "./types.js";
import { createT, type I18n } from "./useI18n.js";

const catalogs: Record<SupportedLocale, MessageCatalog> = {
  en: enMessages,
  "zh-Hans": zhHansMessages,
  "zh-Hant": zhHantMessages,
};

interface I18nProviderProps {
  locale: SupportedLocale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const value = useMemo<I18n>(() => {
    const messages = catalogs[locale] ?? enMessages;
    return {
      locale,
      t: createT(messages),
      htmlLang: htmlLang(locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
